import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { invoices, orders } from "../../db/schema.js";
import { AfipEmisionError, formatFechaISO, solicitarCae } from "../afip/service.js";
import { enviarFacturaPorEmail } from "./email.js";

type Logger = { info: (msg: string) => void; warn: (msg: string) => void };

/**
 * Intenta emitir (o reintentar) el CAE de una factura ya creada en estado
 * `pendiente`/`error`. Nunca toca la venta — solo actualiza la fila de
 * `invoices`. Usa la fecha del momento del intento (no la del pedido): AFIP
 * valida que `CbteFch` esté cerca de "hoy", y un reintento puede llegar días
 * después de la venta original.
 *
 * Si la emisión sale bien, dispara el envío del PDF por mail (Fase 3, Tarea
 * 3) — mismo criterio "efecto secundario que no rompe la operación
 * principal" que ya usa `notifyCustomer` en `orders/routes.ts`.
 *
 * Devuelve la fila actualizada, o `null` si la factura no existe en la org.
 */
export async function intentarEmision(orgId: string, invoiceId: string, log: Logger) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
  if (!invoice) return null;

  const [order] = await db.select().from(orders).where(eq(orders.id, invoice.orderId));

  try {
    const fecha = new Date();
    const result = await solicitarCae(orgId, {
      importeTotalCents: order.total,
      fecha,
      dniComprador: invoice.clienteDni,
    });
    const [updated] = await db
      .update(invoices)
      .set({
        estado: "emitida",
        cae: result.cae,
        caeVencimiento: result.caeVencimiento,
        numero: result.numeroComprobante,
        fecha: formatFechaISO(fecha),
        mensajeError: null,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();
    await enviarFacturaPorEmail(orgId, invoice.id, log);
    return updated;
  } catch (err) {
    const mensaje =
      err instanceof AfipEmisionError || err instanceof Error
        ? err.message
        : "Error desconocido al pedir el CAE a AFIP";
    const [updated] = await db
      .update(invoices)
      .set({ estado: "error", mensajeError: mensaje })
      .where(eq(invoices.id, invoice.id))
      .returning();
    return updated;
  }
}
