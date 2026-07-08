# Tarea 4 — Upload de imágenes a Storage (+ reorder + delete)

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [03-productos-variantes.md](03-productos-variantes.md)

## Objetivo

Subida de imágenes de producto con el backend como intermediario a Supabase Storage (patrón heredado de byos-platform): el frontend nunca toca Storage directo; la secret key vive solo en el backend.

## Pasos

- [x] `@fastify/multipart` registrado en `index.ts` con límite de 10 MB por archivo (la dep ya estaba desde T0, solo faltaba registrarla — no hizo falta rebuild)
- [x] `backend/src/modules/images/routes.ts`:
  - `POST /admin/products/:id/images` — multipart; valida content-type (`image/jpeg|png|webp`), sube a `product-images` con path `{orgId}/{productId}/{uuid}.{ext}`, inserta fila con url pública, `sortOrder` incremental
  - `PUT /admin/products/:id/images/order` — reordena; exige el set **exacto** de imágenes del producto (set incompleto → 400 `invalid_image_set`)
  - `DELETE /admin/images/:id` — borra archivo de Storage primero y la fila después (si Storage falla → 502 y la fila queda)
- [x] Hook del delete de producto completado: captura los `storagePath` antes del delete y limpia Storage best-effort (archivo huérfano tolerable; fila fantasma no)
- [x] Error handler extendido: los 4xx de plugins (ej. 413 de multipart) responden el formato `{ error: { code, message } }` estándar

## Definition of Done

- [x] Upload real (PNG generado) → 201; url pública responde 200
- [x] Path por tenant verificado: `{orgId}/{productId}/{uuid}.png`
- [x] `.txt` → 400 `invalid_file_type`; archivo de 11 MB → **413** limpio
- [x] Reorder persiste y `GET /admin/products/:id` refleja el orden nuevo; set incompleto → 400
- [x] Delete de imagen borra fila + archivo — **verificado por Storage API** (ver nota CDN abajo)
- [x] Delete de producto limpia sus archivos de Storage (verificado: bucket vacío al final)
- [x] **Aislamiento**: staff de otra org → 404 en upload y delete
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-07)

- **CDN de Supabase Storage cachea las URLs públicas**: tras borrar un archivo, su url pública puede seguir respondiendo 200 un rato si ya había sido pedida antes (edge cache). La verificación de borrado se hace contra la Storage API (`/storage/v1/object/list`), no contra la url pública. Implicación de diseño (que ya cumplimos): **nunca reutilizar un path al reemplazar una imagen** — siempre UUID nuevo por archivo.
- Suite: 15/16 checks directos + el caso 16 (borrado real) confirmado por Storage API con bucket vacío.
