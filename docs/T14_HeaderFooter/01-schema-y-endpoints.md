# Tarea 1 — Columnas nuevas en `catalog_configs` + endpoints

**Estado:** ⬜ Pendiente
**Depende de:** —

## Objetivo

Agregar banner y datos de contacto/horario a la configuración de la tienda, expuestos en admin y en la respuesta pública.

## Pasos

- [ ] `backend/src/db/schema.ts`: columnas nuevas y nullable en `catalog_configs` — `bannerUrl` (text), `whatsapp` (text), `instagram` (text), `email` (text), `address` (text), `businessHours` (text).
- [ ] Migración: `db:generate -- --name catalog_config_header_footer` + `db:migrate`.
- [ ] `packages/shared/src/schemas/catalogConfig.ts`: sumar los campos de texto al schema de actualización.
- [ ] `backend/src/modules/catalogConfig/routes.ts`: sumar los campos al PATCH existente.
- [ ] Endpoint nuevo `POST /admin/catalog-config/banner` (multipart), mismo patrón que `/admin/catalog-config/logo`: valida tipo (JPEG/PNG/WebP) y tamaño (máx 2 MB), sube a Supabase Storage, guarda `bannerUrl`.
- [ ] `backend/src/modules/public/routes.ts`: sumar todos los campos nuevos a la respuesta de `/public/:slug/config` (el footer/header de la tienda los necesita).

## Definition of Done

- [ ] `tsc --noEmit` limpio en `shared` y `backend`.
- [ ] Prueba manual: subir un banner, cargar los campos de texto, confirmar que el GET admin y el GET público los devuelven.
- [ ] Ruta(s) visibles en `/docs`.
