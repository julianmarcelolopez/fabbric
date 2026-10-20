# T37 — Fixes encontrados en vivo (demo con cliente real, 2026-10-20)

No es una fase planificada como T34-T36 (análisis → plan → tareas) — son
correcciones y ajustes puntuales, cada uno independiente de los demás,
pedidos/encontrados en la misma sesión en la que T36 (sugerencias de alta
por código de barras) se probó en producción con un cliente real de
Eliathi Modas escaneando prendas. Se documentan juntos acá, en vez de abrir
una carpeta `T<N>` por cada uno, porque ninguno tiene fases ni dependencias
entre sí — mismo criterio que los "Ad-hoc" sueltos del historial del
proyecto (ver memoria `project_fabbric_bordart`).

Todos ya están commiteados y pusheados a `main`, deployados en EasyPanel.

## 1. `QtyStepper` enviaba el formulario antes de tiempo

**Síntoma reportado:** "cuando cambias la cantidad de un producto nuevo a
cargar me pasa de pantalla directamente... no me da el tiempo a configurar
bien la cantidad."

**Causa:** los botones `+`/`−` de `pwa/src/components/QtyStepper.tsx` no
tenían `type="button"` — por default HTML los trata como `type="submit"`.
`QtyStepper` se usa dentro del `<form onSubmit={...}>` de `AltaScreen.tsx`
(línea 382), así que cada click en `+`/`−` disparaba el submit del
formulario completo en vez de solo cambiar el estado `qty`.

**Fix:** `type="button"` agregado en ambos botones
(`QtyStepper.tsx:20` y `:28`). `FichaScreen.tsx` usa el mismo componente
pero fuera de un `<form>`, así que ahí el bug nunca se manifestó — no
necesitó cambios.

## 2. Popup de confirmación al dar de alta

**Pedido:** "Cuando doy de alta un producto nuevo quiero que me avise con
un popup producto dado de alta correctamente."

**Implementación:** nuevo estado `showSuccess`
(`pwa/src/screens/AltaScreen.tsx:80`). `finish()` (que antes llamaba
`onDone()` directo al terminar, con o sin foto/publicación online) ahora
hace `setShowSuccess(true)`. Nuevo bloque de render (línea 212 en
adelante, antes del paso 2 de foto) muestra un overlay fijo con "✅
Producto dado de alta correctamente" y un botón "Aceptar" que recién ahí
llama a `onDone()` — el usuario tiene que confirmar que lo vio antes de
volver a la pantalla de escaneo.

## 3. Publicar en la tienda online, tildado por default

**Pedido:** "por default también quiero que en el catálogo se vea la
prenda nueva cargada... visible true por default."

**Causa de que no pasara ya:** el alta por escaneo siempre creó el
producto con `visibleInCatalog: false` (`backend/src/modules/products/routes.ts`,
`alta-rapida`) — quedaba visible recién si, en el paso de la foto, el
usuario tildaba a mano el checkbox "Publicar también en la tienda online"
(que fija `visibleInCatalog: true` **y** mueve `qtyOnline` unidades a
stock online — necesario porque stock online/local son contadores
independientes, no un pool compartido; publicar sin stock online deja el
producto visible pero no comprable).

**Fix elegido:** no se tocó el default del backend (seguiría dejando un
producto visible con 0 stock online si se hiciera ahí) — se cambió el
estado inicial del checkbox en el frontend:
`publicarOnline` pasa de `useState(false)` a `useState(true)`
(`AltaScreen.tsx:74`), con `qtyOnline` ya por default en 1 unidad. Sigue
siendo un checkbox editable: si un producto puntual no se quiere publicar
todavía, se puede destildar antes de terminar el alta.

## 4. Ojito para mostrar/ocultar contraseña (login de la PWA)

**Pedido:** "podes agregar un ojito en el login para el password."

**Implementación:** `pwa/src/LoginScreen.tsx` — nuevo estado
`showPassword`, el `<input>` de contraseña alterna entre
`type="password"`/`type="text"`, botón 👁️/🙈 superpuesto (`position:
absolute` dentro de un wrapper `position: relative`) que alterna el
estado. Solo se tocó el login de la PWA (`pwa/`) — el admin de escritorio
(`frontend/src/features/admin/pages/LoginPage.tsx`) tiene su propio login
y no fue parte de este pedido.

## 5. Admin → Productos: orden por default + búsqueda por código de barras

**Pedido:** "quiero que en la pantalla de productos aparezca por orden
default por fecha de ingreso descendente" + "me gustaría poder buscar un
producto por ingreso de código de barras."

**Orden por default**: ya existía la opción "Más recientes primero" en el
selector de orden de `frontend/src/features/admin/pages/ProductsPage.tsx`
(ordena por `createdAt` descendente) — solo hacía falta que fuera la
inicial. Cambiado `sortBy` de `useState<SortOption>("name")` a
`useState<SortOption>("recent")`.

**Búsqueda por código de barras**: el buscador de texto solo comparaba
contra `p.name`. `GET /admin/products` (`backend/src/modules/products/routes.ts`)
no traía los barcodes de las variantes (solo `variantCount`), así que se
agregó una consulta más (`barcodeRows`, variantes con `barcode` no nulo de
los productos listados) y un campo nuevo `barcodes: string[]` en la
respuesta — mismo patrón ya usado ahí para `variantCount`/`collections`/
`firstImageUrl` (una consulta aparte por `ids`, no un join gigante). El
tipo `ProductListItem` (`frontend/src/features/admin/types.ts`) suma ese
campo, y el filtro de `ProductsPage.tsx` ahora también matchea
`p.barcodes.some(b => b.toLowerCase().includes(q))`. Placeholder del
buscador actualizado a "Buscar por nombre o código de barras…".

## Verificación

- `tsc --noEmit` limpio en los 3 puntos tocados (`backend`, `frontend`,
  `pwa`) en cada fix.
- 1-4 verificados en vivo en producción por el usuario durante la demo con
  el cliente de Eliathi Modas.
- 5 (admin Productos) verificado solo por tipos al momento de escribir
  este doc — falta la verificación visual en navegador (criterio constante
  del proyecto, ver `feedback_fabbric_confirm_before_coding`).
