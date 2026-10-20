# T36 — Sugerencias de alta a partir del código de barras

## Contexto

En el alta por escaneo (`pwa/src/screens/AltaScreen.tsx`, se abre desde
`App.tsx` cuando `/admin/variants/by-barcode/:code` responde 404 — el código
escaneado no existe todavía), el campo "Modelo" es hoy texto libre (línea
~294-300 antes de esta tarea): el usuario lo tipea cada vez, sin
autocomplete ni normalización. Esto es el mismo problema que tenía "Marca"
antes de T29 (texto libre → duplicados por typo o mayúscula/minúscula
distinta) — T29 lo resolvió con un catálogo propio (`brands`) y un `<select>`
con "Otra marca...". "Modelo" sigue sin ese catálogo: es el campo `name` de
`products`, sin tabla propia.

**Hallazgo clave (confirmado por el usuario con ejemplos reales):** el
código de barras físico de la prenda ya codifica modelo/color/talle, no hace
falta un catálogo nuevo para resolver el problema — alcanza con leer el
código. Ejemplos reales:

| Barcode escaneado | Modelo | Color | Talle |
|---|---|---|---|
| `01800640.034` | `01800` | `640` | `034` |
| `018005053.034` | `018005` | `053` | `034` |
| `00476535.034` | `00476` | `535` | `034` |

Regla, primera versión (incompleta): el color son siempre los 3 dígitos
inmediatamente antes del ".". El modelo es todo lo que queda antes de esos 3
dígitos de color — largo variable, no fijo en 5 (el segundo ejemplo tiene 6
dígitos de modelo, no 5).

**Corrección tras revisar datos reales de producción** (ver "Caso real
encontrado" más abajo): el talle, después del ".", **no siempre son 3
dígitos numéricos**. En remeras aparece como texto directo (`S`, `XL`), no
como código. Regla final: `/^(\d+)(\d{3})\.(.+)$/` — modelo (dígitos,
largo variable, resuelto por backtracking de `(\d+)` greedy) + color (3
dígitos) + "." + talle (cualquier texto no vacío, puede ser un código
numérico como `034` o el talle literal como `XL`).

## Caso real encontrado (producción, 2026-10-20)

El usuario reportó en vivo tres productos separados en `eliathi-modas` que
son en realidad la misma remera:

| Producto (`id`) | Nombre guardado | Barcode de su variante | Talle | Color |
|---|---|---|---|---|
| `581fa20c…` | "Remeras básicas R" | `09234323.S` | S | Roja |
| `5fdd27bf…` | "Remara básica r" | `09234602.XL` | Xl | Negra |
| `f7057e70…` | "Remera básica R" | `09234602.S` | S | Negro |

Confirma el diagnóstico original: `name` como texto libre permitió tres
grafías distintas del mismo modelo ("Remeras básicas R" / "Remara básica r"
/ "Remera básica R"), cada una creando un producto nuevo, los últimos dos
visibles ambos en la tienda (`visible_in_catalog: true`) como fichas
separadas.

Y sirvió para encontrar el bug de la regex: `09234602.XL` (Negra) y
`09234602.S` (Negro) comparten el mismo `modeloCode` (`09234`) y el mismo
`colorCode` (`602`) — son el mismo modelo/color, solo cambia el talle. Con
la regex original (que exigía 3 dígitos después del ".") ninguno de los tres
barcodes de esta tabla matcheaba, porque el talle acá es literal (`S`/`XL`,
no un código de 3 dígitos) — el endpoint de sugerencias no los habría
detectado como relacionados. Con la regex corregida, si alguien hubiera
escaneado `09234602.S` después de ya tener cargada `09234602.XL`, el sistema
habría sugerido el modelo/marca/categoría de "Remera básica R" en vez de
dejar tipear de nuevo.

**Limpieza de los 3 productos duplicados existentes**: no está incluida en
el alcance de T36 (que es prevención hacia adelante) — se resuelve aparte,
ver conversación/decisión del usuario sobre si fusionar estos tres productos
puntuales ahora.

El barcode ya se guarda en `product_variants.barcode` (`backend/src/db/schema.ts:197`,
nullable, único por org — `product_variants_org_barcode_unique`,
`schema.ts:212`). No hace falta ninguna migración: la información para armar
las sugerencias ya está en filas existentes, solo falta parsearla.

## Decisiones resueltas

1. Sí tienen que aparecer sugerencias (confirmado por el usuario) — no
   alcanza con normalizar mayúscula/minúscula del texto libre, que no
   resuelve duplicados reales (mismo modelo escrito distinto sigue siendo
   "distinto").
2. Las sugerencias son precarga editable, nunca un valor fijo/bloqueado: si
   el modelo (prefijo del código) ya existe, se precarga marca + modelo +
   categoría, pero el usuario puede corregirlas igual que si las hubiera
   tipeado. Mismo criterio para color/talle.
3. El color y el talle se sugieren de forma independiente del modelo: si el
   `colorCode` ya se usó antes (con cualquier modelo) se sugiere ese nombre
   de color, y lo mismo para `talleCode` — no hace falta que sea el mismo
   modelo para reconocer "este código de color siempre se llamó Negro".
4. Entre varias coincidencias posibles (mismo código usado con nombres
   distintos por error de carga), se toma la más reciente (`createdAt` más
   nuevo) — no hay forma de saber cuál es "la correcta", pero la más
   reciente es la mejor aproximación y es simple de calcular.

## Backend

Nuevo módulo `backend/src/lib/barcode.ts`:

```ts
const BARCODE_RE = /^(\d+)(\d{3})\.(.+)$/;

export type ParsedBarcode = { modeloCode: string; colorCode: string; talleCode: string };

export function parseBarcode(barcode: string): ParsedBarcode | null {
  const match = BARCODE_RE.exec(barcode.trim());
  if (!match) return null;
  const [, modeloCode, colorCode, talleCode] = match;
  return { modeloCode, colorCode, talleCode: talleCode.trim() };
}
```

Nuevo endpoint `GET /admin/products/suggest-by-barcode/:barcode` en
`backend/src/modules/products/routes.ts` (registrado antes del POST
`/admin/products/alta-rapida`, línea 174 en adelante):

- Parsea el barcode recibido con `parseBarcode`. Si no matchea el formato
  (barcode viejo sin esta codificación, o cualquier otro valor), devuelve
  `{ parsed: null, product: null, colorName: null, talleName: null }` — no
  es un error, el alta sigue funcionando como texto libre.
- Trae todas las variantes de la org con `barcode` no nulo (`isNotNull`,
  `drizzle-orm`), las parsea una por una en JS (no en SQL: el catálogo de una
  boutique es chico, cientos/miles de filas, no millones — no vale la pena
  la complejidad de resolver esto con `LIKE`/funciones de substring en
  Postgres) y busca, por separado, la variante más reciente cuyo
  `modeloCode` / `colorCode` / `talleCode` matchee.
- Si hay match de modelo, busca el producto completo (nombre, marca,
  categoría) para devolverlo.
- Respuesta: `{ parsed, product: {...} | null, colorName: string | null, talleName: string | null }`.

## Frontend (`AltaScreen.tsx`)

- Nuevo `useEffect` con dependencia `[barcode]` (corre una sola vez por
  instancia de pantalla, ya que `barcode` es fijo mientras la pantalla está
  montada): llama a `suggest-by-barcode` apenas se abre la pantalla.
- Si `product` viene en la respuesta: precarga `categoryId`, `modelo` (→
  `product.name`) y, si tiene marca, `brandSelectValue` + `marca`. Marca
  `modeloExistente = true` (para un aviso en la UI, pendiente de agregar en
  el JSX — ver Fuera de alcance de esta vuelta / Tarea 2).
- Si `colorName`/`talleName` vienen, precargan `color`/`talle`.
- Todos los campos siguen siendo los mismos `<input>`/`<select>` de
  siempre — no se bloquea ninguno, el usuario puede sobreescribir cualquier
  valor precargado antes de guardar.

## Qué NO cambia

- `POST /admin/products/alta-rapida` (el guardado real) no cambia — sigue
  recibiendo `name`/`newBrandName`/`brandId`/`talle`/`color` como texto,
  construidos a partir de lo que haya en el formulario (sugerido o
  tipeado).
- No se crea ninguna tabla nueva (ni para modelos, ni para mapear
  colorCode/talleCode → nombre) — todo se deriva en caliente de
  `product_variants.barcode` en cada request.
- El flujo por el otro lado (`/admin/variants/by-barcode/:code`,
  `variants/routes.ts:22` — cuando el código SÍ existe) no se toca.

## Fuera de alcance de T36

- Validar/rechazar barcodes que no matcheen el formato — se ignoran
  silenciosamente (sin sugerencias), el alta por texto libre sigue siendo el
  fallback.
- Migrar o corregir variantes viejas sin barcode o con barcode en otro
  formato — no se tocan, simplemente no participan de las sugerencias.
- Un catálogo propio de "modelos" (tabla dedicada, a la `brands`) — se
  decidió explícitamente no hacer eso: el código de barras ya es la fuente
  de verdad, no hace falta duplicarla en una tabla nueva.
- Mostrarle al usuario el desglose `modeloCode`/`colorCode`/`talleCode` en
  pantalla (el campo `parsed` de la respuesta queda disponible para esto a
  futuro, pero no se usa en la UI todavía).

## Criterios de aceptación

- Escanear un código con el mismo `modeloCode` que un producto ya cargado
  precarga marca/modelo/categoría en el formulario, editable.
- Escanear un código con un `colorCode`/`talleCode` ya usado antes (en
  cualquier modelo) precarga el nombre de color/talle correspondiente,
  editable.
- Escanear un código que no matchea el formato (u otro completamente nuevo,
  sin coincidencias) no rompe la pantalla — el formulario queda vacío como
  hasta ahora.
- `tsc --noEmit` limpio en `backend/` y `pwa/`.
