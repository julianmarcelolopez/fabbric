// Mismo criterio que frontend/src/lib/slug.ts — duplicado a propósito: son
// paquetes/runtimes separados sin un util compartido hoy (mismo criterio que
// scripts/backfill-brands.ts). Usado para generar el slug de una marca creada
// al vuelo (alta inline, T29) — a diferencia de categorías/colecciones, donde
// el admin siempre manda el slug ya calculado desde el frontend.
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
