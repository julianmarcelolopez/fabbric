import {
  createFinancialMovementSchema,
  createWalletSchema,
  movementTypeSchema,
  updateWalletSchema,
} from "@fabbric/shared";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { financialMovements, orders, wallets } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";
import {
  currentArYearMonth,
  monthRange,
  monthSummary,
  requireActiveWallet,
  todayAr,
} from "./service.js";

const tag = { tags: ["finanzas (admin)"], security: [{ bearerAuth: [] }] };
const idParam = z.object({ id: z.string().uuid() });

// year/month opcionales juntos: sin ellos, mes contable actual (AR)
const monthQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const movementsQuery = monthQuery.extend({
  walletId: z.string().uuid().optional(),
  type: movementTypeSchema.optional(),
});

function resolveMonth(query: { year?: number; month?: number }) {
  const now = currentArYearMonth();
  return monthRange(query.year ?? now.year, query.month ?? now.month);
}

export async function financeRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  // ── Carteras ────────────────────────────────────────────────────────────────

  app.get(
    "/admin/wallets",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Listar carteras con saldo calculado (initialBalance + ingresos − egresos)",
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      return db
        .select({
          id: wallets.id,
          name: wallets.name,
          icon: wallets.icon,
          color: wallets.color,
          initialBalance: wallets.initialBalance,
          active: wallets.active,
          balance: sql<number>`(${wallets.initialBalance} + coalesce(sum(
            case when ${financialMovements.type} = 'income' then ${financialMovements.amount}
                 else -${financialMovements.amount} end), 0))::int`,
          movementCount: sql<number>`count(${financialMovements.id})::int`,
        })
        .from(wallets)
        .leftJoin(financialMovements, eq(financialMovements.walletId, wallets.id))
        .where(eq(wallets.orgId, orgId))
        .groupBy(wallets.id)
        .orderBy(desc(wallets.active), wallets.name);
    }
  );

  app.post(
    "/admin/wallets",
    { ...auth, schema: { ...tag, summary: "Crear cartera", body: createWalletSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = request.body;
      const [existing] = await db
        .select({ id: wallets.id })
        .from(wallets)
        .where(and(eq(wallets.orgId, orgId), eq(wallets.name, input.name)));
      if (existing) {
        throw new AppError(409, "conflict", `Ya existe una cartera llamada "${input.name}"`);
      }
      const [wallet] = await db.insert(wallets).values({ ...input, orgId }).returning();
      reply.status(201);
      return wallet;
    }
  );

  app.patch(
    "/admin/wallets/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Editar cartera (nombre/ícono/color/activa — el saldo inicial no se edita)",
        params: idParam,
        body: updateWalletSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const input = request.body;

      const [wallet] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, id), eq(wallets.orgId, orgId)));
      if (!wallet) throw new AppError(404, "not_found", "Cartera no encontrada");

      if (input.name && input.name !== wallet.name) {
        const [dupe] = await db
          .select({ id: wallets.id })
          .from(wallets)
          .where(and(eq(wallets.orgId, orgId), eq(wallets.name, input.name)));
        if (dupe) throw new AppError(409, "conflict", `Ya existe una cartera llamada "${input.name}"`);
      }

      const [updated] = await db
        .update(wallets)
        .set(input)
        .where(eq(wallets.id, id))
        .returning();
      return updated;
    }
  );

  // ── Movimientos ─────────────────────────────────────────────────────────────

  app.get(
    "/admin/finance/movements",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Movimientos del mes (default: mes actual AR), filtrables por cartera y tipo",
        querystring: movementsQuery,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { walletId, type } = request.query;
      const { from, to } = resolveMonth(request.query);

      const conditions = [
        eq(financialMovements.orgId, orgId),
        gte(financialMovements.date, from),
        lt(financialMovements.date, to),
      ];
      if (walletId) conditions.push(eq(financialMovements.walletId, walletId));
      if (type) conditions.push(eq(financialMovements.type, type));

      return db
        .select({
          id: financialMovements.id,
          walletId: financialMovements.walletId,
          walletName: wallets.name,
          walletColor: wallets.color,
          type: financialMovements.type,
          amount: financialMovements.amount,
          category: financialMovements.category,
          description: financialMovements.description,
          date: financialMovements.date,
          orderId: financialMovements.orderId,
          orderNumber: orders.orderNumber,
          createdAt: financialMovements.createdAt,
        })
        .from(financialMovements)
        .innerJoin(wallets, eq(financialMovements.walletId, wallets.id))
        .leftJoin(orders, eq(financialMovements.orderId, orders.id))
        .where(and(...conditions))
        .orderBy(desc(financialMovements.date), desc(financialMovements.createdAt));
    }
  );

  app.post(
    "/admin/finance/movements",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Registrar movimiento manual (ingreso/egreso; fecha contable default hoy AR)",
        body: createFinancialMovementSchema,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { walletId, type, amount, category, description, date } = request.body;
      await requireActiveWallet(orgId, walletId);

      const [movement] = await db
        .insert(financialMovements)
        .values({
          orgId,
          walletId,
          type,
          amount,
          category: category ?? null,
          description: description ?? null,
          date: date ?? todayAr(),
        })
        .returning();
      reply.status(201);
      return movement;
    }
  );

  app.delete(
    "/admin/finance/movements/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Borrar movimiento manual — los vinculados a un pedido son imborrables (409)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      const [movement] = await db
        .select({ id: financialMovements.id, orderId: financialMovements.orderId })
        .from(financialMovements)
        .where(and(eq(financialMovements.id, id), eq(financialMovements.orgId, orgId)));
      if (!movement) throw new AppError(404, "not_found", "Movimiento no encontrado");
      if (movement.orderId) {
        throw new AppError(
          409,
          "linked_to_order",
          "No se puede eliminar un movimiento vinculado a un pedido"
        );
      }
      await db.delete(financialMovements).where(eq(financialMovements.id, id));
      return { ok: true };
    }
  );

  // ── Resumen mensual ─────────────────────────────────────────────────────────

  app.get(
    "/admin/finance/summary",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Resumen del mes: ingresos, egresos, balance y ganancia bruta/neta (bruta = Σ (precio − costo) × qty de pedidos cobrados en el mes)",
        querystring: monthQuery,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { from, to } = resolveMonth(request.query);
      // Única fuente de estos números (la comparte el overview del dashboard)
      const summary = await monthSummary(orgId, from, to);
      return { from, to, ...summary };
    }
  );
}
