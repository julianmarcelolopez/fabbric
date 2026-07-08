// Los precios viajan en centavos (int); el frontend formatea/parsea pesos.

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

/** Input del usuario en pesos ("1999,50") → centavos (199950), o null si inválido */
export function pesosToCents(input: string): number | null {
  if (input.trim() === "") return null;
  const n = Number(input.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToPesosInput(cents: number | null): string {
  return cents == null ? "" : String(cents / 100).replace(".", ",");
}
