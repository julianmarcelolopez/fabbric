# T15 — Configuración: página con tabs + tab Usuario (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

Crear la sección "Configuración" del admin, con navegación por tabs, y el primer tab (Usuario) — shell liviano sobre el que se monta T16 (tab Integraciones).

Criterio de verificación (de `docs/plan_2.md`): *la sección muestra las tabs Usuario e Integraciones; Usuario refleja los datos reales de `/admin/me`*.

## Decisiones que marcan esta fase

- **No reemplaza ni consolida** las páginas existentes de Tienda (`CatalogConfigPage`) ni Envíos (`ShippingZonesPage`) — quedan donde están en el sidebar, se evaluó y se descartó juntarlas acá.
- **Tab Usuario es informativo, sin edición** — email, rol, organización del admin autenticado. No hace falta endpoint nuevo (`/admin/me` ya devuelve todo).
- La tab Integraciones se agrega recién en T16 — esta fase solo deja el shell de tabs listo (aunque puede mostrarse vacía/placeholder hasta que T16 la complete).

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-settings-page-tab-usuario.md](01-settings-page-tab-usuario.md) — `SettingsPage.tsx` con navegación por tabs, ruteo, tab Usuario | — | ✅ Completada |
| 2 | [02-verificacion-final.md](02-verificacion-final.md) — Definition of Done de T15 | 1 | ✅ Completada |

## Recordatorios operativos

- Sin cambios de backend ni migraciones — usa `/admin/me`, que ya existe.
- Nueva entrada en el sidebar de `AdminLayout.tsx` ("Configuración").

## Próximo paso al cerrar T15

**T16 depende de esta fase** (la tab Integraciones se monta sobre el shell que arma T15). El resto (T11-T14) son independientes.
