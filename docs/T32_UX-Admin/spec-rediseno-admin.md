# Spec — Rediseño visual del panel admin

**Para:** Claude Code, trabajando sobre `julianmarcelolopez/fabbric`
**Contexto:** el panel admin usa hoy una paleta azul genérica de dashboard (`#2563eb`, `#111827`), distinta de la identidad de marca que T13/T20 ya aplicaron a la tienda pública (navy `#1E2A4A`, coral `#F07058`). Esta spec traslada esa identidad al admin — es un cambio de piel (color, tipografía, jerarquía), **no de estructura ni de lógica**.

## Por qué esto es de bajo riesgo

El 90% del estilo vive en un solo archivo: `frontend/src/features/admin/admin.css` (183 líneas), con clases compartidas por las 13 páginas de `frontend/src/features/admin/pages/`. Cambiar los valores de esas clases alcanza para que las 13 hereden el cambio — no hace falta tocar cada `*Page.tsx` para el 90% del trabajo. Los pocos lugares con color hardcodeado inline (si existen) se listan aparte, en la sección "Revisar por si acaso".

## Paleta — mapeo exacto

Fuente: los tokens reales de la tienda pública (`frontend/src/features/catalog/catalog.css`, tarea T20/01). No se inventan colores nuevos — se reutilizan los que ya existen en el proyecto.

| Uso | Valor actual (admin.css) | Valor nuevo |
|---|---|---|
| Sidebar bg | `#111827` | `#1E2A4A` (navy de marca) |
| Sidebar hover (no activo) | `#1f2937` | `rgba(248,247,245,0.08)` |
| **Accent / interactivo** (link activo del sidebar, `.btn.primary`, foco de inputs, links) | `#2563eb` / hover `#1d4ed8` | `#F07058` (coral de marca) / hover `#D85A30` |
| Foco de inputs (outline) | `#bfdbfe` | `#FDF1EE` (coral claro) |
| Fondo de página (`body`) | `#f6f7f9` | `#F8F7F5` |
| Fondo de tabla / header de tabla | `#fff` / `#f9fafb` | sin cambio (queda blanco puro sobre el fondo crema — más contraste, mismo criterio que usa `catalog.css`) |
| Bordes (`#e5e7eb`, `#eef0f2`, `#d1d5db`) | — | `#E8E4DF` |
| Texto principal (`#1a1a1a`) | — | `#2C2C2C` |
| Texto secundario/muted (`#6b7280`, `#9ca3af`) | — | `#8A8278` |
| Tipografía | `system-ui, -apple-system, "Segoe UI", sans-serif` | `'DM Sans', system-ui, sans-serif` (agregar el `<link>` de Google Fonts si no está ya cargado globalmente — confirmar si `index.html` ya lo carga por la tienda pública, en cuyo caso no hace falta nada nuevo) |

### Lo que **NO** cambia (a propósito)

Estos colores son semánticos, no de marca — cambiarlos rompe la legibilidad funcional, no la mejora:

- `.alert-warning`, `.hs-warn`, `.onboarding-tag` → quedan ámbar (`#fffbeb`/`#92400e` y similares). Es "atención", no "marca".
- `.critical-row` (`#fef2f2`) y cualquier rojo de peligro/cancelado → queda rojo. El coral de marca ya se usa para interactivo; si además se usa para "crítico", se pierde la distinción entre "hacé clic acá" y "esto está mal".
- `.store-status` verde/rojo (tienda activa/inactiva) → queda como está, es un semáforo de estado real.
- `.badge` genérico (`#eef2ff`/`#3730a3`, indigo) → puede quedar neutro (gris) en vez de indigo, pero no pasa a coral por la misma razón que `.critical-row`.

## Cambios estructurales puntuales (opcionales, bajo impacto)

- **Reusar `.dash-card` / `.dash-grid-stats`** (ya existen, hoy solo se usan en `DashboardPage.tsx`) como patrón de "chips de contexto" en otras pantallas con tabla — ej. `StockPage.tsx` (variantes críticas, umbral) o `OrdersPage.tsx` (totales del período). Si se quiere usar fuera del Dashboard, renombrar a algo genérico (`.stat-card`, `.stat-grid`) para que el nombre no confunda — se puede hacer como alias sin romper el uso actual.
- **`StockPage.tsx`**: el formulario de "Registrar movimiento" hoy se renderiza inline dentro de la fila de la tabla (una fila normal que se expande). Considerar moverlo a un `.card` propio debajo de la tabla, con el nombre del producto/variante como título — mismo componente `.card` que ya existe, sin CSS nuevo.
- **Sidebar**: `.sidebar-brand h2` (nombre de la org) podría pasar a una tipografía serif liviana (`Cormorant Garamond`, ya cargada para la tienda) para dar un toque de marca sin tocar la legibilidad del resto — opcional, es el único lugar donde tendría sentido una serif en el admin.

## Archivos a tocar

- `frontend/src/features/admin/admin.css` — el cambio principal, casi todo el trabajo.
- `frontend/src/features/admin/AdminLayout.tsx` — solo si se hace el cambio tipográfico del `.sidebar-brand h2`, o si se agrega el `<link>` de Google Fonts acá en vez de en `index.html`.
- `frontend/index.html` — verificar si `DM Sans`/`Cormorant Garamond` ya están cargados globalmente (T20/01 los agregó para la tienda pública); si el `<link>` está en `index.html` y no en un archivo específico de la tienda, el admin ya los tiene disponibles sin tocar nada.

## Revisar por si acaso (color hardcodeado fuera de admin.css)

Antes de dar por completo el cambio, correr algo como:

```bash
grep -rn "#2563eb\|#1d4ed8\|#111827\|#1f2937" frontend/src/features/admin/pages/
```

para confirmar que ningún `*Page.tsx` tiene el azul viejo hardcodeado en un `style={{ }}` inline en vez de venir de una clase de `admin.css`. Si aparece algo, se lista acá y se corrige aparte.

## Definition of Done

- Las 13 páginas de `frontend/src/features/admin/pages/` se ven con la paleta nueva sin haber tocado su JSX (salvo los cambios estructurales puntuales que se decidan aplicar).
- `tsc --noEmit` limpio en frontend.
- `admin.css` sigue funcionando en mobile (el breakpoint de 768px de T19/01 no se rompe — probar el sidebar deslizable después del cambio).
- Los estados semánticos (crítico, advertencia, éxito, tienda activa/inactiva) se siguen distinguiendo visualmente del accent de marca — no todo es coral.
- Verificación visual en al menos 3 pantallas distintas (ej. Dashboard, Stock, Pedidos) además de la que ya se mockeó (Stock), para confirmar que el cambio se ve coherente en todo el panel y no solo en la pantalla donde se diseñó primero.

## Referencia visual

El mockup de `StockPage` ya validado en esta conversación (fondo crema, sidebar navy, accent coral, filas críticas con tinte suave, badge "crítico" en ámbar/rojo — no coral, corregido en esta spec) es la referencia de dirección. No es pixel-perfect — es la dirección de diseño a aplicar de forma consistente en el resto de las pantallas usando esta tabla de mapeo.
