import { env } from "../config/env.js";

// Emails transaccionales vía Resend — REST directo, sin SDK (patrón MP).
// MODO DEGRADADO: sin RESEND_API_KEY el contenido se loguea en vez de enviarse,
// así el flujo de pedidos funciona entero en dev sin cuenta de Resend.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(
  input: SendEmailInput,
  log: { info: (msg: string) => void; warn: (msg: string) => void }
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    log.info(
      `[email degradado — sin RESEND_API_KEY] to=${input.to} subject="${input.subject}"\n${input.html}`
    );
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // El email es un efecto secundario: si falla, se loguea pero NO rompe
      // el cambio de estado del pedido (decisión documentada)
      log.warn(`Resend falló (HTTP ${res.status}): ${body} — email a ${input.to} no enviado`);
    }
  } catch (err) {
    log.warn(`Resend inalcanzable: ${String(err)} — email a ${input.to} no enviado`);
  }
}

const STATUS_TEXTS: Record<string, { subject: string; body: string }> = {
  paid: {
    subject: "¡Recibimos tu pago!",
    body: "Tu pago fue confirmado y ya estamos gestionando tu pedido.",
  },
  preparing: {
    subject: "Tu pedido está en preparación",
    body: "Estamos preparando tus productos para el envío.",
  },
  shipped: {
    subject: "¡Tu pedido está en camino!",
    body: "Tu pedido fue despachado.",
  },
  delivered: {
    subject: "Tu pedido fue entregado",
    body: "¡Gracias por tu compra! Esperamos que lo disfrutes.",
  },
  cancelled: {
    subject: "Tu pedido fue cancelado",
    body: "Tu pedido fue cancelado. Si tenés dudas, contactá a la tienda.",
  },
};

export function orderStatusEmail(input: {
  storeName: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  trackingNumber?: string | null;
}): { subject: string; html: string } {
  const texts = STATUS_TEXTS[input.status] ?? {
    subject: `Actualización de tu pedido #${input.orderNumber}`,
    body: `El estado de tu pedido cambió a: ${input.status}.`,
  };
  const total = (input.totalCents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
  return {
    subject: `${texts.subject} — Pedido #${input.orderNumber} · ${input.storeName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">${input.storeName}</h2>
        <p style="color: #6b7280; margin-top: 0;">Pedido #${input.orderNumber} · ${total}</p>
        <p>${texts.body}</p>
        ${
          input.trackingNumber
            ? `<p>Número de seguimiento: <strong>${input.trackingNumber}</strong></p>`
            : ""
        }
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">tienda creada con fabbric</p>
      </div>
    `.trim(),
  };
}
