# Status — B001 Productos duplicados por modelo

Ver el problema completo (contexto, causa raíz, metodología de la
auditoría) en [`specs/B001_ProductosDuplicadosPorModelo.md`](specs/B001_ProductosDuplicadosPorModelo.md).
Este archivo es solo el estado y la solución — se actualiza a medida que
avanza, sin repetir el análisis.

## Estado general: 🔶 Parcial

| Grupo | Qué es | Estado |
|---|---|---|
| A | Mismo modelo, mismo nombre | ✅ Resuelto y fusionado en producción |
| B | Mismo modelo, nombre distinto | ⬜ Pendiente — decisión del usuario, caso por caso |
| C | Barcode sin "." (causa raíz de fondo) | ⬜ Pendiente — falta el fix de código |

## Grupo A — Resuelto (2026-11-02)

**Solución aplicada:** fusión directa en la base de datos (mismo patrón ya
usado en T37 para "1800" y "Remera básica R"): backup JSON completo antes
de tocar nada, reasignación de `product_id` de cada variante suelta al
producto canónico (el de más variantes), movida de imágenes si tenían, y
borrado del producto duplicado ya vacío. Verificado que no hubo colisión
de talle/color. Pedidos existentes no se tocan (referencian la variante
por `id`, no por producto).

**Resultado:**
- "Remera Básica R" (`40245773…`): 125 → **128** variantes (absorbió 3 productos sueltos).
- "Taverniti Jeans" (`d3e9fb19…`): 9 → **11** variantes (absorbió 2).
- "Rayada" (`4431acbe…`): 5 → **6** variantes (absorbió 1).

No quedó ningún archivo de código para commitear acá — fue una operación
de datos (SQL directo contra la DB real), no un cambio de código.

## Grupo B — Parcial (2026-11-02)

Se refinó el análisis comparando no solo el modelo sino el **color exacto**
(modelo+color = todo el prefijo antes del "."): si dos productos con
nombre distinto comparten el mismo modelo *y* el mismo color, el código de
barras es literalmente idéntico salvo el talle — eso ya no es una
sospecha, es certeza de que es la misma prenda partida en dos por un
nombre tipeado distinto. 3 de los 6 casos tenían esa coincidencia exacta y
se fusionaron; los otros 3 no comparten ningún color, así que siguen
pendientes de criterio humano.

| Modelo | Color compartido | Resultado |
|---|---|---|
| `13536` ("1800" / "Máster Gold") | `677` | ✅ Fusionado en "1800" — 3 variantes |
| `10218` ("Jeans" / "Summer") | `235` | ✅ Fusionado en "Summer" — 4 variantes |
| `08949` ("Liso" / "Encaje") | `602` | ✅ Fusionado en "Encaje" — 9 variantes |
| `21179` (Blusa Flor / Blush Flor) | ninguno | ⬜ Pendiente |
| `21620` (Micro pique / con cierre) | ninguno | ⬜ Pendiente |
| `08169` (Estampado / Liso V) | ninguno | ⬜ Pendiente |

Mismo procedimiento que el Grupo A (backup + transacción, canónico = el
de más variantes). Sin conflictos de talle/color en ninguno de los 3.

**Detalle a resolver**: en "1800", la variante que vino de "Máster Gold"
(talle 040, código de color `677`) quedó con el texto de color **"Marrón"**,
mientras las otras dos variantes del mismo código de color (034, 038) dicen
**"Azul"** — mismo código, nombre de color inconsistente. Pendiente de que
el usuario confirme si corresponde unificarlo a "Azul".

**Próximo paso:** el usuario revisa los 3 casos restantes de la tabla y
contesta caso por caso; recién ahí se fusiona lo que confirme que es un
duplicado real.

## Nuevo caso encontrado y resuelto vía la columna de código de barras (2026-11-02)

Con la columna "Código de barras" agregada a `/admin/products` (T39),
aparecieron 4 productos "Liso" (Cintos, Taverniti, $35.000) con barcodes
`07020-601-095/100/110/115` — formato con **guiones** en vez de punto
(otra variante del mismo problema de fondo del Grupo C: el parser solo
reconoce el "."). Modelo+color idénticos (`07020-601`), solo cambia la
medida del cinto — confirmado por el usuario como la misma prenda.

**Fusionado**: canónico `5f08d019…` (095, era el único visible en
catálogo — uno de los 4 duplicados, `775437ed…` 100, había quedado oculto).
Resultado: 1 producto, 4 variantes (095/100/110/115), visible. Backup
antes de fusionar, mismo procedimiento de siempre.

## Segundo caso "Liso" (Cintos) — resuelto, más complejo de lo que parecía (2026-11-02)

El usuario notó, mirando la columna de código de barras, que un "Liso"
(Cintos) tenía códigos con el segmento de color distinto (601/602/620) —
no solo la medida. Investigado: en realidad eran **3 productos "Liso"
distintos**, no 1:

| Producto | Modelo | Variantes |
|---|---|---|
| `da30bda8…` | `07020` | 6 — Negro×3 (602), Gris claro×1 (620), Blanca×2 (601) |
| `5f08d019…` | `07020` | 4 — Blanca×4 (601) — el fusionado en la vuelta anterior |
| `1a41e2d0…` | `29680` | 1 — Negro (105) — modelo distinto, mismo nombre por coincidencia |

`da30bda8` y `5f08d019` comparten modelo (`07020`) — 601/602/620 son los
3 colores reales de este cinto (Blanco/Negro/Gris claro), igual criterio
que "Remera Básica R" con decenas de colores bajo un solo producto. El
problema: habían quedado partidos en dos productos, **y 2 variantes
(Blanca/100cm, Blanca/110cm) existían duplicadas exactas en ambos**, cada
copia con su propio stock.

**Resuelto**: fusionados en `5f08d019` (8 variantes finales). Para los 2
pares duplicados, se **sumó el stock** de las dos copias en vez de
descartar una (ninguna tenía pedidos asociados, verificado antes de
tocar nada). El tercer "Liso" (modelo `29680`) queda sin tocar — mismo
caso que el Grupo D, nombre genérico compartido por un producto distinto.

## Regla de agrupado distinta para Cintos — corregido (2026-11-02)

El usuario corrigió un supuesto de fondo que veníamos usando en toda esta
sesión: para Remeras/Jeans, "modelo" son los primeros 5 dígitos y el
color son los 3 siguientes — mismo modelo + distinto color = mismo
producto (confirmado una y otra vez con "Remera Básica R", ~130
variantes, decenas de colores). **Para Cintos esa regla no aplica**: el
bloque COMPLETO antes del "." (sin separar en modelo+color) es la
identidad del producto — dos cintos con el mismo "modelo" de 5 dígitos
pero bloque completo distinto (ej. `07020601` vs `07020602`) son
**productos distintos**, no colores del mismo producto. El usuario
confirmó explícitamente que esto es **solo para Cintos**, no para
Remeras/Jeans.

Esto invalidaba la fusión de "Liso" hecha un rato antes en esta misma
sesión (ver más arriba) — se deshizo y se volvió a separar:

| Producto | Bloque completo | Variantes |
|---|---|---|
| "Liso" (queda igual) | `07020601` | 4 — Blanca |
| "Liso 2" (nuevo) | `07020602` | 3 — Negro |
| "Liso 3" (nuevo) | `07020620` | 1 — Gris claro |
| "Costura" (queda igual) | `29686602` | 2 — Negro |
| "Costura 2" (nuevo) | `29686620` | 2 — Gris claro |

Sin pedidos asociados a ninguna de estas variantes — separar fue seguro,
sin stock que reconciliar.

**De paso**, a pedido del usuario, se sacaron los guiones de los barcodes
de "Liso" (`07020-601-095` → `07020601.095`, etc.) para unificar el
formato con el resto (modelo+color pegados, "." antes del talle).

**Error propio durante este arreglo, corregido en el momento**: el primer
intento de sacar los guiones hizo un `replace(/-/g, "")` ciego, que
también borró el "." (dejó `07020601095` en vez de `07020601.095`,
rompiendo el barcode). Detectado y corregido antes de seguir — valores
reconstruidos a partir de los originales con guion, no hubo pérdida de
datos real (nunca se commiteó ni se dejó así).

## Fix de fondo: matching por categoría (2026-11-02) — ✅ Hecho

Implementado para que esto no vuelva a pasar en altas futuras:

- Migración `0029_split_barcode_color.sql`: `categories` suma
  `split_barcode_color` (boolean, default `true` — mantiene el
  comportamiento de siempre para todas las categorías existentes salvo
  que se apague explícitamente). Seteado a `false` para "Cintos" (SQL
  directo, mismo criterio manual que `custom_domain` en T38 — no hay UI
  para esto todavía).
- `backend/src/modules/products/routes.ts`, endpoint
  `GET /admin/products/suggest-by-barcode/:barcode`: la query ahora trae
  `categories.splitBarcodeColor` de cada variante candidata (join
  `product_variants → products → categories`). Al decidir si una
  variante existente cuenta como "mismo producto" que el código
  escaneado: si la categoría del candidato tiene `splitBarcodeColor =
  true` (default), alcanza con que coincida el modelo, igual que
  siempre; si es `false` (Cintos), **además** tiene que coincidir el
  color exacto — si no, no se considera el mismo producto aunque el
  modelo de 5 dígitos sea igual.
- La regla se evalúa por la categoría del **candidato existente**, no
  por una categoría todavía elegida en el alta (en ese momento no se
  sabe la categoría del código escaneado) — tiene sentido: la pregunta
  real es "¿esto es lo mismo que ESE producto ya cargado?", y esa
  categoría ya se sabe.

**Verificado contra la base real** (simulando la lógica exacta, sin pasar
por HTTP — no hay credenciales de admin válidas en `.env.local` para
probar con `curl`, ver nota en T39):
- Escanear un "Liso" color 601 (Blanca) nuevo → sugiere "Liso" (no "Liso 2"/"Liso 3"). ✅
- Escanear un "Liso" color 602 (Negro) nuevo → sugiere "Liso 2" (no "Liso"). ✅
- Escanear un "Liso" con un color nunca visto (699), mismo modelo → no sugiere ningún producto (correcto, no se puede asumir que es alguno de los existentes). ✅
- Escanear una "Remera Básica R" con un color nunca visto, mismo modelo → sigue sugiriendo "Remera Básica R" (Remeras no cambió de comportamiento). ✅

**Pendiente, fuera de esta vuelta**: no hay UI en el admin para marcar
`splitBarcodeColor` por categoría — se setea a mano por SQL cuando haga
falta (como con los dominios propios). Si se agregan más categorías con
esta misma necesidad, agregar un toggle en el admin de Categorías sería
lo próximo.

## Grupo D — Cerrado, no era este bug (2026-11-02)

Al pedir la columna "Código de barras" en `/admin/products`
(`frontend/src/features/admin/pages/ProductsPage.tsx`, nueva columna entre
"Categoría" y "Precio" — usa `p.barcodes` que el backend ya traía desde
T37) apareció un caso con pinta de duplicado: 10 filas "Estampado"
(Remeras, Taverniti, $25.000).

**Investigado y descartado como bug**: los 10 tienen `modeloCode`
distintos entre sí (ver `specs/`) — son prendas realmente distintas que
coinciden en un nombre genérico, no el mismo producto partido en varios.
No se fusiona nada. Cerrado como "no es un bug", documentado para no
reabrirlo por error si vuelve a aparecer.

## Grupo C — Pendiente

**Propuesta de fix** (no implementada todavía): en `AltaScreen.tsx` (PWA),
cuando el código escaneado/tipeado no matchea
`/^(\d+)(\d{3})\.(.+)$/` (mismo regex que `backend/src/lib/barcode.ts`),
mostrar un aviso visible al operador ("este código no tiene el formato
esperado, no se pudo chequear si el modelo ya existe") antes de guardar —
hoy falla en silencio y el alta sigue como texto libre sin avisar nada.

**Próximo paso:** implementar el aviso cuando el usuario lo confirme.
