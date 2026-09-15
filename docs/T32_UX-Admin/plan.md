# Plan — Rediseño visual del panel admin

Basado en `analisis.md` y en `spec-rediseno-admin.md` (paleta de la sección
"Mapeo exacto" y DoD, heredadas sin cambios). Orden de dependencia: primero
la base de CSS (de ahí cuelga el 90% del cambio visual), después la
limpieza de fugas inline (necesita la base para tener contra qué comparar
visualmente), después los 3 cambios puntuales que requieren decisión propia
(gráfico de 2 series, `StockPage`, `FinanzasPage`) — estos tres son
independientes entre sí y pueden hacerse en cualquier orden, después el
detalle tipográfico opcional, por último la verificación de punta a punta.

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-paleta-base](tareas/01-paleta-base/01-paleta-base.md) — pisar `admin.css` con la paleta nueva | nada | ✅ Hecha |
| 2 | [02-limpieza-inline](tareas/02-limpieza-inline/02-limpieza-inline.md) — sacar colores viejos hardcodeados en 6 archivos | 1 | ✅ Hecha |
| 3 | [03-dashboard-charts](tareas/03-dashboard-charts/03-dashboard-charts.md) — resolver el panel de 2 series del Dashboard | 1 | ⬜ Pendiente |
| 4 | [04-stock-structural](tareas/04-stock-structural/04-stock-structural.md) — `StockPage`: stat-cards + mover "Registrar movimiento" a un `.card` | 1 | ⬜ Pendiente |
| 5 | [05-finanzas-structural](tareas/05-finanzas-structural/05-finanzas-structural.md) — `FinanzasPage`: resumen del mes como 5 stat-cards | 1 | ⬜ Pendiente |
| 6 | [06-sidebar-tipografia](tareas/06-sidebar-tipografia/06-sidebar-tipografia.md) — `.sidebar-brand h2` a Cormorant Garamond | 1 | ⬜ Pendiente |
| 7 | [07-verificacion-final](tareas/07-verificacion-final/07-verificacion-final.md) — checklist en vivo, ≥3 pantallas, mobile, `tsc` | 1-6 | ⬜ Pendiente |

## T32/01 — Base: pisar `admin.css` con la paleta nueva

**Objetivo**: aplicar el cambio de piel a las 13 páginas sin tocar ningún
`*Page.tsx`, adoptando `mockups/admin-redesign.css` como nuevo
`admin.css` (ver `analisis.md` sección 2 — no es un mockup a traducir, ya
es el archivo final).

**Alcance** (`frontend/src/features/admin/admin.css`)
- Reemplazar el contenido completo por el de
  `docs/T32_UX-Admin/mockups/admin-redesign.css`, con dos ajustes al
  pisarlo:
  - Sacar el `@import` de Google Fonts (línea 8 del mockup) — ya se cargan
    globalmente desde `index.html` (`analisis.md` sección 3), duplicarlo no
    rompe nada pero es innecesario.
  - Las clases `.stat-card*` quedan en el archivo (no hacen daño si no se
    usan todavía) — las consumen las Tareas 4 y 5.
- No tocar ningún archivo de `pages/` en esta tarea — es intencional que la
  paleta cambie antes de que se vean las fugas inline (Tarea 2) para poder
  compararlas contra el fondo correcto.

**Criterio de aceptación**: las 13 páginas cargan con sidebar navy, accent
coral, fondo crema, sin haber tocado ningún `*Page.tsx`. `npx tsc --noEmit`
limpio en `frontend/` (cambio de CSS puro, no debería tocar tipos, pero se
verifica igual).

## T32/02 — Limpieza: colores viejos hardcodeados inline

**Objetivo**: barrer las fugas de la paleta vieja que el grep de la spec no
cubre — no son azules, son grises/violetas viejos en `style={{}}` inline
(`analisis.md` sección 4a). Sin tocar los que son semánticos (sección 4b) ni
el que es un dato de usuario (sección 4c).

**Alcance**
- `DashboardPage.tsx:216` — `#2563eb` → `#F07058` (o resolverse junto con la
  Tarea 3, ver nota ahí — esta línea específica es parte del mismo panel de
  2 series).
- `MyStorePage.tsx:404,483,577,765` — `#e5e7eb`/`#fff` → `#E8E4DF`/`#fff`
  (el blanco no cambia, es el mismo `#fff` de siempre; solo el borde).
- `TaxonomyManager.tsx:259` — `#e5e7eb` → `#E8E4DF`.
- `StockPage.tsx:246` — `#f9fafb` → `#F8F7F5`.
- `FinanzasPage.tsx:205,222,413` — `#9ca3af` → `#8A8278`. Corrección: no es
  texto muted, es el color por defecto del punto de una "cartera" sin
  color asignado (`wallet.color ?? "#9ca3af"` / `mov.walletColor ??
  "#9ca3af"`) — se actualiza igual, mismo criterio de "no dejar grises
  viejos", pero no toca `.muted` ni ningún texto.

**Criterio de aceptación**: `grep -rnoE "#[0-9a-fA-F]{3,6}"` sobre
`admin/pages/` y `admin/components/` ya no devuelve ningún valor de la
paleta vieja (`#e5e7eb`, `#9ca3af`, `#f9fafb`, `#2563eb`, `#1d4ed8`,
`#111827`, `#1f2937`) — los hits que queden son solo los semánticos de la
sección 4b de `analisis.md` (rojo/verde/ámbar) y el `#fcc424` de usuario.

## T32/03 — Dashboard: panel de 2 series "Catálogo vs Personalizado"

**Objetivo**: resolver el gap que ningún mockup cubre (`analisis.md`
sección 5) sin inventar un color nuevo.

**Alcance** (`DashboardPage.tsx`)
- Línea 216 (`Catálogo`): `background: "#2563eb"` → `background: "#F07058"`
  (coral, mismo valor que el default de `.dash-bar-fill`, pero mantenerlo
  explícito acá porque conviven con la barra "Personalizado").
- Línea 225 (`Personalizado`): `background: "#7c3aed"` → `background:
  "#1E2A4A"` (navy).
- Línea 246 (`Ventas por canal`, 3 barras del mismo color): sacar el
  `background: "#0891b2"` inline directamente — sin reemplazo, hereda el
  coral default de `.dash-bar-fill` que ya define `admin.css` tras la Tarea
  1. Confirmado en `analisis.md` sección 5 que esto no cambia el
  comportamiento actual (las 3 barras ya eran del mismo color).

**Criterio de aceptación**: en el panel "Catálogo vs Personalizado" las dos
barras se distinguen a simple vista (coral vs. navy); en "Ventas por canal"
las 3 barras se ven coral, igual de indistinguibles entre sí que antes
(sin regresión, sin empeora).

## T32/04 — `StockPage`: stat-cards + mover el formulario de movimiento

**Objetivo**: adoptar el markup concreto de `03-stock.html`
(`analisis.md` sección 6a), no solo la idea general de la spec.

**Alcance** (`StockPage.tsx`)
- Reemplazar el `.card` de líneas 171-185 (umbral + checkbox en una fila)
  por 3 `.stat-card` dentro de `.dash-grid.dash-grid-stats` (o
  `.stat-grid`, alias equivalente): "Variantes críticas" (valor
  `criticalCount`), "Umbral crítico" (el mismo `<form>`/`<input>`/botón de
  hoy, reubicado dentro del stat-card), "Solo críticos (N)" (el mismo
  checkbox de hoy, reubicado).
- Mover el `<MoveForm>` (líneas 244-261, hoy una fila de tabla expandible
  con `colSpan={7}`) a un `.card` propio debajo de `<table className="grid">`,
  con título `Registrar movimiento — {productName}, {talle} / {color}` —
  visible solo cuando `expanded?.mode === "move"`. El bloque de
  `<History>` (`mode === "history"`) puede quedarse donde está (la spec y
  el mockup solo hablan del formulario de movimiento, no del historial) o
  moverse junto por consistencia — a decidir al implementar, es un detalle
  menor sin impacto en el criterio de aceptación.
- El `style={{background:"#f9fafb"}}` de la fila expandida desaparece junto
  con el movimiento del formulario (ya cubierto por la Tarea 2 si esta
  tarea se hace después, o se resuelve acá directamente si se hace antes).

**Criterio de aceptación**: la fila de "Variantes críticas / Umbral / Solo
críticos" se ve como 3 tarjetas, no como una sola fila de formulario; hacer
clic en "Mover" en cualquier fila de la tabla muestra el formulario en una
tarjeta separada debajo de la tabla (no expande una fila), con el
producto/variante correcto en el título; guardar un movimiento sigue
funcionando igual que antes (mismo POST, mismo refresh de la tabla).

## T32/05 — `FinanzasPage`: resumen del mes como stat-cards

**Objetivo**: adoptar el patrón de `10-finanzas.html`, extendido a las 5
métricas reales en vez de las 3 que mockea el ejemplo (`analisis.md`
sección 6b — decisión tomada: no se pierde información).

**Alcance** (`FinanzasPage.tsx`)
- Reemplazar el bloque de texto en línea (líneas 285-299: Ingresos,
  Egresos, Balance, Ganancia bruta, Ganancia neta) por 5 `.stat-card`
  dentro de `.dash-grid.dash-grid-stats`, mismo patrón que Dashboard/Stock.
- Los colores semánticos de `MOVEMENT_TYPE_UI.income.color`/`.expense.color`
  (verde/rojo, `types.ts:325-326`) se mantienen sin cambios dentro del
  `.stat-card-value` de Ingresos/Egresos — no son color de marca
  (`analisis.md` sección 4b).

**Criterio de aceptación**: las 5 métricas se ven como tarjetas, sin haber
perdido ninguna respecto a la versión actual; Ingresos/Egresos conservan su
color semántico verde/rojo dentro de la tarjeta.

## T32/06 — Sidebar: nombre de la org en Cormorant Garamond

**Objetivo**: aplicar el único cambio tipográfico opcional que sugiere la
spec (`analisis.md` sección 7), ya resuelto en `admin-redesign.css:20`.

**Alcance**: ninguno más allá de lo que ya trae la Tarea 1 —
`.sidebar-brand h2 { font-family: 'Cormorant Garamond', serif; }` ya viene
en el archivo que se adopta. Esta tarea es solo la verificación puntual de
que se ve bien (nombre de org corto y largo, no se corta ni desborda el
sidebar de 220px).

**Criterio de aceptación**: el nombre de la organización en el sidebar se
ve en la tipografía serif, legible, sin desbordar el ancho del sidebar con
nombres largos (probar con el nombre real de al menos una org de prueba).

## T32/07 — Verificación final

**Checklist** (heredado del DoD de `spec-rediseno-admin.md`, sin cambios)

- [ ] Las 13 páginas de `admin/pages/` se ven con la paleta nueva.
- [ ] Verificación visual en vivo en al menos 3 pantallas además de Stock
      (ej. Dashboard, Pedidos, Clientes) — confirmar que el cambio se ve
      coherente en todo el panel, no solo donde se diseñó primero.
- [ ] `grep` de colores viejos (Tarea 2) no devuelve nada fuera de lo
      semántico.
- [ ] Estados semánticos (`.alert-warning`, `.hs-warn`, `.critical-row`,
      `.store-status`, deltas de stock/finanzas) se siguen distinguiendo
      del accent de marca — no todo es coral.
- [ ] Sidebar deslizable en mobile (≤768px) sigue funcionando igual que
      antes del cambio.
- [ ] `npx tsc --noEmit` limpio en `frontend/`.
