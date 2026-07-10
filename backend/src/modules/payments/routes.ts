import { checkoutSchema } from "@fabbric/shared";
import { and, eq, inArray, max, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  orderItems,
  orders,
  products,
  productVariants,
  shippingZones,
} from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { createPreference } from "./service.js";

const slugParam = z.object({ slug: z.string().min(1) });
const tag = { tags: ["checkout"], security: [{ bearerAuth: [] }] };

export async function paymentsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/public/:slug/checkout",
    {
      preHandler: fastify.requireCustomerAuth,
      schema: {
        ...tag,
        summary:
          "Convertir el carrito en orden pending + preferencia de MP. Precios y stock SIEMPRE releídos de la DB.",
        params: slugParam,
        body: checkoutSchema,
      },
    },
    async (request, reply) => {
      const customer = request.customer!;
      const orgId = customer.orgId;
      const { shippingZoneId, note } = request.body;

      // Merge de ítems duplicados (misma variante dos veces en el body)
      const qtyByVariant = new Map<string, number>();
      for (const item of request.body.items) {
        qtyByVariant.set(item.variantId, (qtyByVariant.get(item.variantId) ?? 0) + item.qty);
      }
      const variantIds = [...qtyByVariant.keys()];

      // Releer variantes + productos de la DB (jamás confiar en el cliente)
      const rows = await db
        .select({
          variantId: productVariants.id,
          talle: productVariants.talle,
          color: productVariants.color,
          stockOnline: productVariants.stockOnline,
          priceOverride: productVariants.priceOverride,
          productId: products.id,
          productName: products.name,
          price: products.price,
          costPrice: products.costPrice,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            inArray(productVariants.id, variantIds),
            eq(productVariants.orgId, orgId),
            eq(products.visibleInCatalog, true),
            ne(products.status, "paused")
          )
        );

      if (rows.length !== variantIds.length) {
        throw new AppError(400, "invalid_items", "Algún producto del carrito ya no está disponible");
      }

      // Stock suficiente (informativo — el descuento real lo hace el webhook al pagar)
      const missing = rows
        .map((r) => ({ ...r, qty: qtyByVariant.get(r.variantId)! }))
        .filter((r) => r.stockOnline < r.qty);
      if (missing.length > 0) {
        throw new AppError(
          400,
          "insufficient_stock",
          `Sin stock suficiente: ${missing
            .map((m) => `${m.productName} ${m.talle}/${m.color} (hay ${m.stockOnline}, pediste ${m.qty})`)
            .join("; ")}`
        );
      }

      // Zona de envío de la org, activa
      const [zone] = await db
        .select()
        .from(shippingZones)
        .where(
          and(
            eq(shippingZones.id, shippingZoneId),
            eq(shippingZones.orgId, orgId),
            eq(shippingZones.active, true)
          )
        );
      if (!zone) throw new AppError(400, "invalid_zone", "Zona de envío inválida");

      const lineItems = rows.map((r) => {
        const qty = qtyByVariant.get(r.variantId)!;
        const unitPrice = r.priceOverride ?? r.price;
        return {
          productId: r.productId,
          variantId: r.variantId,
          name: r.productName,
          talle: r.talle,
          color: r.color,
          qty,
          // Checkout de la tienda = siempre stock online
          channel: "online" as const,
          unitPrice,
          unitCostSnapshot: r.costPrice,
          total: unitPrice * qty,
        };
      });
      const subtotal = lineItems.reduce((acc, i) => acc + i.total, 0);
      const shippingCost =
        zone.freeShippingFrom !== null && subtotal >= zone.freeShippingFrom ? 0 : zone.cost;
      const total = subtotal + shippingCost;

      // Orden pending + items con snapshot, en transacción.
      // orderNumber secuencial por org: max+1 dentro de la tx; la unique ataja
      // carreras → un retry.
      async function createOrder() {
        return db.transaction(async (tx) => {
          const [{ maxNumber }] = await tx
            .select({ maxNumber: max(orders.orderNumber) })
            .from(orders)
            .where(eq(orders.orgId, orgId));
          const [order] = await tx
            .insert(orders)
            .values({
              orgId,
              customerId: customer.id,
              orderNumber: (maxNumber ?? 0) + 1,
              shippingZoneId: zone.id,
              shippingZoneName: zone.name,
              shippingCost,
              subtotal,
              total,
              note: note ?? null,
            })
            .returning();
          await tx
            .insert(orderItems)
            .values(lineItems.map((item) => ({ ...item, orderId: order.id, orgId })));
          return order;
        });
      }
      let order;
      try {
        order = await createOrder();
      } catch (err) {
        // Carrera de orderNumber (23505) → un solo retry
        if ((err as { code?: string }).code === "23505") order = await createOrder();
        else throw err;
      }

      // Preferencia de MP (fuera de la tx — llamada externa). Si falla, la orden
      // pending queda sin preferencia (inofensiva) y respondemos 502.
      const { preferenceId, initPoint } = await createPreference({
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeName: request.params.slug,
        slug: request.params.slug,
        items: lineItems.map((i) => ({
          title: `${i.name} (${i.talle}/${i.color})`,
          quantity: i.qty,
          unit_price: i.unitPrice / 100,
          currency_id: "ARS",
        })),
        shippingCost,
      });

      const [updated] = await db
        .update(orders)
        .set({ mpPreferenceId: preferenceId })
        .where(eq(orders.id, order.id))
        .returning();

      reply.status(201);
      return {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        total: updated.total,
        initPoint,
      };
    }
  );
}
