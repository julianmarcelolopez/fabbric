import { and, eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { db } from "../../db/client.js";
import { catalogConfigs, invoices, orderItems, orders } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { FACTURA_C } from "../afip/service.js";

// T25 Fase 3 — QR obligatorio (RG 4892/2020). Spec oficial:
// https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
const QR_BASE_URL = "https://www.arca.gob.ar/fe/qr/";
const DOC_TIPO_DNI = 96;

/**
 * Arma el texto que va codificado en el QR: `{URL}?p={JSON en base64}`.
 * Expuesto aparte (no solo usado internamente) para poder probarlo contra el
 * ejemplo oficial de AFIP sin tener que generar un PDF completo.
 */
export function buildQrText(params: {
  fecha: string; // "AAAA-MM-DD"
  cuit: string;
  ptoVta: number;
  numero: number;
  importeCents: number;
  cae: string;
  dniComprador?: string | null;
}): string {
  const payload: Record<string, unknown> = {
    ver: 1,
    fecha: params.fecha,
    cuit: Number(params.cuit),
    ptoVta: params.ptoVta,
    tipoCmp: FACTURA_C,
    nroCmp: params.numero,
    importe: params.importeCents / 100,
    moneda: "PES",
    ctz: 1,
  };
  // "DE CORRESPONDER" — la spec solo pide estos dos campos si hay documento
  // del receptor; Factura C a consumidor final sin DNI los omite del todo.
  if (params.dniComprador) {
    payload.tipoDocRec = DOC_TIPO_DNI;
    payload.nroDocRec = Number(params.dniComprador);
  }
  payload.tipoCodAut = "E"; // autorizado por CAE (no CAEA)
  payload.codAut = Number(params.cae);

  const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${QR_BASE_URL}?p=${base64}`;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatNumeroComprobante(ptoVta: number, numero: number): string {
  return `${String(ptoVta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

export type InvoicePdf = { buffer: Buffer; filename: string };

/** Genera el PDF de una factura ya `emitida`. Devuelve el buffer completo y un nombre de archivo sugerido. */
export async function generarInvoicePdf(orgId: string, invoiceId: string): Promise<InvoicePdf> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, orgId)));
  if (!invoice) throw new AppError(404, "not_found", "Factura no encontrada");
  const { cae, numero, fecha } = invoice;
  if (invoice.estado !== "emitida" || !cae || !numero || !fecha) {
    throw new AppError(409, "not_emitted", "La factura todavía no fue emitida — no hay CAE para generar el PDF");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, invoice.orderId));
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const [config] = await db.select().from(catalogConfigs).where(eq(catalogConfigs.orgId, orgId));
  const { afipCuit: cuit, afipPuntoVenta: ptoVenta } = config;
  if (!cuit || !ptoVenta) {
    throw new AppError(500, "afip_not_configured", "Falta CUIT o punto de venta de la organización");
  }

  const qrText = buildQrText({
    fecha,
    cuit,
    ptoVta: ptoVenta,
    numero,
    importeCents: order.total,
    cae,
    dniComprador: invoice.clienteDni,
  });
  const qrPng = await QRCode.toBuffer(qrText, { width: 180, margin: 1 });

  const filename = `factura-${formatNumeroComprobante(ptoVenta, numero)}.pdf`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), filename }));
    doc.on("error", reject);

    doc.fontSize(16).text(config.storeName, { continued: false });
    doc.fontSize(9).fillColor("#555");
    doc.text(`CUIT: ${cuit}`);
    doc.text(`Punto de venta: ${String(ptoVenta).padStart(4, "0")}`);
    doc.text("Condición frente al IVA: Monotributo");
    doc.fillColor("#000");
    doc.moveDown();

    doc.fontSize(14).text("FACTURA C", { align: "center" });
    doc.fontSize(10).text(`N° ${formatNumeroComprobante(ptoVenta, numero)}`, { align: "center" });
    doc.text(`Fecha: ${fecha}`, { align: "center" });
    doc.moveDown();

    doc.fontSize(10);
    if (invoice.clienteNombre) {
      doc.text(`Cliente: ${invoice.clienteNombre}`);
      if (invoice.clienteDni) doc.text(`DNI: ${invoice.clienteDni}`);
    } else {
      doc.text("Cliente: Consumidor Final");
    }
    doc.moveDown();

    doc.fontSize(10).text("Detalle:", { underline: true });
    for (const item of items) {
      const detalle = [item.talle, item.color].filter(Boolean).join("/");
      doc.text(
        `${item.qty} x ${item.name}${detalle ? ` (${detalle})` : ""} — ${formatCurrency(item.unitPrice)} c/u`
      );
    }
    doc.moveDown();
    doc.fontSize(12).text(`TOTAL: ${formatCurrency(order.total)}`, { align: "right" });
    doc.moveDown(2);

    doc.fontSize(9).fillColor("#555");
    doc.text(`CAE: ${cae}`);
    doc.text(`Vencimiento de CAE: ${invoice.caeVencimiento}`);
    doc.fillColor("#000");
    doc.moveDown();
    doc.image(qrPng, { width: 110 });

    doc.end();
  });
}
