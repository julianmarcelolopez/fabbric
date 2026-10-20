// T36 — el código de barras físico de la prenda codifica modelo/color/talle:
// los últimos 3 dígitos antes del "." son el color, todo lo que queda antes
// de esos 3 es el modelo (largo variable, no fijo — ver ejemplos reales:
// "01800640.034" → modelo 01800, "018005053.034" → modelo 018005). El talle
// va después del "." — NO siempre son 3 dígitos: en jeans es un código
// numérico ("034"), pero en remeras ya se vio el talle literal ("S", "XL",
// ver docs/T36_AltaPorCodigoDeBarras/analisis.md) — se acepta cualquier
// texto no vacío.
const BARCODE_RE = /^(\d+)(\d{3})\.(.+)$/;

export type ParsedBarcode = {
  modeloCode: string;
  colorCode: string;
  talleCode: string;
};

export function parseBarcode(barcode: string): ParsedBarcode | null {
  const match = BARCODE_RE.exec(barcode.trim());
  if (!match) return null;
  const [, modeloCode, colorCode, talleCode] = match;
  return { modeloCode, colorCode, talleCode: talleCode.trim() };
}
