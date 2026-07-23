import { deriveOrderType } from "@fabbric/shared";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { customers, orderItems, orders } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const tag = { tags: ["clientes (admin)"], security: [{ bearerAuth: [] }] };
const idParam = z.object({ id: z.string().uuid() });
const listQuery = z.object({ search: z.string().trim().min(1).optional() });

// Métricas: un pending es un pedido pero todavía no es plata; un cancelled no es nada.
const countedInOrders = sql`${orders.status} <> 'cancelled'`;
const countedInSpent = sql`${orders.status} in ('paid', 'preparing', 'shipped', 'delivered')`;

export async function customersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/customers",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Listar clientes con métricas (pedidos no cancelados, total gastado en estados cobrados, última compra); búsqueda por nombre/email",
        querystring: listQuery,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { search } = request.query;

      const conditions = [eq(customers.orgId, orgId)];
      if (search) {
        const pattern = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
        conditions.push(or(ilike(customers.name, pattern), ilike(customers.email, pattern))!);
      }

      const lastOrderAt = sql<string | null>`max(${orders.createdAt}) filter (where ${countedInOrders})`;
      return db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          orderCount: sql<number>`(count(${orders.id}) filter (where ${countedInOrders}))::int`,
          totalSpent: sql<number>`coalesce(sum(${orders.total}) filter (where ${countedInSpent}), 0)::int`,
          lastOrderAt,
        })
        .from(customers)
        .leftJoin(orders, eq(orders.customerId, customers.id))
        .where(and(...conditions))
        .groupBy(customers.id)
        .orderBy(sql`${lastOrderAt} desc nulls last`, asc(customers.name));
    }
  );

  app.get(
    "/admin/customers/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Perfil del cliente + historial de pedidos (estado, tipo derivado, total)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      const [customer] = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          createdAt: customers.createdAt,
        })
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.orgId, orgId)));
      if (!customer) throw new AppError(404, "not_found", "Cliente no encontrado");

      const orderRows = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.customerId, id))
        .orderBy(desc(orders.createdAt));

      const orderIds = orderRows.map((o) => o.id);
      const items = orderIds.length
        ? await db
            .select({ orderId: orderItems.orderId, productId: orderItems.productId })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];

      return {
        ...customer,
        orders: orderRows.map((order) => ({
          ...order,
          type: deriveOrderType(items.filter((i) => i.orderId === order.id)),
        })),
      };
    }
  );
}
