# B001 — Productos duplicados del mismo modelo (código de barras sin matchear)

**Estado:** 🔶 Parcial — Grupo A (abajo) resuelto y fusionado en producción.
Grupo B pendiente de decisión del usuario. Grupo C (causa raíz de fondo)
pendiente de fix de código.

**Reportado:** 2026-11-02, revisando la tienda pública (`eliathimodas.com/c/ofertas`)
y el admin (`/admin/products?...tab=marcas`) — dos "Ser epicos" (Taverniti,
$65.000) como fichas separadas, y en Productos filtrado por "Jeans" dos
filas "Energy" (Taverniti, $55.000) como productos distintos.

## Contexto

T36/T37 (ver `docs/T36_AltaPorCodigoDeBarras/` y
`docs/T37_FixesSesionDemoEnVivo/README.md#12`) ya habían resuelto el bug
de que el alta por escaneo *creara* un producto nuevo aunque hubiera una
sugerencia de modelo ya existente — ahora si el modelo sugerido matchea y
no se edita, la variante se agrega al producto existente
(`POST /admin/products/:id/variants`) en vez de crear uno nuevo. Ese fix
sigue funcionando correctamente (confirmado en este mismo análisis: el
modelo `09234` acumuló 125 variantes en un solo producto sin problema).

Este bug es distinto: el matching **solo puede funcionar si el código de
barras tiene el formato esperado** (`modelo` + 3 dígitos de `color` + "." +
`talle`, ver `backend/src/lib/barcode.ts`). Cuando el código escaneado o
tipeado no tiene el "." — por typo, corte del escaneo, o porque la
prenda trae un código de otro formato — `parseBarcode` devuelve `null` y
el alta cae al camino de texto libre (por diseño, ver
`docs/T36_AltaPorCodigoDeBarras/analisis.md`, "Fuera de alcance": *"Validar/
rechazar barcodes que no matcheen el formato — se ignoran silenciosamente"*).
Esa decisión original era correcta para no romper el alta con barcodes
raros, pero tiene un efecto secundario no contemplado: **el operador no se
entera de que el código no matcheó**, así que si el modelo ya existía, no
hay ningún aviso — se crea un duplicado en silencio.

## Metodología

Auditoría completa de la org (no solo los dos casos reportados): se trajeron
todas las variantes con `barcode` no nulo, se parsearon con la misma regex
de `backend/src/lib/barcode.ts`, y se agruparon por `modeloCode`. Cualquier
`modeloCode` que aparece en más de un `product_id` es un duplicado real o
potencial. Aparte, se listaron todas las variantes cuyo barcode no matchea
el formato en absoluto (sin ".") — esas nunca pudieron participar del
matching, sea cual sea su modelo real.

## Hallazgos

### Grupo A — mismo modelo, mismo nombre: confirmado duplicado, YA FUSIONADO

| Modelo | Producto canónico (quedó) | Productos sueltos (se fusionaron y borraron) |
|---|---|---|
| `09234` | "Remera Básica R" (`40245773-59d0-4f9f-bac9-fc9747eeb31a`) — 125→**128** variantes | `123dd2bd…` (09234601.S), `b851de31…` (09234602.S), `a8bb895f…` (09234611.S) |
| `23326` | "Taverniti Jeans" (`d3e9fb19-7256-47f9-b0bc-0bb95d54158e`) — 9→**11** variantes | `2f41e170…` (23326601.S), `0801248e…` (23326602.S) |
| `23094` | "Rayada" (`4431acbe-03d6-4dbb-b534-43604541404d`) — 5→**6** variantes | `41aff776…` (23094601.S) |

**Cómo se arregló** (mismo patrón ya usado en T36/T37: backup JSON +
transacción por grupo): se reasignó `product_id` de cada variante suelta al
producto canónico, se movieron sus imágenes (si tenían), se verificó que no
hubiera colisión de talle/color (no hubo ninguna: las 6 variantes sueltas
eran todas talle `S` de colores que el canónico no tenía todavía), y se
borró el producto duplicado vacío. Pedidos existentes no se tocan —
referencian la variante por `id`, que no cambia, solo cambia a qué
producto pertenece (mismo criterio que la fusión de "1800" y "Remera
básica R" en T37). Backup completo en el scratchpad de la sesión antes de
tocar nada.

### Grupo B — mismo modelo, nombre DISTINTO: pendiente de decisión

Mismo `modeloCode` en dos productos, pero nombrados distinto — no se
fusionó nada acá, necesita que una persona confirme si es la misma prenda
mal nombrada dos veces, o si el proveedor reusa el mismo prefijo de modelo
para prendas realmente distintas (pasa con proveedores que no garantizan
unicidad global del código):

| Modelo | Nombre A (variantes) | Nombre B (variantes) | Lectura |
|---|---|---|---|
| `21179` | Blusa Flor (2) | Blush Flor (4) | Probable typo del mismo producto ("Blush"↔"Blusa") |
| `21620` | Micro pique (1) | Micro pique **con cierre** (12) | Dudoso — "con cierre" puede ser una prenda distinta |
| `13536` | 1800 (2) | Máster Gold (1) | Nombres sin relación — probable reuso de modelo por el proveedor |
| `10218` | Jeans (1) | Summer (3) | Nombres sin relación |
| `08949` | Liso (1) | Encaje (8) | Diseños distintos (liso ≠ encaje) — probable reuso |
| `08169` | Estampado (2) | Liso V (23) | Diseños distintos — probable reuso |

### Grupo C — barcode sin "." — causa raíz de fondo, nunca pudo matchear nada

~19 variantes con barcode que no matchea `/^(\d+)(\d{3})\.(.+)$/` en
absoluto — desde typos evidentes (`"16710910"` vs `"16710639"` en
"Algodon", un dígito de diferencia) hasta formatos totalmente distintos
(`"8062684378877"` parece un EAN13 real, `"07020-601-100"` usa guiones en
vez de punto). Lista completa guardada en el historial de la sesión — no se
repite acá por extensión, son candidatos a revisar a mano si hace falta,
pero el verdadero arreglo es el de la próxima sección.

### Grupo D — mismo nombre, modelo DISTINTO en todos: no es este bug

Encontrado el 2026-11-02 al agregar la columna "Código de barras" a
`/admin/products` (ver `status.md`) y notar 10 filas "Estampado" (Remeras,
Taverniti, $25.000) en la lista.

**Diferencia clave con los Grupos A/B**: acá los 10 productos tienen
**modelos distintos entre sí** — ninguno se repite:

| Producto | modeloCode |
|---|---|
| `2139bca6…` | `18334` |
| `4a85cb75…` | `23388` |
| `46598140…` | `21222` |
| `1ca8a1b2…` | `20848` |
| `60c5fafc…` | `21344` |
| `9f6e4b60…` | `21524` |
| `8bd4c5a7…` | `20504` |
| `6e8ffc5e…` | `11939` |
| `718fa3bc…` | `08685` |
| `d1758056…` | `08887` |

**Conclusión: esto NO es el bug de B001.** El matching por código de
barras está funcionando correctamente — justamente porque cada modelo es
realmente distinto, el sistema correctamente los trató como productos
separados. El problema acá es otro, de naturaleza distinta: "Estampado" es
un nombre demasiado genérico (significa "con estampa", aplica a
cualquier remera con cualquier diseño impreso) — 10 prendas físicamente
distintas terminaron con el mismo nombre porque quien las cargó no les
puso un nombre que las diferencie. **No se debe fusionar nada acá** —
mezclaría inventario de prendas distintas. Si hace falta una solución, es
de otro tipo (ej. un nombre más descriptivo al cargar, o mostrar el
código de barras en la lista para diferenciarlas a simple vista — ya
resuelto agregando la columna "Código de barras" a `/admin/products`, ver
`status.md`).

## Pendiente

1. **Grupo B**: decisión del usuario, caso por caso (ver tabla) — no se
   toca hasta tener confirmación explícita, fusionar mal sería mezclar
   inventario de prendas distintas.
2. **Grupo C / causa raíz**: agregar un aviso en `AltaScreen.tsx` (PWA)
   cuando el código escaneado/tipeado no matchea el formato esperado — hoy
   `parseBarcode` devuelve `null` en silencio y el alta sigue como texto
   libre sin que el operador se entere de que no se pudo chequear contra
   modelos existentes. Sin este aviso, este mismo bug va a seguir
   apareciendo cada vez que un código venga mal formado.

## Criterio de cierre

- Grupo A: ✅ cerrado — verificado que los 3 productos canónicos tienen
  la suma correcta de variantes y que no quedó ningún producto huérfano con
  esos `modeloCode`.
- Grupo B: cerrado cuando cada fila de la tabla tenga una decisión
  explícita (fusionar o dejar separado) y, si corresponde, se haya
  fusionado con el mismo criterio que el Grupo A.
- Grupo C: cerrado cuando `AltaScreen.tsx` avise visiblemente al operador
  si el código escaneado no tiene el formato esperado, antes de guardar.
