# T18 — Revisión UX/UI de la plataforma fabbric

## Qué es esto y por qué existe

Con el MVP (T0-T10) y la demo de Eliathi Modas (T11-T17) ya construidos y verificados funcionalmente, esta fase evalúa un ángulo distinto: no si cada feature funciona, sino **si el camino para usarla tiene fricción**. El objetivo es identificar dónde un usuario real — dueño de local sin experiencia técnica, comprador que llega desde Instagram — pierde tiempo, se confunde o abandona, y proponer cambios concretos de UX/UI para reducirlo.

No es una fase de desarrollo: no agrega features, no cambia esquema ni lógica de negocio. Es un diagnóstico que alimenta decisiones de priorización para sprints futuros.

## Método

**Heuristic evaluation** (evaluación experta): análisis del flujo real y las pantallas reales por parte de un rol de diseñador UX/UI senior, aplicando principios de usabilidad conocidos — **no** hay datos de usuarios reales (analytics, grabaciones de sesión, tests de usuario). Las prioridades de impacto (Alto/Medio/Bajo) en los hallazgos son criterio experto, no medición.

La sección de mobile (T18/05) es un caso particular dentro de este método: se infiere leyendo el CSS (media queries, unidades fijas, breakpoints), no se observa en un dispositivo real ni en un emulador — no hay herramienta de browser automation disponible en este entorno para esa verificación.

## Scope

Este es un review de **la plataforma fabbric** (multi-tenant), usando **Eliathi Modas como tenant de prueba concreto** para poder trazar flujos y pantallas reales. Los hallazgos se formulan como problemas/mejoras de plataforma — algo que afecta a cualquier tenant que use fabbric — no como pedidos específicos de Eliathi Modas. Fuera de scope: cambios de arquitectura o base de datos, refactors de lógica de negocio, performance o SEO técnico.

## Fuentes que se leen antes de analizar

1. `docs/T0` a `T17` — solo los `README.md` de cada carpeta (contexto de qué existe y por qué, sin entrar al detalle de cada tarea).
2. `frontend/src/router.tsx` — mapa de rutas real, para saber cómo se navega entre pantallas.
3. `frontend/src/features/admin/AdminLayout.tsx` — shell y navegación del panel admin.
4. `frontend/src/features/store/StoreLayout.tsx` — shell y navegación de la tienda pública.
5. `frontend/src/features/admin/pages/*` — todas las pantallas del panel.
6. `frontend/src/features/store/*` — todas las pantallas de la tienda pública.
7. `frontend/src/features/catalog/catalog.css` — estilos de catálogo/tienda pública.
8. `frontend/src/features/admin/admin.css` — estilos del panel admin.

## Archivos que se generan

| Archivo | Para qué sirve |
|---|---|
| `CLAUDE.md` | Rol, contexto de negocio, principios de diseño y formato de análisis — ver aclaración abajo sobre qué es y qué no es este archivo. |
| `01-flujo-critico.md` | El camino completo desde que el admin entra hasta tener su primer producto visible y compartible — responde la pregunta central de esta fase. |
| `02-panel-admin.md` | Dashboard, productos, variantes, stock, pedidos, finanzas, configuración. |
| `03-catalogo-publico.md` | Home, catálogo, filtros, buscador, página de producto, colecciones. |
| `04-checkout.md` | Carrito, datos de envío, pago con Mercado Pago, confirmación, email post-compra. |
| `05-mobile.md` | Revisión de cada pantalla en viewport ~390px (iPhone) — inferida del CSS, no observada en dispositivo real (ver Método). |
| `06-ux-review.md` | Consolidado final: todos los hallazgos de 01-05, priorizados por impacto, con plan de acción sugerido. Se genera al final, después de completar los 5 análisis. |

## Pregunta central

¿Cuántos pasos necesita un dueño de local de ropa, sin experiencia técnica, para tener su primer producto visible en la tienda pública? Cada paso se cuenta sobre el código real (rutas, clicks, campos obligatorios), no se estima.

## Aclaración sobre `CLAUDE.md` en esta carpeta

El archivo `docs/T18_UX-Revision/CLAUDE.md` es **documentación del rol y método usados para este análisis** — no es un archivo de configuración activo de Claude Code. Claude Code solo carga automáticamente los `CLAUDE.md` ubicados en el directorio de trabajo actual o sus carpetas ancestras; uno dentro de una subcarpeta de `docs/` no se inyecta como instrucción de sistema en sesiones futuras salvo que alguien lo abra o lo referencie explícitamente.
