import { dashboardLayoutSchema } from "@fabbric/shared";
import { and, desc, eq, gte, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  adminUsers,
  customers,
  financialMovements,
  orderItems,
  orders,
} from "../../db/schema.js";
import { requireOrgId } from "../../lib/tenant.js";
import { currentArYearMonth, monthRange, monthSummary } from "../finance/service.js";

const tag = { tags: ["métricas (admin)"], security: [{ bearerAuth: [] }] };

const monthQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

// Argentina no tiene horario de verano: UTC−3 fijo. Límites del mes contable
// como timestamps, para filtrar columnas createdAt (timestamptz).
const arTimestamp = (dateStr: string) => new Date(`${dateStr}T00:00:00-03:00`);

/** Los 6 meses que terminan en el elegido (ascendente), para el gráfico */
function lastSixMonths(year: number, month: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < 6; i++) {
    result.unshift({ year: y, month: m });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return result;
}

export async function metricsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  // El layout es POR USUARIO (no por org): dos vendedores, dos dashboards.
  app.patch(
    "/admin/dashboard-layout",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Guardar el layout del dashboard del admin autenticado (orden + ocultas por zona)",
        body: dashboardLayoutSchema,
      },
    },
    async (request) => {
      const adminId = request.adminUser!.id;
      const [updated] = await db
        .update(adminUsers)
        .set({ dashboardLayout: request.body })
        .where(eq(adminUsers.id, adminId))
        .returning({ dashboardLayout: adminUsers.dashboardLayout });
      return updated;
    }
  );

  app.get(
    "/admin/metrics/overview",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Todos los números del dashboard en una llamada (mes contable elegido; default: mes actual AR). Semántica T9: cobrado = cuenta.",
        querystring: monthQuery,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const now = currentArYearMonth();
      const year = request.query.year ?? now.year;
      const month = request.query.month ?? now.month;
      const { from, to } = monthRange(year, month);
      const fromTs = arTimestamp(from);
      const toTs = arTimestamp(to);

      // ── Stats del mes ────────────────────────────────────────────────────
      const summary = await monthSummary(orgId, from, to);

      const [[ordersCount], [newCustomers], [receivable], [charges]] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(orders)
          .where(
            and(
              eq(orders.orgId, orgId),
              gte(orders.createdAt, fromTs),
              lt(orders.createdAt, toTs),
              ne(orders.status, "cancelled")
            )
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(customers)
          .where(
            and(
              eq(customers.orgId, orgId),
              gte(customers.createdAt, fromTs),
              lt(customers.createdAt, toTs)
            )
          ),
        // Deuda viva: GLOBAL, no del mes
        db
          .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)::int` })
          .from(orders)
          .where(and(eq(orders.orgId, orgId), eq(orders.status, "pending"))),
        // Cobros del mes (movimientos income vinculados a pedido) → ticket promedio
        db
          .select({
            cobrado: sql<number>`coalesce(sum(${financialMovements.amount}), 0)::int`,
            pedidos: sql<number>`count(distinct ${financialMovements.orderId})::int`,
          })
          .from(financialMovements)
          .where(
            and(
              eq(financialMovements.orgId, orgId),
              eq(financialMovements.type, "income"),
              isNotNull(financialMovements.orderId),
              gte(financialMovements.date, from),
              lt(financialMovements.date, to)
            )
          ),
      ]);

      // ── Paneles ──────────────────────────────────────────────────────────
      const chargedIds = (
        await db
          .selectDistinct({ orderId: financialMovements.orderId })
          .from(financialMovements)
          .where(
            and(
              eq(financialMovements.orgId, orgId),
              eq(financialMovements.type, "income"),
              isNotNull(financialMovements.orderId),
              gte(financialMovements.date, from),
              lt(financialMovements.date, to)
            )
          )
      ).map((r) => r.orderId!);

      const itemsOfCharged = chargedIds.length
        ? and(eq(orderItems.orgId, orgId), inArray(orderItems.orderId, chargedIds))
        : undefined;

      const [ultimosPedidos, masVendidos, tipoRows, canalRows, chartRows] = await Promise.all([
        db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            total: orders.total,
            createdAt: orders.createdAt,
            customerName: customers.name,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customerId, customers.id))
          .where(eq(orders.orgId, orgId))
          .orderBy(desc(orders.createdAt))
          .limit(5),
        // Top del mes por unidades (agrupado por snapshot de nombre: cubre bespoke
        // y productos borrados por igual)
        itemsOfCharged
          ? db
              .select({
                name: orderItems.name,
                qty: sql<number>`sum(${orderItems.qty})::int`,
                importe: sql<number>`sum(${orderItems.total})::int`,
              })
              .from(orderItems)
              .where(itemsOfCharged)
              .groupBy(orderItems.name)
              .orderBy(sql`sum(${orderItems.qty}) desc`)
              .limit(5)
          : Promise.resolve([]),
        itemsOfCharged
          ? db
              .select({
                catalogo: sql<boolean>`${orderItems.productId} is not null`,
                qty: sql<number>`sum(${orderItems.qty})::int`,
                importe: sql<number>`sum(${orderItems.total})::int`,
              })
              .from(orderItems)
              .where(itemsOfCharged)
              .groupBy(sql`${orderItems.productId} is not null`)
          : Promise.resolve([]),
        itemsOfCharged
          ? db
              .select({
                channel: orderItems.channel,
                qty: sql<number>`sum(${orderItems.qty})::int`,
                importe: sql<number>`sum(${orderItems.total})::int`,
              })
              .from(orderItems)
              .where(itemsOfCharged)
              .groupBy(orderItems.channel)
          : Promise.resolve([]),
        // Gráfico: 6 meses terminando en el elegido
        db
          .select({
            ym: sql<string>`to_char(${financialMovements.date}, 'YYYY-MM')`,
            ingresos: sql<number>`coalesce(sum(${financialMovements.amount})
              filter (where ${financialMovements.type} = 'income'), 0)::int`,
            egresos: sql<number>`coalesce(sum(${financialMovements.amount})
              filter (where ${financialMovements.type} = 'expense'), 0)::int`,
          })
          .from(financialMovements)
          .where(
            and(
              eq(financialMovements.orgId, orgId),
              gte(financialMovements.date, monthRange(lastSixMonths(year, month)[0].year, lastSixMonths(year, month)[0].month).from),
              lt(financialMovements.date, to)
            )
          )
          .groupBy(sql`to_char(${financialMovements.date}, 'YYYY-MM')`),
      ]);

      const zero = { qty: 0, importe: 0 };
      const pick = <T extends { qty: number; importe: number }>(row: T | undefined) =>
        row ? { qty: row.qty, importe: row.importe } : zero;

      const ingresosEgresosMensual = lastSixMonths(year, month).map(({ year: y, month: m }) => {
        const ym = `${y}-${String(m).padStart(2, "0")}`;
        const row = chartRows.find((r) => r.ym === ym);
        return { year: y, month: m, ingresos: row?.ingresos ?? 0, egresos: row?.egresos ?? 0 };
      });

      return {
        from,
        to,
        stats: {
          pedidosMes: ordersCount.count,
          ...summary,
          clientesNuevos: newCustomers.count,
          porCobrar: receivable.total,
          ticketPromedio: charges.pedidos > 0 ? Math.round(charges.cobrado / charges.pedidos) : 0,
        },
        paneles: {
          ultimosPedidos,
          masVendidos,
          catalogoVsPersonalizado: {
            catalogo: pick(tipoRows.find((r) => r.catalogo)),
            personalizado: pick(tipoRows.find((r) => !r.catalogo)),
          },
          ventasPorCanal: {
            online: pick(canalRows.find((r) => r.channel === "online")),
            local: pick(canalRows.find((r) => r.channel === "local")),
            sinCanal: pick(canalRows.find((r) => r.channel === null)),
          },
          ingresosEgresosMensual,
        },
      };
    }
  );
}
