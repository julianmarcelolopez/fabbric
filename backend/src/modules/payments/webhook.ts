import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql as rawSql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/client.js";
import { orderItems, orders, productVariants, stockMovements } from "../../db/schema.js";
import { decrypt } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { resolveStoreBySlug } from "../catalogConfig/service.js";
import { ensureMpWallet, recordOrderCharge } from "../finance/service.js";
import { getPayment } from "./service.js";

// Webhook de Mercado Pago — paranoia por diseño (regla del plan):
// 1) firma verificada, 2) el pago se consulta a la API real (payload no confiable),
// 3) idempotente (replays no descuentan dos veces), 4) nunca 200 si no se procesó.
// Es el ÚNICO lugar del sistema donde una orden pasa a `paid` y el stock online
// baja automáticamente (movimientos tipo `sync`, reservados desde T4).
//
// T16: además de la ruta global (token/secret de plataforma), existe una ruta
// por org (token/secret propios) para las orgs que conectaron su Mercado Pago.
// Es un camino APARTE — la ruta global no cambió ni un carácter de su lógica.

const webhookQuery = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  "data.id": z.string().optional(),
  id: z.string().optional(),
});

const slugParam = z.object({ slug: z.string().min(1) });

/**
 * Valida x-signature de MP: HMAC-SHA256 del manifest `id:<dataId>;request-id:<rid>;ts:<ts>;`
 * REGLA REAL DE MP (aprendida con un webhook de producción, no con la doc): si un
 * componente falta (ej. sin header x-request-id), esa parte se OMITE del manifest
 * — no se incluye vacía.
 */
function verifySignature(request: FastifyRequest, dataId: string, secret: string | undefined): boolean {
  if (!secret) {
    // Sin secret configurado (dev sin túnel): se acepta con warning.
    // En producción el secret es obligatorio — anotado en la hoja de ruta.
    request.log.warn("Webhook MP sin secret configurado — firma NO verificada (solo dev)");
    return true;
  }
  const signature = request.headers["x-signature"];
  if (typeof signature !== "string") return false;
  const sigParts = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=", 2) as [string, string])
  );
  const ts = sigParts.ts;
  const v1 = sigParts.v1;
  if (!ts || !v1) return false;

  const requestId = request.headers["x-request-id"] as string | undefined;
  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()};`);
  if (requestId) manifestParts.push(`request-id:${requestId};`);
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join("");

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

async function fetchPayment(paymentId: string, accessToken: string | undefined) {
  // Escape hatch SOLO para tests/dev: "TESTPAY:<status>:<orderId>"
  if (env.MP_FAKE_PAYMENTS === "true" && paymentId.startsWith("TESTPAY:")) {
    const [, status, orderId] = paymentId.split(":");
    return { id: paymentId, status, externalReference: orderId };
  }
  return getPayment(paymentId, accessToken);
}

/**
 * Lógica compartida entre la ruta global y la ruta por org — idéntica para las
 * dos, solo cambia de dónde salen `secret`/`accessToken`. Factorizada acá para
 * que no puedan divergir por descuido entre las dos rutas.
 */
async function processPaymentNotification(
  request: FastifyRequest,
  dataId: string,
  secret: string | undefined,
  accessToken: string | undefined
) {
  if (!verifySignature(request, dataId, secret)) {
    throw new AppError(401, "invalid_signature", "Firma de webhook inválida");
  }

  // Consultar el pago REAL — jamás confiar en el payload del POST
  const payment = await fetchPayment(dataId, accessToken);

  if (payment.status !== "approved") {
    // rejected/cancelled/in_process: la orden queda pending (el comprador
    // puede reintentar desde MP) — v1 sin cancelación automática
    request.log.info(`Webhook MP: pago ${payment.id} en estado ${payment.status} — sin acción`);
    return { ok: true, status: payment.status };
  }

  if (!payment.externalReference) {
    throw new AppError(500, "webhook_error", "Pago aprobado sin external_reference");
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payment.externalReference!));
    if (!order) return "order_not_found" as const;
    // IDEMPOTENCIA: replays de MP no vuelven a procesar
    if (order.status !== "pending") return "already_processed" as const;

    await tx
      .update(orders)
      .set({ status: "paid", mpPaymentId: payment.id })
      .where(eq(orders.id, order.id));

    // T9: el cobro online también deja rastro financiero — cartera
    // "Mercado Pago" lazy + ingreso vinculado (idempotente por pedido)
    const mpWallet = await ensureMpWallet(tx, order.orgId);
    await recordOrderCharge(tx, {
      orgId: order.orgId,
      walletId: mpWallet.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      viaMp: true,
    });

    // Descuento de stock online con movimientos sync (uno por ítem con variante viva)
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      if (!item.variantId) continue;
      const [variant] = await tx
        .select({ stockOnline: productVariants.stockOnline })
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId));
      if (!variant) continue;
      // La venta ya ocurrió: si el stock no alcanza, clampear a 0 y avisar
      const applied = Math.min(item.qty, variant.stockOnline);
      if (applied < item.qty) {
        request.log.warn(
          `Orden #${order.orderNumber}: stock online insuficiente al confirmar pago ` +
            `(variante ${item.variantId}: pedía ${item.qty}, había ${variant.stockOnline}) — reconciliar a mano`
        );
      }
      if (applied > 0) {
        await tx
          .update(productVariants)
          .set({ stockOnline: rawSql`${productVariants.stockOnline} - ${applied}` })
          .where(
            and(
              eq(productVariants.id, item.variantId),
              rawSql`${productVariants.stockOnline} - ${applied} >= 0`
            )
          );
        await tx.insert(stockMovements).values({
          orgId: order.orgId,
          variantId: item.variantId,
          channel: "online",
          type: "sync",
          delta: -applied,
          note: `venta online #${order.orderNumber}`,
        });
      }
    }
    return "processed" as const;
  });

  if (result === "order_not_found") {
    // Pago aprobado que no matchea ninguna orden: anomalía — 500 para que MP
    // reintente mientras se investiga (nunca 200 silencioso)
    throw new AppError(500, "webhook_error", `Orden no encontrada para el pago ${payment.id}`);
  }
  return { ok: true, result };
}

/** MP manda cada pago en DOS formatos: el IPN legacy (sin firma, se ignora acá — su
 * gemelo firmado hace el trabajo) y el webhook nuevo (firmado). Devuelve el dataId
 * a procesar, o null si hay que responder { ok, ignored: true } sin más. */
function parseWebhookQuery(query: z.infer<typeof webhookQuery>): string | null {
  const type = query.type ?? "";
  const dataId = query["data.id"] ?? "";
  return type === "payment" && dataId ? dataId : null;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/webhooks/mercadopago",
    {
      schema: {
        tags: ["webhooks"],
        summary: "Notificaciones de Mercado Pago, token/secret de plataforma (auth por firma HMAC)",
        querystring: webhookQuery,
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof webhookQuery> }>, _reply: FastifyReply) => {
      const dataId = parseWebhookQuery(request.query);
      if (!dataId) return { ok: true, ignored: true };
      return processPaymentNotification(request, dataId, env.MP_WEBHOOK_SECRET, undefined);
    }
  );

  app.post(
    "/webhooks/mercadopago/:slug",
    {
      schema: {
        tags: ["webhooks"],
        summary: "Notificaciones de Mercado Pago propia de una org (T16) — cae al secreto de plataforma si la org no configuró nada",
        params: slugParam,
        querystring: webhookQuery,
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParam>; Querystring: z.infer<typeof webhookQuery> }>,
      _reply: FastifyReply
    ) => {
      const dataId = parseWebhookQuery(request.query);
      if (!dataId) return { ok: true, ignored: true };

      const config = await resolveStoreBySlug(request.params.slug);
      const secret = config.mpWebhookSecret ? decrypt(config.mpWebhookSecret) : env.MP_WEBHOOK_SECRET;
      const accessToken = config.mpAccessToken ? decrypt(config.mpAccessToken) : undefined;
      return processPaymentNotification(request, dataId, secret, accessToken);
    }
  );
}
