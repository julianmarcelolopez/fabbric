// T21/01 — helpers de upload de imagen compartidos entre catalogConfig
// (logo/banner) y categories/collections (imagen de categoría/colección).
// Mismo bucket, mismas validaciones — antes vivía duplicado solo en
// catalogConfig/routes.ts, ahora es la fuente única para las tres entidades.

export const IMAGE_BUCKET = "product-images";
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  // SVG es seguro acá: se sirve como archivo estático y se consume vía <img src>,
  // los navegadores no ejecutan scripts embebidos en ese contexto (a diferencia de inline)
  "image/svg+xml": "svg",
};

/** Extrae el path de Storage desde una URL pública del bucket (para borrar la imagen vieja). */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length));
}
