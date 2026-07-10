import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

// Cliente REST directo de Mercado Pago (decisión documentada: sin SDK — una
// dependencia menos; son 2 llamadas HTTP: crear preferencia y consultar pago).

const MP_API = "https://api.mercadopago.com";

type PreferenceItem = {
  title: string;
  quantity: number;
  /** en PESOS con decimales — MP no usa centavos */
  unit_price: number;
  currency_id: string;
};

export async function createPreference(input: {
  orderId: string;
  orderNumber: number;
  storeName: string;
  slug: string;
  items: PreferenceItem[];
  shippingCost: number; // centavos
}): Promise<{ preferenceId: string; initPoint: string }> {
  const resultUrl = `${env.FRONTEND_URL}/store/${input.slug}/checkout/result`;
  const body: Record<string, unknown> = {
    items: input.items,
    // El envío viaja como ítem más (Checkout Pro no tiene campo de envío custom simple)
    ...(input.shippingCost > 0
      ? {
          items: [
            ...input.items,
            {
              title: "Envío",
              quantity: 1,
              unit_price: input.shippingCost / 100,
              currency_id: "ARS",
            },
          ],
        }
      : {}),
    external_reference: input.orderId,
    statement_descriptor: input.storeName.slice(0, 22),
    back_urls: { success: resultUrl, pending: resultUrl, failure: resultUrl },
    // MP rechaza auto_return con URLs http/localhost (probado): solo en prod (https).
    // En dev el comprador vuelve manualmente; en producción el redirect es automático.
    ...(env.FRONTEND_URL.startsWith("https://") ? { auto_return: "approved" } : {}),
    ...(env.MP_WEBHOOK_URL
      ? { notification_url: `${env.MP_WEBHOOK_URL}/webhooks/mercadopago` }
      : {}),
    metadata: { order_id: input.orderId, order_number: input.orderNumber, store: input.slug },
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      // Idempotencia del lado de MP ante reintentos de red
      "X-Idempotency-Key": input.orderId,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    id?: string;
    init_point?: string;
    message?: string;
  } | null;
  if (!res.ok || !data?.id || !data.init_point) {
    throw new AppError(502, "mp_error", `Mercado Pago: ${data?.message ?? `HTTP ${res.status}`}`);
  }
  return { preferenceId: data.id, initPoint: data.init_point };
}

/** Consulta el pago REAL a la API de MP — el webhook jamás confía en su payload. */
export async function getPayment(paymentId: string): Promise<{
  id: string;
  status: string;
  externalReference: string | null;
}> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  const data = (await res.json().catch(() => null)) as {
    id?: number;
    status?: string;
    external_reference?: string;
    message?: string;
  } | null;
  if (!res.ok || !data?.id || !data.status) {
    throw new AppError(502, "mp_error", `Mercado Pago payments: ${data?.message ?? `HTTP ${res.status}`}`);
  }
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference ?? null,
  };
}
