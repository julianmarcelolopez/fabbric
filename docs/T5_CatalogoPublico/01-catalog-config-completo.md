# Tarea 1 — Configuración de tienda completa (endpoint + página admin + logo)

**Estado:** ✅ Hecha (2026-07-08) — suite 11/11 PASS
**Depende de:** — (la tabla existe desde T4)

## Objetivo

Que el vendedor configure la identidad de su tienda antes de que sea pública: nombre, slug (su URL), color de acento, descripción y logo. Completa el módulo que T4 dejó con solo el umbral de stock.

## Pasos

### Shared

- [x] `updateCatalogConfigSchema` en `catalogConfig.ts`: partial de { storeName, slug, accentColor (#hex), theme, businessDescription (nullable), active }

### Backend

- [x] **Decisión de organización**: módulo nuevo `modules/catalogConfig/` con `routes.ts` + `service.ts`; `ensureConfig` se movió al service y el módulo de stock lo importa de ahí (el GET config y el PATCH del umbral quedan en stock, mismas rutas)
- [x] `PATCH /admin/catalog-config` — colisión de slug global → 409 "esa URL ya está tomada por otra tienda"; formato inválido → 400
- [x] `POST /admin/catalog-config/logo` — multipart ≤ 2 MB, path `{orgId}/config/logo-{uuid}.{ext}`, borra el logo anterior de Storage (verificado por Storage API), actualiza `logoUrl`
- [x] Swagger en ambas (tag "config de tienda")

### Frontend

- [x] Entrada "Tienda" en el sidebar, ruta `/admin/config`
- [x] `CatalogConfigPage.tsx`: nombre, slug (con preview de URL y advertencia si lo cambiás), color (input color nativo), descripción, toggle activa, logo con preview y reemplazo

## Definition of Done

- [x] Suite 11/11: PATCH persiste; slug inválido/color inválido → 400; slug tomado → 409; logo sube, es público, y al reemplazarlo el archivo viejo desaparece de Storage; .txt → 400; aislamiento (staff ve su propia config)
- [ ] En navegador: se verifica junto con la tarea 4 (el flujo de la verificación final arranca configurando la tienda)
- [x] Rutas en `/docs`; `tsc --noEmit` limpio en los tres workspaces

## Notas de ejecución (2026-07-08)

- La config de demo fue restaurada a sus valores tras el test; quedó un logo de prueba (1×1 px) que el usuario reemplazará por el real en la verificación final.
