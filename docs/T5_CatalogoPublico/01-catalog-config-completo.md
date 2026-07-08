# Tarea 1 — Configuración de tienda completa (endpoint + página admin + logo)

**Estado:** ⬜ Pendiente
**Depende de:** — (la tabla existe desde T4)

## Objetivo

Que el vendedor configure la identidad de su tienda antes de que sea pública: nombre, slug (su URL), color de acento, descripción y logo. Completa el módulo que T4 dejó con solo el umbral de stock.

## Pasos

### Shared

- [ ] `updateCatalogConfigSchema` en `catalogConfig.ts`: partial de { storeName, slug, accentColor (#hex), theme, businessDescription (nullable), active }

### Backend (`modules/stock/routes.ts` se renombra el grupo o va a `modules/catalogConfig/routes.ts` — decidir al implementar y documentar)

- [ ] `PATCH /admin/catalog-config` — update completo; **cambio de slug**: validar formato + colisión global → 409 con mensaje claro ("esa URL ya está tomada por otra tienda")
- [ ] `POST /admin/catalog-config/logo` — multipart (patrón imágenes T2): JPEG/PNG/WebP ≤ 2 MB, sube a `{orgId}/config/logo-{uuid}.{ext}`, borra el logo anterior de Storage si había, actualiza `logoUrl`
- [ ] Swagger en ambas

### Frontend

- [ ] Entrada "Tienda" en el sidebar, ruta `/admin/config`
- [ ] `CatalogConfigPage.tsx`: form con storeName, slug (con preview de la URL `/store/<slug>` y advertencia de que cambiarlo rompe links compartidos), accentColor (input color), descripción, toggle activa, y dropzone chico para el logo (con preview)

## Definition of Done

- [ ] Suite HTTP: PATCH completo persiste; slug inválido → 400; slug tomado por otra org → 409; upload de logo funciona y reemplaza el anterior (el archivo viejo desaparece de Storage); aislamiento (otra org no ve/edita)
- [ ] En navegador: editar nombre/color/descr + subir logo → "Guardado ✓" (verificación del usuario puede diferirse a la tarea 4)
- [ ] Rutas en `/docs`; `tsc --noEmit` limpio
