# Tarea 1 — Columnas nuevas en `catalog_configs` + endpoints

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** —

## Objetivo

Agregar banner y datos de contacto/horario a la configuración de la tienda, expuestos en admin y en la respuesta pública.

## Pasos

- [x] `backend/src/db/schema.ts`: columnas nuevas y nullable en `catalog_configs` — `bannerUrl`, `whatsapp`, `instagram`, `email`, `address`, `businessHours`.
- [x] Migración: `db:generate -- --name catalog_config_header_footer` + `db:migrate` (`supabase/migrations/0009_catalog_config_header_footer.sql`).
- [x] `packages/shared/src/schemas/catalogConfig.ts`: 6 campos en `catalogConfigSchema`; en `updateCatalogConfigSchema` solo los 5 de texto (`bannerUrl` deliberadamente afuera, mismo criterio que `logoUrl`), con `email` como `z.string().email()` y el resto con cotas de longitud.
- [x] `backend/src/modules/catalogConfig/routes.ts`: PATCH sin cambios de lógica (genérico); endpoint nuevo `POST /admin/catalog-config/banner`, calcado del de logo (mismos tipos permitidos, mismo límite de 2 MB, mismo borrado best-effort del archivo anterior).
- [x] `backend/src/modules/public/routes.ts`: los 6 campos sumados al objeto de respuesta de `/public/:slug/config`.

## Definition of Done

- [x] `tsc --noEmit` limpio en `shared` y `backend`.
- [x] Prueba manual real contra Docker + DB real: PATCH con los 5 campos de texto (incluyendo un WhatsApp con espacios/guiones, `"+54 9 11 2233-4455"`) → guardado correcto; `POST /admin/catalog-config/banner` con un archivo real → `bannerUrl` seteado; `GET /public/demo/config` devuelve los 6 campos.
- [x] **Confirmado que `bannerUrl` mandado por el PATCH genérico se ignora**: se probó mandar `{"bannerUrl": "https://evil.example.com/x.jpg", ...}` junto con los otros campos válidos → la respuesta volvió con `bannerUrl: null` (Zod lo descarta por no estar en el schema, ni siquiera llega al handler) — el resto de los campos del mismo request sí se guardaron. La única vía real es el endpoint de upload.
- [x] Ruta(s) visibles en `/docs`.
- [x] Datos de prueba (banner + los 5 campos de texto) revertidos a `null` al cerrar — no quedó nada fake en la org demo.
