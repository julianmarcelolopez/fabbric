import Afip from "@afipsdk/afip.js";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { catalogConfigs } from "../../db/schema.js";
import { decrypt } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";

// T25 — wrapper delgado sobre @afipsdk/afip.js. Nadie fuera de este módulo
// debería importar el SDK directamente: acá vive todo el conocimiento de
// cómo autenticarse contra AFIP y armar un comprobante tipo C.

/** Cualquier fallo de AFIP (rechazo de datos, timeout, servicio caído) — la
 * Fase 2 la captura para dejar la factura en estado `error` sin tocar la venta. */
export class AfipEmisionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AfipEmisionError";
  }
}

type SolicitarCaeInput = {
  /** Importe total de la venta, en centavos (mismo formato que el resto de fabbric) */
  importeTotalCents: number;
  fecha: Date;
  /** DNI del comprador, si se cargó — Factura C admite consumidor final sin identificar */
  dniComprador?: string | null;
};

type SolicitarCaeResult = {
  cae: string;
  /** Fecha de vencimiento del CAE, formato AAAA-MM-DD (normalizado por el SDK, no el AAAAMMDD crudo de AFIP) */
  caeVencimiento: string;
  numeroComprobante: number;
};

// CbteTipo/tipoCmp AFIP para Factura C — exportado porque el QR (Fase 3) necesita el mismo código.
export const FACTURA_C = 11;
const CONCEPTO_PRODUCTOS = 1;
const DOC_TIPO_CONSUMIDOR_FINAL = 99;
const DOC_TIPO_DNI = 96;
const CONDICION_IVA_CONSUMIDOR_FINAL = 5;

function formatFechaAfip(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Misma fecha que `formatFechaAfip`, pero con guiones (RFC3339 full-date) —
 * el formato que exige el JSON del QR (RG 4892), distinto del `CbteFch` que
 * espera WSFE. Se expone acá para que `invoices/service.ts` guarde EXACTAMENTE
 * la misma fecha que se mandó a AFIP, sin recalcularla por su cuenta. */
export function formatFechaISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Centavos → pesos con hasta 2 decimales, como espera AFIP (nunca en centavos). */
function centsToPesosNumber(cents: number): number {
  return Math.round(cents) / 100;
}

async function getAfipClientForOrg(orgId: string) {
  const [config] = await db.select().from(catalogConfigs).where(eq(catalogConfigs.orgId, orgId));
  if (!config) throw new AppError(404, "not_found", "Organización no encontrada");

  const { afipCuit, afipPuntoVenta, afipAmbiente, afipCertificado, afipClavePrivada, afipAccessToken } = config;
  if (!afipCuit || !afipPuntoVenta || !afipAmbiente || !afipCertificado || !afipClavePrivada || !afipAccessToken) {
    throw new AppError(
      400,
      "afip_not_configured",
      "La organización no tiene la facturación AFIP configurada (falta CUIT, punto de venta, certificado o clave)"
    );
  }

  const afip = new Afip({
    CUIT: afipCuit,
    cert: decrypt(afipCertificado),
    key: decrypt(afipClavePrivada),
    access_token: decrypt(afipAccessToken),
    production: afipAmbiente === "produccion",
  });

  return { afip, puntoVenta: afipPuntoVenta };
}

/**
 * Pide un CAE a AFIP para una Factura C (consumidor final o identificado por
 * DNI). Usa `createNextVoucher` — el propio SDK resuelve el próximo número de
 * comprobante, no lo calculamos nosotros.
 */
export async function solicitarCae(orgId: string, input: SolicitarCaeInput): Promise<SolicitarCaeResult> {
  const { afip, puntoVenta } = await getAfipClientForOrg(orgId);
  const importe = centsToPesosNumber(input.importeTotalCents);

  const data = {
    CantReg: 1,
    PtoVta: puntoVenta,
    CbteTipo: FACTURA_C,
    Concepto: CONCEPTO_PRODUCTOS,
    DocTipo: input.dniComprador ? DOC_TIPO_DNI : DOC_TIPO_CONSUMIDOR_FINAL,
    DocNro: input.dniComprador ? Number(input.dniComprador) : 0,
    CbteFch: formatFechaAfip(input.fecha),
    ImpTotal: importe,
    ImpTotConc: 0,
    ImpNeto: importe,
    ImpOpEx: 0,
    ImpIVA: 0,
    ImpTrib: 0,
    MonId: "PES",
    MonCotiz: 1,
    CondicionIVAReceptorId: CONDICION_IVA_CONSUMIDOR_FINAL,
  };

  let res: any;
  try {
    res = await afip.ElectronicBilling.createNextVoucher(data);
  } catch (err) {
    throw new AfipEmisionError(err instanceof Error ? err.message : "Error desconocido al pedir el CAE a AFIP", err);
  }

  const cae = res?.CAE;
  const caeVencimiento = res?.CAEFchVto;
  const numeroComprobante = res?.voucher_number ?? res?.voucherNumber ?? res?.CbteDesde;
  if (!cae || !caeVencimiento || !numeroComprobante) {
    throw new AfipEmisionError(`Respuesta de AFIP sin CAE/número de comprobante: ${JSON.stringify(res)}`);
  }

  return { cae, caeVencimiento, numeroComprobante };
}
