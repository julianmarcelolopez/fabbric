import { randomUUID } from "node:crypto";
import {
  canTransition,
  createManualOrderSchema,
  deriveOrderType,
  ORDER_TRANSITIONS,
  orderTypeSchema,
  orderStatusSchema,
  updateOrderStatusSchema,
  type ManualBespokeItem,
  type ManualCatalogItem,
} from "@fabbric/shared";
import { and, desc, eq, gte, inArray, lte, max, sql as rawSql } from "drizzle-orm";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  customers,
  orderItems,
  orders,
  products,
  productVariants,
  shippingZones,
  stockMovements,
} from "../../db/schema.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { orderStatusEmail, sendEmail } from "../../lib/email.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureConfig } from "../catalogConfig/service.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["pedidos (admin)"], security: [{ bearerAuth: [] }] };

const listQuery = z.object({
  status: orderStatusSchema.optional(),
  type: orderTypeSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Email de cambio de estado — efecto secundario: jamás rompe la operación */
async function notifyCustomer(
  orgId: string,
  order: { orderNumber: number; status: string; total: number; trackingNumber: string | null; customerId: string | null },
  log: FastifyBaseLogger
) {
  if (!order.customerId) return;
  const [customer] = await db
    .select({ email: customers.email })
    .from(customers)
    .where(eq(customers.id, order.customerId));
  if (!customer?.email) return;
  const config = await ensureConfig(orgId);
  const { subject, html } = orderStatusEmail({
    storeName: config.storeName,
    orderNumber: order.orderNumber,
    status: order.status,
    totalCents: order.total,
    trackingNumber: order.trackingNumber,
  });
  await sendEmail({ to: customer.email, subject, html }, log);
}

export async function ordersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/orders",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Listar pedidos con filtros (estado, tipo derivado, rango de fechas)",
        querystring: listQuery,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { status, type, from, to } = request.query;

      const conditions = [eq(orders.orgId, orgId)];
      if (status) conditions.push(eq(orders.status, status));
      if (from) conditions.push(gte(orders.createdAt, from));
      if (to) conditions.push(lte(orders.createdAt, to));

      const rows = await db
        .select({
          order: orders,
          customerName: customers.name,
          customerEmail: customers.email,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt));

      const orderIds = rows.map((r) => r.order.id);
      const items = orderIds.length
        ? await db
            .select({ orderId: orderItems.orderId, productId: orderItems.productId })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];

      const result = rows.map(({ order, customerName, customerEmail }) => {
        const orderItemsOf = items.filter((i) => i.orderId === order.id);
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          customerName,
          customerEmail,
          itemCount: orderItemsOf.length,
          type: deriveOrderType(orderItemsOf),
        };
      });
      return type ? result.filter((r) => r.type === type) : result;
    }
  );

  app.get(
    "/admin/orders/:id",
    { ...auth, schema: { ...tag, summary: "Detalle completo del pedido (incluye costos)", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [row] = await db
        .select({ order: orders, customerName: customers.name, customerEmail: customers.email, customerPhone: customers.phone, customerAddress: customers.address })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(eq(orders.id, id), eq(orders.orgId, orgId)));
      if (!row) throw new AppError(404, "not_found", "Pedido no encontrado");

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      return {
        ...row.order,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone,
        customerAddress: row.customerAddress,
        items,
        type: deriveOrderType(items),
        allowedTransitions: ORDER_TRANSITIONS[row.order.status],
      };
    }
  );

  app.patch(
    "/admin/orders/:id/status",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Cambiar estado (transiciones válidas; shipped acepta tracking) → email al comprador",
        params: idParam,
        body: updateOrderStatusSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const { status: nextStatus, trackingNumber } = request.body;

      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.orgId, orgId)));
      if (!order) throw new AppError(404, "not_found", "Pedido no encontrado");

      if (!canTransition(order.status, nextStatus)) {
        const valid = ORDER_TRANSITIONS[order.status];
        throw new AppError(
          409,
          "invalid_transition",
          `De "${order.status}" solo se puede pasar a: ${valid.length ? valid.join(", ") : "(ninguno — estado terminal)"}`
        );
      }

      const [updated] = await db
        .update(orders)
        .set({
          status: nextStatus,
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        })
        .where(eq(orders.id, id))
        .returning();

      await notifyCustomer(orgId, updated, request.log);
      return { ...updated, allowedTransitions: ORDER_TRANSITIONS[updated.status] };
    }
  );

  app.post(
    "/admin/orders",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Alta manual (venta telefónica/presencial): ítems de catálogo (con canal) y/o bespoke. Nace pending; el stock se descuenta al cobrar (mark-paid).",
        body: createManualOrderSchema,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { customerId, shippingZoneId, note, items } = request.body;

      const isCatalog = (i: ManualCatalogItem | ManualBespokeItem): i is ManualCatalogItem =>
        "variantId" in i;
      const catalogInputs = items.filter(isCatalog);
      const bespokeInputs = items.filter((i): i is ManualBespokeItem => !isCatalog(i));

      // Cliente (si viene) debe ser de la org
      if (customerId) {
        const [customer] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));
        if (!customer) throw new AppError(400, "invalid_customer", "El cliente no existe en esta organización");
      }

      // Ítems de catálogo: releer de la DB (la venta manual acepta productos
      // pausados/ocultos — es una decisión del vendedor, no de la vidriera)
      let catalogLines: Array<{
        productId: string;
        variantId: string;
        name: string;
        talle: string;
        color: string;
        qty: number;
        channel: "online" | "local";
        unitPrice: number;
        unitCostSnapshot: number | null;
        total: number;
      }> = [];
      if (catalogInputs.length > 0) {
        const variantIds = catalogInputs.map((i) => i.variantId);
        const rows = await db
          .select({
            variantId: productVariants.id,
            talle: productVariants.talle,
            color: productVariants.color,
            stockOnline: productVariants.stockOnline,
            stockLocal: productVariants.stockLocal,
            priceOverride: productVariants.priceOverride,
            productId: products.id,
            productName: products.name,
            price: products.price,
            costPrice: products.costPrice,
          })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(and(inArray(productVariants.id, variantIds), eq(productVariants.orgId, orgId)));
        if (rows.length !== new Set(variantIds).size) {
          throw new AppError(400, "invalid_items", "Alguna variante no existe en esta organización");
        }
        catalogLines = catalogInputs.map((input) => {
          const row = rows.find((r) => r.variantId === input.variantId)!;
          const available = input.channel === "online" ? row.stockOnline : row.stockLocal;
          if (available < input.qty) {
            throw new AppError(
              400,
              "insufficient_stock",
              `Sin stock ${input.channel} para ${row.productName} ${row.talle}/${row.color} (hay ${available}, pediste ${input.qty})`
            );
          }
          const unitPrice = row.priceOverride ?? row.price;
          return {
            productId: row.productId,
            variantId: row.variantId,
            name: row.productName,
            talle: row.talle,
            color: row.color,
            qty: input.qty,
            channel: input.channel,
            unitPrice,
            unitCostSnapshot: row.costPrice,
            total: unitPrice * input.qty,
          };
        });
      }

      const bespokeLines = bespokeInputs.map((input) => ({
        productId: null,
        variantId: null,
        name: input.name,
        talle: null,
        color: null,
        qty: input.qty,
        channel: null,
        unitPrice: input.unitPrice,
        unitCostSnapshot: input.unitCost ?? null,
        total: input.unitPrice * input.qty,
        referenceImageUrl: input.referenceImageUrl ?? null,
      }));

      const subtotal = [...catalogLines, ...bespokeLines].reduce((acc, l) => acc + l.total, 0);

      // Zona opcional (retiro en local = sin zona, envío 0)
      let zoneSnapshot: { id: string | null; name: string | null; cost: number } = {
        id: null,
        name: null,
        cost: 0,
      };
      if (shippingZoneId) {
        const [zone] = await db
          .select()
          .from(shippingZones)
          .where(and(eq(shippingZones.id, shippingZoneId), eq(shippingZones.orgId, orgId)));
        if (!zone) throw new AppError(400, "invalid_zone", "Zona de envío inválida");
        const cost =
          zone.freeShippingFrom !== null && subtotal >= zone.freeShippingFrom ? 0 : zone.cost;
        zoneSnapshot = { id: zone.id, name: zone.name, cost };
      }

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
              customerId: customerId ?? null,
              orderNumber: (maxNumber ?? 0) + 1,
              shippingZoneId: zoneSnapshot.id,
              shippingZoneName: zoneSnapshot.name,
              shippingCost: zoneSnapshot.cost,
              subtotal,
              total: subtotal + zoneSnapshot.cost,
              note: note ?? null,
            })
            .returning();
          await tx
            .insert(orderItems)
            .values(
              [...catalogLines, ...bespokeLines].map((line) => ({
                ...line,
                orderId: order.id,
                orgId,
              }))
            );
          return order;
        });
      }
      let order;
      try {
        order = await createOrder();
      } catch (err) {
        if ((err as { code?: string }).code === "23505") order = await createOrder();
        else throw err;
      }

      reply.status(201);
      return {
        ...order,
        type: deriveOrderType([...catalogLines, ...bespokeLines]),
        allowedTransitions: ORDER_TRANSITIONS[order.status],
      };
    }
  );

  app.post(
    "/admin/orders/reference-image",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir imagen de referencia para ítems bespoke (multipart, JPEG/PNG/WebP, máx 10 MB)",
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const allowed: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = allowed[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG o WebP");
      const buffer = await file.toBuffer();

      const storagePath = `${orgId}/orders/ref-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from("product-images")
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from("product-images").getPublicUrl(storagePath);
      reply.status(201);
      return { url: pub.publicUrl };
    }
  );

  app.post(
    "/admin/orders/:id/mark-paid",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Cobro manual (venta fuera de MP): pending → paid + descuento de stock por canal (movimientos `venta`)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      // NOTA T9: acá se va a crear además el financial_movement vinculado
      // (regla bordart "cobrado antes de completado") — decisión escalonada.
      const result = await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(and(eq(orders.id, id), eq(orders.orgId, orgId)));
        if (!order) return { kind: "not_found" as const };
        if (order.status !== "pending") return { kind: "not_pending" as const, status: order.status };

        const [updated] = await tx
          .update(orders)
          .set({ status: "paid" })
          .where(eq(orders.id, id))
          .returning();

        // Descuento de stock por ítem de catálogo, en SU canal (venta manual)
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
        for (const item of items) {
          if (!item.variantId || !item.channel) continue;
          const column =
            item.channel === "online" ? productVariants.stockOnline : productVariants.stockLocal;
          const [variant] = await tx
            .select({ stock: column })
            .from(productVariants)
            .where(eq(productVariants.id, item.variantId));
          if (!variant) continue;
          const applied = Math.min(item.qty, variant.stock);
          if (applied < item.qty) {
            request.log.warn(
              `Orden #${order.orderNumber}: stock ${item.channel} insuficiente al cobrar ` +
                `(variante ${item.variantId}: pedía ${item.qty}, había ${variant.stock}) — reconciliar`
            );
          }
          if (applied > 0) {
            await tx
              .update(productVariants)
              .set(
                item.channel === "online"
                  ? { stockOnline: rawSql`${productVariants.stockOnline} - ${applied}` }
                  : { stockLocal: rawSql`${productVariants.stockLocal} - ${applied}` }
              )
              .where(eq(productVariants.id, item.variantId));
            await tx.insert(stockMovements).values({
              orgId,
              variantId: item.variantId,
              channel: item.channel,
              type: "venta",
              delta: -applied,
              note: `venta manual #${order.orderNumber}`,
            });
          }
        }
        return { kind: "ok" as const, order: updated };
      });

      if (result.kind === "not_found") throw new AppError(404, "not_found", "Pedido no encontrado");
      if (result.kind === "not_pending") {
        throw new AppError(409, "invalid_transition", `El pedido ya está en estado "${result.status}"`);
      }
      await notifyCustomer(orgId, result.order, request.log);
      return { ...result.order, allowedTransitions: ORDER_TRANSITIONS[result.order.status] };
    }
  );
}
