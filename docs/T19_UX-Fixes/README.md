# T19 — UX Fixes (rediseño del panel admin)

## Qué es esto y por qué existe

`T18_UX-Revision` diagnosticó la fricción real del panel admin y la tienda pública (heuristic evaluation sobre el código). T19 es la implementación de ese diagnóstico, guiada por un mockup visual (`mockup_fabbric_admin.html`, provisto por el usuario — no vive en el repo, es solo referencia de diseño) que muestra 4 pantallas del panel admin rediseñado:

- **Pantalla 1 — Dashboard**: banner de onboarding con checklist de arranque + alerta de "sin zona de envío" + métricas simplificadas (4 tarjetas en vez de las 14 actuales).
- **Pantalla 2 — Productos**: pantalla única con tabs (Todos los productos / Categorías / Colecciones / Stock) en vez de 3 ítems sueltos del sidebar.
- **Pantalla 3 — Alta de producto**: flujo en pasos (Datos básicos → Variantes → Fotos) con indicador de progreso, alerta inline si no hay variantes, y vista previa en vivo.
- **Pantalla 4 — Mi tienda**: "Home" (secciones) + banner + identidad visual unificados en una sola pantalla, con vista previa en tiempo real de la tienda pública y botones de copiar link / compartir en Instagram.

Cada tarea de T19 referencia una o más de estas pantallas y el hallazgo específico de T18 que la origina — no hay cambios en este plan que no vengan de un hallazgo documentado.

## Cómo se relaciona con T18

Cada archivo de tarea (01 a 10) tiene una sección "Referencia en T18" con el archivo y la severidad (🔴/🟡/🟢) del hallazgo que resuelve. Ver `../T18_UX-Revision/06-ux-review.md` para el consolidado completo y `../T18_UX-Revision/01-flujo-critico.md` para el detalle del flujo de 11 pasos que este rediseño busca acortar.

## Alcance y lo que NO se hace acá

Mismo alcance que T18: sin cambios de arquitectura de datos que no sean estrictamente necesarios para el fix puntual (ej. 06 sí toca el backend porque el fix es lógica de creación, no solo UI), sin tocar Mercado Pago/pagos más allá de lo que ya existe, sin rediseñar la tienda pública salvo lo que 10 exige (buscador). El foco sigue siendo reducir fricción real, priorizado por lo que T18 encontró — no features nuevas que T18 no haya señalado.

## Lista de tareas

| # | Tarea | Sprint | Referencia T18 | Estado |
|---|---|---|---|---|
| 1 | [01-sidebar-rediseno.md](01-sidebar-rediseno.md) — sidebar agrupado + estado de la tienda | 1 | 02-panel-admin.md, 05-mobile.md 🔴 | ✅ Completa |
| 2 | [02-productos-con-tabs.md](02-productos-con-tabs.md) — Categorías/Colecciones/Stock como tabs de Productos | 1 | 01-flujo-critico.md (mejora estructural) | ✅ Completa |
| 3 | [03-dashboard-onboarding.md](03-dashboard-onboarding.md) — checklist de arranque en el Dashboard | 1 | 01-flujo-critico.md 🟢 | ✅ Completa |
| 4 | [04-aviso-sin-variantes.md](04-aviso-sin-variantes.md) — aviso inline en la ficha de producto | 1 | 01-flujo-critico.md 🔴 | ✅ Completa |
| 5 | [05-aviso-zona-envio.md](05-aviso-zona-envio.md) — alerta en el Dashboard | 1 | 02-panel-admin.md 🔴 | ✅ Completa |
| 6 | [06-auto-home-section.md](06-auto-home-section.md) — crear la sección del home automáticamente | 1 | 01-flujo-critico.md 🔴 | ✅ Completa |
| 7 | [07-mi-tienda-unificado.md](07-mi-tienda-unificado.md) — Home + Config de tienda en una pantalla | 2 | 01-flujo-critico.md (mejora estructural), 03-catalogo-publico.md 🟡 | ✅ Completa |
| 8 | [08-alto-producto-pasos.md](08-alto-producto-pasos.md) — alta de producto en pasos guiados | 2 | 01-flujo-critico.md 🔴 (los dos hallazgos) | ✅ Completa |
| 9 | [09-tablas-mobile-scroll.md](09-tablas-mobile-scroll.md) — scroll horizontal en tablas del admin | 3 | 05-mobile.md 🔴 (inferido, no observado) | ✅ Completa |
| 10 | [10-buscador-catalogo.md](10-buscador-catalogo.md) — búsqueda/paginación en la tienda pública | 3 | 03-catalogo-publico.md 🔴 | ✅ Completa |

## Cómo trabajamos esta carpeta

Mismo patrón que el resto del proyecto (`docs/T<N>_*/`): cada tarea se implementa una por vez, se verifica de verdad (no solo `tsc --noEmit`) antes de pasar a la siguiente, y el archivo de tarea se actualiza con una sección de Resultado al cerrarla. El orden sugerido es 01 a 10, pero las de Sprint 1 (01-06) no tienen dependencias estrictas entre sí salvo las anotadas en cada una.
