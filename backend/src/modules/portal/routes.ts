import { updateCustomerProfileSchema } from "@fabbric/shared";
import { and, count, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { customers, orderItems, orders } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";

const slugParam = z.object({ slug: z.string().min(1) });
const slugIdParam = z.object({ slug: z.string().min(1), id: z.string().uuid() });
const tag = { tags: ["portal"], security: [{ bearerAuth: [] }] };

function publicProfile(c: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
}) {
  return { id: c.id, email: c.email, name: c.name, phone: c.phone, address: c.address };
}

export async function portalRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireCustomerAuth };

  app.get(
    "/portal/:slug/me",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Perfil del comprador en esta tienda (se crea en el primer uso)",
        params: slugParam,
      },
    },
    async (request) => publicProfile(request.customer!)
  );

  app.patch(
    "/portal/:slug/me",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Completar/editar perfil de contacto (nombre, teléfono, dirección)",
        params: slugParam,
        body: updateCustomerProfileSchema,
      },
    },
    async (request) => {
      const input = request.body;
      if (Object.keys(input).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      const [row] = await db
        .update(customers)
        .set(input)
        .where(eq(customers.id, request.customer!.id))
        .returning();
      return publicProfile(row);
    }
  );

  app.get(
    "/portal/:slug/orders",
    {
      ...auth,
      schema: { ...tag, summary: "Mis pedidos en esta tienda (descendente)", params: slugParam },
    },
    async (request) => {
      const customer = request.customer!;
      const rows = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
          itemCount: count(orderItems.id),
        })
        .from(orders)
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.customerId, customer.id), eq(orders.orgId, customer.orgId)))
        .groupBy(orders.id)
        .orderBy(desc(orders.createdAt));
      return rows;
    }
  );

  app.get(
    "/portal/:slug/orders/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Detalle de MI pedido (items con snapshot, envío, estado, tracking)",
        params: slugIdParam,
      },
    },
    async (request) => {
      const customer = request.customer!;
      const { id } = request.params;
      // Solo el dueño del pedido: otro customer → 404 (no filtrar existencia)
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, id),
            eq(orders.customerId, customer.id),
            eq(orders.orgId, customer.orgId)
          )
        );
      if (!order) throw new AppError(404, "not_found", "Pedido no encontrado");

      const items = await db
        .select({
          id: orderItems.id,
          name: orderItems.name,
          talle: orderItems.talle,
          color: orderItems.color,
          qty: orderItems.qty,
          unitPrice: orderItems.unitPrice,
          total: orderItems.total,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        shippingZoneName: order.shippingZoneName,
        shippingCost: order.shippingCost,
        subtotal: order.subtotal,
        total: order.total,
        trackingNumber: order.trackingNumber,
        note: order.note,
        createdAt: order.createdAt,
        items,
      };
    }
  );
}
