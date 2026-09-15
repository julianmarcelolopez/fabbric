# Análisis — Rediseño visual del panel admin

Origen: `spec-rediseno-admin.md` y `mockups/` (14 pantallas HTML +
`admin-redesign.css`, ya existentes). Este análisis verifica esa spec contra
el código real (`frontend/src/features/admin/`) y contra los propios
mockups, y corrige/completa lo que la spec dejó como "revisar por si acaso"
u "opcional".

## 1. La premisa central de la spec se confirma: es 90% CSS

Comparé los selectores de `admin.css` (183 líneas) contra
`mockups/admin-redesign.css` (189 líneas): son **el mismo archivo con los
mismos selectores**, solo cambian los valores de color/tipografía, más 3
selectores nuevos (`.stat-card`, `.stat-card-label`, `.stat-card-value`,
definidos como alias de `.dash-card*`, ver sección 6). No hay reordenamiento
ni selectores eliminados.

También comparé las clases que usan los 14 mockups (`class="..."` en los
`.html`) contra las clases que ya define `admin.css`: **la única clase
usada en los mockups que no existe hoy es `.stat-card*`** (aparece en
`03-stock.html` y `10-finanzas.html`, nunca en las otras 12 pantallas). Esto
confirma la afirmación de la spec de que el 90% del trabajo es reemplazar
valores en un solo archivo — y acota con precisión dónde está el 10%
restante (secciones 5 y 6).

`AdminLayout.tsx` (sidebar, `.sidebar-brand`, `.nav-group`) ya tiene
exactamente la estructura que asume `admin-redesign.css` — no hace falta
tocar ese archivo salvo por el cambio tipográfico opcional (sección 7).

## 2. `admin-redesign.css` no es un mockup a traducir — es el reemplazo

A diferencia de un mockup típico, `mockups/admin-redesign.css` ya está
escrito con los selectores reales del proyecto, ya trae los comentarios que
justifican cada decisión semántica (ej. línea 32: *"Semáforo real de estado
de tienda — no es color de marca, se deja como está"*), y ya declara el
alias `.stat-card` sin romper `.dash-card`. Es, en la práctica, un
`admin.css` nuevo listo para pisar el actual — no hay que "traducir" la
paleta de la tabla de la spec a CSS, ese trabajo ya está hecho y ya coincide
con la tabla. Ver decisión de tarea en `plan.md` T32/01.

## 3. Tipografía: no hay nada que tocar en `index.html`/`AdminLayout.tsx`

Confirmado (`frontend/index.html:16`): el `<link>` de Google Fonts ya carga
`DM Sans` y `Cormorant Garamond` globalmente desde T20/01 (comentario en la
línea 9 lo dice explícitamente). El admin ya tiene ambas tipografías
disponibles sin agregar nada — la pregunta abierta que dejaba la spec
("confirmar si `index.html` ya lo carga") queda resuelta: sí, ya está.

## 4. El grep de la spec es incompleto — inventario real de colores hardcodeados

La spec sugiere (sección "Revisar por si acaso"):

```bash
grep -rn "#2563eb\|#1d4ed8\|#111827\|#1f2937" frontend/src/features/admin/pages/
```

Ese patrón solo busca el **azul viejo**. Correrlo tal cual encuentra un solo
hit real (`DashboardPage.tsx:216`). Pero el problema no es solo el azul: es
cualquier color de la paleta vieja escrito inline en vez de venir de una
clase. Corrí un grep más amplio (`#[0-9a-fA-F]{3,6}` sobre
`admin/pages/` y `admin/components/`) y clasifiqué cada hit:

### 4a. Cambian (fuga de la paleta vieja, fuera del alcance del grep de la spec)

| Archivo:línea | Valor actual | Motivo |
|---|---|---|
| `DashboardPage.tsx:216` | `#2563eb` | Accent viejo en una barra de `dash-bar-fill` — **este sí lo agarra el grep de la spec**, pero requiere una decisión extra, ver sección 5. |
| `MyStorePage.tsx:404,483,577` | `#e5e7eb` / `#fff` | Borde/fondo viejo repetido 3 veces en `style={{}}` inline, mismo valor que el borde genérico que `admin.css` ya centraliza. |
| `MyStorePage.tsx:765` | `#e5e7eb` | Idem. |
| `TaxonomyManager.tsx:259` | `#e5e7eb` | Idem, en un componente compartido (no una page). |
| `StockPage.tsx:246` | `#f9fafb` | Fondo de la fila expandida (`<td colSpan={7} style={{background:"#f9fafb"}}>`) — es el gris viejo de `.grid th`, no el fondo de página. |
| `FinanzasPage.tsx:205,222,413` | `#9ca3af` | **Corrección tras implementar la Tarea 2**: no es texto muted (esa era mi lectura inicial, incorrecta) — es el color por defecto del punto de color de una "cartera" (`wallet.color ?? "#9ca3af"`, `mov.walletColor ?? "#9ca3af"`) cuando no tiene uno asignado. Mismo patrón que `#fcc424` (sección 4c), pero acá el valor es un gris neutro genérico, no una sugerencia de marca — se actualiza a `#8A8278` para que el "sin color" de una cartera nueva no se vea como un resabio de la paleta vieja, sin que eso implique tocar ningún dato. |

Estos 8 hits no aparecen en el grep de la spec porque son grises/violetas
viejos, no el azul `#2563eb`/`#111827` — pero son el mismo tipo de
problema (copia local de un valor que `admin.css` ya centraliza) y hay que
barrerlos igual para que el DoD ("las 13 páginas se ven con la paleta nueva
sin tocar su JSX") no quede roto por 6 archivos con `style={{}}` inline.

### 4b. NO cambian (semánticos, correctamente fuera de alcance — confirmado, no solo supuesto)

| Archivo:línea | Valor | Por qué se queda |
|---|---|---|
| `StockPage.tsx:107` | `#b91c1c` / `#15803d` | Delta de movimiento de stock (± rojo/verde) — mismo criterio que `.error`/`.success`. |
| `FinanzasPage.tsx` (`MOVEMENT_TYPE_UI`, `types.ts:325-326`) | `#15803d` / `#b91c1c` | Ingreso/egreso — mismo par rojo/verde semántico, ya centralizado en una constante (no hace falta tocarlo). |
| `ProductsPage.tsx:192` | `#fffbeb` / `#92400e` | Ámbar de advertencia, mismo valor que `.alert-warning` (duplicado inline en vez de reusar la clase, pero no es un color de marca — no se toca). |
| `ProductEditPage.tsx:244` | `#fef3c7` / `#92400e` | Ámbar, mismo criterio que `.hs-warn`. |

### 4c. Fuera de alcance por completo (no es color de UI del admin)

`FinanzasPage.tsx:40` — `#fcc424` es el valor **por defecto de un campo
editable por el usuario** (color de una "cartera" nueva, ej. amarillo de
Mercado Pago). No es parte del cromado del admin, es un dato de negocio —
no se toca.

## 5. Gap real que la spec no cubre: el gráfico de 2 series del Dashboard

`DashboardPage.tsx` tiene un panel "Catálogo vs Personalizado"
(líneas 206-231) que compara **dos series** con dos colores distintos
(`#2563eb` catálogo / `#7c3aed` personalizado, línea 216 y 225). El mockup
`01-dashboard.html` no cubre este caso: sus paneles de ejemplo ("Más
vendidos", "Ventas por canal") son de **una sola serie**, así que ninguna
barra lleva color inline — todas heredan el default de
`.dash-bar-fill { background: #F07058 }` (coral) que ya define
`admin-redesign.css:173`.

Si simplemente se borra el `background` inline de las dos barras de
"Catálogo vs Personalizado" (como sí es correcto hacer en "Ventas por
canal", ver abajo), las dos series quedan del mismo color coral y la
comparación deja de ser legible — una regresión que ningún mockup iba a
detectar porque ninguno mockeó este panel con datos de 2 series.

**Decisión de este análisis**: usar los únicos dos colores de marca que ya
existen en la paleta nueva — coral (`#F07058`, ya es el default de
`.dash-bar-fill`) para "Catálogo", navy (`#1E2A4A`, ya es el color del
sidebar/`h1`) para "Personalizado". No se inventa un tercer color nuevo
para esto, cumpliendo el principio de la spec ("no se inventan colores
nuevos").

Nota aparte, sin relación con el rebrand: en "Ventas por canal"
(`DashboardPage.tsx:236-253`) las 3 barras (online/local/sin canal) ya usan
hoy el mismo `#0891b2` repetido en las 3 — es decir, ya son indistinguibles
por color, se diferencian solo por la etiqueta. Borrar ese inline y dejar
que hereden el coral default de `.dash-bar-fill` no cambia ese
comportamiento (siguen siendo todas del mismo color) — es un cambio seguro,
a diferencia del panel de 2 series.

## 6. Los cambios "estructurales opcionales" de la spec ya están decididos en los mockups

La spec los presenta como opcionales y de bajo impacto (sección "Cambios
estructurales puntuales"), pero los mockups no se quedaron en la idea
general — ya construyeron el markup concreto. Encontré 2 casos, y un
desajuste de alcance en uno de ellos que hay que resolver antes de picar
código:

### 6a. `StockPage.tsx` — confirmado con el código real

- El formulario "Registrar movimiento" hoy vive inline en una fila de tabla
  que se expande (`StockPage.tsx:244-261`, `<tr>` con
  `<td colSpan={7} style={{background:"#f9fafb"}}>`) — confirmado
  exactamente como lo describe la spec.
- `03-stock.html` (líneas 97-114) lo muestra como un `.card` aparte, debajo
  de la tabla, con el nombre del producto/variante en el título
  ("Registrar movimiento — Jeans holgados, S / Azul") — coincide con lo que
  sugiere la spec.
- Además, `03-stock.html` (líneas 60-76) agrega una fila de 3 `.stat-card`
  ("Variantes críticas", "Umbral crítico" con su input+botón, "Solo
  críticos" con el checkbox) reemplazando el `.card` plano que hoy agrupa
  umbral+checkbox (`StockPage.tsx:171-185`). Esto es lo único que usa las
  clases nuevas `.stat-card`/`.stat-card-label`/`.stat-card-value` —
  confirmado en la sección 1, ya están definidas en `admin-redesign.css`
  como alias de `.dash-card*`, no hace falta CSS nuevo.

### 6b. `FinanzasPage.tsx` — mismo patrón, pero con un desajuste de alcance a resolver

`FinanzasPage.tsx:285-299` hoy muestra el resumen del mes como texto en
línea, **5 métricas**: Ingresos, Egresos, Balance, Ganancia bruta, Ganancia
neta. `10-finanzas.html` (líneas 52-56) lo muestra como 3 `.stat-card`
(Ingresos, Egresos, Balance) — **el mockup no mockeó Ganancia bruta ni
Ganancia neta**, no porque se haya decidido sacarlas, sino porque el mockup
es un ejemplo simplificado (no hay ninguna nota en la spec ni en el mockup
que diga "se elimina esta información").

**Decisión de este análisis**: extender el patrón a las 5 métricas reales,
no truncar a las 3 del mockup — sacar información que hoy existe no es un
cambio de piel, es un cambio de alcance que nadie pidió. `.stat-grid` (alias
de `.dash-grid-stats`, ya definido) soporta cualquier cantidad de tarjetas
sin cambios de CSS.

## 7. Cambio tipográfico del sidebar — confirmado como el único lugar con sentido

`admin-redesign.css:20` aplica `'Cormorant Garamond', serif` a
`.sidebar-brand h2` (nombre de la org). Es consistente con la sugerencia
opcional de la spec y con el uso que ya le da la tienda pública a esa
familia tipográfica (T20/01) — sin tocar la legibilidad del resto del
admin, que sigue en DM Sans. Se adopta.

## 8. `LoginPage.tsx` confirmado limpio

No apareció en ningún grep de colores hardcodeados — es 100% dependiente de
`admin.css` (`.card`, `.btn`, `input`, `.error`), consistente con
`14-login.html`. No necesita ninguna tarea propia más allá de heredar el
cambio de paleta base.

## 9. Alcance heredado de la spec, sin cambios

- La tabla de mapeo de colores (sección "Paleta — mapeo exacto") se adopta
  tal cual — ya está implementada en `admin-redesign.css`.
- Lo que **no** cambia (`.alert-warning`, `.hs-warn`, `.onboarding-tag`,
  `.critical-row`, `.store-status`, badge genérico → gris neutro en vez de
  coral) se confirma sin cambios, ver sección 4b.
- El breakpoint mobile de 768px no se toca — `admin-redesign.css` conserva
  exactamente la misma media query que `admin.css` (mismos selectores,
  mismos valores de layout, solo cambian 2 colores de fondo). Riesgo de
  regresión mobile: bajo, pero igual se verifica en vivo (ver `plan.md`
  T32/07).
- Definition of Done de la spec (13 páginas con paleta nueva sin tocar JSX
  salvo los 2 casos estructurales, `tsc --noEmit` limpio, mobile intacto,
  semántica preservada, verificación visual en ≥3 pantallas) se adopta tal
  cual como criterio general del plan.
