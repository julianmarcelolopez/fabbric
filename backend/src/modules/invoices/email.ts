import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { catalogConfigs, invoices, orders } from "../../db/schema.js";
import { invoiceEmail, sendEmail } from "../../lib/email.js";
import { generarInvoicePdf } from "./pdf.js";

type Logger = { info: (msg: string) => void; warn: (msg: string) => void };

/**
 * Envía el PDF de una factura ya `emitida` por mail: al cliente si dejó
 * dirección, y SIEMPRE una copia a la organización (`catalogConfigs.email`).
 * Efecto secundario puro — cualquier error (generar el PDF, Resend caído) se
 * loguea y se traga, nunca revierte el estado `emitida` de la factura.
 */
export async function enviarFacturaPorEmail(orgId: string, invoiceId: string, log: Logger): Promise<void> {
  try {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice || invoice.estado !== "emitida" || !invoice.cae) return;

    const [order] = await db.select().from(orders).where(eq(orders.id, invoice.orderId));
    const [config] = await db.select().from(catalogConfigs).where(eq(catalogConfigs.orgId, orgId));

    const destinatarios = [...new Set([invoice.clienteEmail, config.email].filter((e): e is string => !!e))];
    if (destinatarios.length === 0) {
      log.warn(`Factura ${invoiceId}: sin email de cliente ni de la tienda, no hay a quién enviarle el PDF`);
      return;
    }

    const { buffer, filename } = await generarInvoicePdf(orgId, invoiceId);
    const numeroFormateado = filename.replace(/^factura-/, "").replace(/\.pdf$/, "");
    const { subject, html } = invoiceEmail({
      storeName: config.storeName,
      numeroFormateado,
      totalCents: order.total,
      cae: invoice.cae,
    });
    const attachments = [{ filename, content: buffer.toString("base64") }];

    for (const to of destinatarios) {
      await sendEmail({ to, subject, html, attachments }, log);
    }
  } catch (err) {
    log.warn(
      `No se pudo enviar el email de la factura ${invoiceId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
