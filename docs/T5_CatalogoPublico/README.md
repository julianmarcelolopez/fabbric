# T5 — Catálogo público (Fase 5 de docs/plan.md)

## Objetivo de la fase

La tienda deja de ser un preview: **`/store/<slug>` funciona sin sesión** para cualquier visitante, mostrando la portada que el vendedor armó en T3 y el detalle de producto de T2 — con los mismos componentes presentacionales (`HomeSectionsRenderer`, `ProductDetailView`) que ya renderizan los previews del admin, ahora alimentados por endpoints públicos. Además se completa el módulo de configuración de tienda que T4 dejó iniciado (nombre, logo, color, descripción).

Criterio de verificación de la fase (de `docs/plan.md`): */store/<slug> sin sesión refleja el orden/visibilidad configurados*.

## Decisiones que marcan esta fase

- **El tenant público se resuelve por `catalog_configs.slug`** (único global, ya garantizado por T4): `GET /public/:slug/...`. Slug inexistente, config inactiva u org inactiva → **404 indistinguible** (no filtrar existencia de tiendas apagadas).
- **Los endpoints públicos exponen SOLO campos public-safe**: nunca `costPrice`, nunca `stockLocal`, nunca ids internos innecesarios. La suite de tests verifica **por ausencia** (el JSON no contiene esas claves) — es un contrato de seguridad, no un detalle.
- **Semántica de `status` en la tienda**: `active` → visible y comprable; `out_of_stock` → visible, sin compra; `paused` → **oculto** (además del flag `visibleInCatalog`, que oculta siempre).
- **Stock online es el único stock público** (el local es operación interna): el detalle expone `stockOnline` por variante para el selector talle/color ("¡Últimas 2!").
- **Carrito y compra NO son de esta fase** (T6): el botón del `ProductDetailView` queda deshabilitado en la tienda igual que en el preview. La tienda de T5 es de **solo lectura**.
- **Logo de la tienda**: upload al bucket existente con el patrón de T2 (multipart → backend → Storage), path `{orgId}/config/logo-{uuid}.{ext}`.

## Cómo trabajamos esta carpeta

Igual que T0-T4: una tarea por archivo, en orden, marcando estados al cerrar.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-catalog-config-completo.md](01-catalog-config-completo.md) — Config de tienda completa (endpoint + página admin + logo) | — | ⬜ Pendiente |
| 2 | [02-public-endpoints.md](02-public-endpoints.md) — Endpoints públicos por slug (config, home, detalle) | 1 | ⬜ Pendiente |
| 3 | [03-store-frontend.md](03-store-frontend.md) — La tienda: layout + portada + detalle de producto | 2 | ⬜ Pendiente |
| 4 | [04-verificacion-final.md](04-verificacion-final.md) — Definition of Done de T5 | 1-3 | ⬜ Pendiente |

## Recordatorios operativos (gotchas acumulados)

- Cambios de schema → `db:generate` + `db:migrate` (esta fase probablemente no necesite — las tablas ya existen).
- Toda ruta nueva declara `schema` Swagger — **incluidas las públicas** (tag "público", sin `security`).
- Mutaciones nuevas → probar también en navegador (CORS). Ojo: los endpoints públicos los consume la MISMA SPA (localhost:5173 ya permitido), pero conviene re-chequear.
- Tests con secret key → Node. Deps nuevas → rebuild + renew-anon-volumes.
- Sin commits (decisión del usuario) — volver a ofrecer al cierre.

## Próximo paso al cerrar T5

**T6 — Portal cliente + Carrito + Checkout + Mercado Pago** (`docs/plan.md`, Fase 6) — la fase más grande del MVP: Google OAuth (diferido desde T1), login de compradores, carrito, checkout con MP sandbox, webhook que marca pagado y descuenta `stockOnline` (el tipo de movimiento `sync` reservado en T4 se cobra ahí).
