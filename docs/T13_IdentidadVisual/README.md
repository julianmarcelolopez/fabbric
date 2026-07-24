# T13 — Identidad visual placeholder (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

**Actualizado (2026-07-24): ya existe el logo real de Eliathi Modas** (subido fuera de plan, ver memoria/README general — `catalogConfigs.logoUrl` de la org demo ya apunta al SVG real). Esto cambia el objetivo original: en vez de "placeholder mientras no hay logo", la fase pasa a ser **aplicar la paleta real del logo a toda la tienda** (no solo el header, que es lo único que ya lo usa) + tipografía prolija para el resto del catálogo.

Criterio de verificación (de `docs/plan_2.md`, sigue vigente): *la tienda pública se ve con tipografía y paleta coherentes y un wordmark prolijo, sin tocar el panel admin*.

## Decisiones que marcan esta fase

- Toca **solo la tienda pública** (`/store/:slug`) — el panel admin no se reskinea para esta demo.
- **Paleta real extraída del SVG del logo**, no una aproximación: fondo `#F7F3EC` (crema), texto/trazo `#16213E` (azul marino), acento `#FF6B4A` (naranja/coral).
- `accentColor` de `catalog_configs` pasa a `#FF6B4A` — decisión del usuario, se aplica como dato vía `PATCH /admin/catalog-config` (mismo mecanismo que ya usa `CatalogConfigPage`), no requiere código nuevo.
- El fondo de `.store` (hoy `#fff` fijo en `catalog.css`) pasa a `#F7F3EC` — esto sí es código, para hacer juego con el logo.
- **Fondo y tipografía quedan hardcodeados en `catalog.css`, NO configurables por org** (a diferencia de `accentColor`, que ya lo es). Decisión consciente: para un solo tenant real sin presión de fecha, no se justifica construir un sistema de temas (el mecanismo existe — mismo patrón de variable CSS inyectada que usa `--accent` — pero no se arma ahora). Si entra un segundo tenant con necesidades visuales distintas, ahí se justifica extenderlo; hoy sería sobre-ingeniería. Anotado también en "Fuera de alcance" de `docs/plan_2.md`.
- **Tarea 2 (wordmark de texto) baja de prioridad**: seguía siendo el fallback para cuando no hay `logoUrl`, pero como Eliathi ya tiene logo real, no bloquea cerrar esta demo — se hace después de la tarea 1, no en paralelo.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-tipografia-y-paleta.md](01-tipografia-y-paleta.md) — Google Fonts + paleta real del logo (`accentColor` a `#FF6B4A`, fondo `.store` a `#F7F3EC`) en `catalog.css` | — | ✅ Completada |
| 2 | [02-wordmark-placeholder.md](02-wordmark-placeholder.md) — wordmark de texto en `StoreLayout.tsx` como fallback sin logo (baja prioridad, no bloquea el cierre de la demo) | 1 | ✅ Completada |
| 3 | [03-verificacion-final.md](03-verificacion-final.md) — Definition of Done de T13 | 1-2 | ✅ Completada |

## Recordatorios operativos

- Sin migración; el único cambio de "backend" es un `PATCH /admin/catalog-config` con el `accentColor` nuevo (dato, no código).
- Verificar que el cambio de tipografía/fondo no afecte el admin (`admin.css` es un archivo separado de `catalog.css`).

## Próximo paso al cerrar T13

Independiente del resto — seguir con cualquiera de T11, T12, T14 o T15.
