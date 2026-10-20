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

## 6. Limpieza de datos: borrado masivo del catálogo de Eliathi Modas

**Pedido:** "me gustaría eliminar todos los productos para cargarlos desde
0."

No es un cambio de código — fue una operación directa sobre la base de
producción (org `e40f82d5-2b75-49ce-a2e3-1bdf415d82b1`, slug
`eliathi-modas`, única org con productos; la otra org existente tenía 0).
Antes de borrar se confirmó con el usuario el alcance exacto: cascada sobre
variantes/imágenes/vínculos de colección, categorías/marcas/colecciones
intactas, historial de pedidos no se rompe (`order_items` ya guarda su
propio snapshot de nombre/talle/color/precio, independiente del producto —
ver `orderItems.productId`/`variantId` con `onDelete: "set null"` en
`backend/src/db/schema.ts:380-381`).

Se hizo con un script descartable (mismo patrón que T11/T12/T16/T34: `.mjs`
temporal contra la DB real vía `DATABASE_URL`, borrado después de usarlo):
1. Backup de productos+variantes+imágenes a un JSON en el scratchpad de la
   sesión (no versionado, no forma parte del repo).
2. `DELETE FROM products WHERE org_id = ...` (cascada).
3. Limpieza de las imágenes correspondientes en Supabase Storage (bucket
   `product-images`), mismo criterio que ya usa el `DELETE /admin/products/:id`
   de la API, aplicado en una sola pasada para los 11 productos en vez de
   uno por uno.

**Resultado:** 11 productos borrados (Remera taverniti, Remera Oversize
Negra, Remera Boxy Fit Roja, Zapatillas Deportivas, Campera de cuero, Jeans
Recto, Jeans holgados, Jeans Chupin, Chomba Rallada, Sweter de algodón,
Remera básica R), 15 imágenes limpiadas de Storage, catálogo en 0 productos
listo para recargar desde el scanner.

## 7. Admin → Pedido: desglose de pagos registrados

**Pedido:** "me gustaría agregar los pagos que realiza ahí por pedido" (en
la ficha de un pedido con saldo pendiente, T34).

Los pagos individuales de un pedido ya existían como filas de
`financial_movements` (`orderId` + `type: "income"` — el anticipo al crear
la venta local, y cada cobro de `/cobrar-saldo` después) pero
`GET /admin/orders/:id` solo devolvía el total agregado (`pagado`). Se
agregó un array `payments` a esa respuesta (`backend/src/modules/orders/routes.ts`,
join con `wallets` para el nombre del medio de pago, ordenado por fecha) y
una tabla nueva en `SaldoPendienteCard`
(`frontend/src/features/admin/pages/OrderAdminDetailPage.tsx`) que lista
cada cobro (fecha, medio de pago, detalle, monto) arriba del formulario
para registrar uno nuevo. Tipo `AdminOrderPayment` nuevo en
`frontend/src/features/admin/types.ts`.

## 8. PWA alta: elegir foto del carrete + recorte antes de subir

**Pedido:** "quiero poder elegir la foto en mi carrete o si saco la foto
poder editar una foto."

Dos partes:
- El input de foto de `AltaScreen.tsx` tenía `capture="environment"`, que
  en la mayoría de los celulares fuerza a abrir la cámara directo sin
  ofrecer la galería — sacado, así el picker nativo del celular ofrece
  ambas opciones.
- Nuevo paso de recorte entre elegir/sacar la foto y subirla: componente
  `pwa/src/components/ImageCropper.tsx` (usa `react-easy-crop`, nueva
  dependencia en `pwa/package.json`) — encuadre cuadrado (arrastrar +
  zoom) con botones "Elegir otra"/"Usar foto". Confirmado con el usuario
  que alcanzaba con recortar (no rotar/filtros) antes de construir esto.
  `AltaScreen.tsx` ya no llama a `handlePhoto` directo al elegir el
  archivo: guarda un object URL (`cropImageUrl`) y recién llama a
  `handlePhoto` con el blob recortado cuando se confirma el recorte.

## 9. Teclado numérico no dejaba escribir el "." del código de barras

**Síntoma reportado:** "cuando escribo el código de barras se abre el
teclado numérico pero no me deja ingresar punto '.'"

**Causa:** el input de "escribilo a mano" en `EscanearScreen.tsx:475`
(fallback manual cuando no se puede escanear/fotografiar) tenía
`inputMode="numeric"` — en la mayoría de los celulares ese modo muestra un
teclado de solo dígitos, sin tecla de punto. Los códigos de barras reales
sí llevan un "." (modelo+color`.`talle, ver `docs/T36_AltaPorCodigoDeBarras/analisis.md`),
así que no se podían escribir completos a mano.

**Fix:** `inputMode="decimal"` en vez de `"numeric"` — ese modo sí incluye
la tecla "." en el teclado nativo.

## 10. Tope de cantidad al stock disponible al vender

**Pedido:** "cuando vendo un producto me permite elegir una cantidad mayor
a la disponible y quiero que frene en la cantidad máxima."

**Causa:** `QtyStepper` (`pwa/src/components/QtyStepper.tsx`) no tenía
ningún tope superior — el botón "+" incrementaba sin límite. Dos lugares
lo usan para vender: `FichaScreen.tsx` ("Cantidad a vender", sin tope
contra `variant.stockLocal`, que ya se mostraba al lado como badge) y
`CarritoScreen.tsx` (el +/- de cada ítem ya en el carrito, que sí
consultaba el stock en vivo por variante pero solo lo usaba para mostrar
"no alcanza" en texto, nunca para frenar el botón).

**Fix:** `QtyStepper` suma una prop opcional `max` — el "+" se desactiva
al llegar a `max` (mismo criterio que ya usaba el "−" contra el mínimo 1)
y el label agrega "(máximo disponible)". `FichaScreen.tsx` le pasa
`max={variant.stockLocal}`; `CarritoScreen.tsx` no usa el componente (es
un +/- inline propio), así que el botón "+" ahí se deshabilita
directamente cuando `item.qty >= stock` (stock en vivo ya calculado en esa
pantalla, `liveStock[item.variantId]`).

## 11. "Confirmar venta" no obligaba a pasar por "Forma de pago"

**Pedido:** "necesito que valides que cuando pongo 'confirmar venta' en el
carrito me tiene que obligar a pasar por la sección 'formas de pago'. Hoy
en día me confirma la venta sin haber pasado por 'formas de pago'."

**Causa:** `medioPago` (estado levantado a `App.tsx`) siempre arranca con
un valor por default (ej. "efectivo"), así que el botón "Confirmar venta"
de `CarritoScreen.tsx` nunca lo veía como "incompleto" — se podía confirmar
sin haber tocado nunca la pestaña "Forma de pago", usando el medio de pago
por default sin que el vendedor lo haya elegido a propósito.

**Fix:** nuevo estado local `visitedPago` (`CarritoScreen.tsx`), que pasa a
`true` recién cuando se hace click en la pestaña "Forma de pago". Se suma
a `confirmBlocked` (junto a `facturaIncompleta`/`anticipoIncompleto`, que
ya bloqueaban el botón por otras razones) — con un aviso en rojo arriba
del botón: `Revisá "Forma de pago" antes de confirmar.`

## 11b. El fix de "Forma de pago" (11) no alcanzaba — corregido

**Reporte del usuario:** "la venta se confirma igual sin obligarte a pasar
por formas de pago... quiero que más allá de la leyenda 'recordá
confirmar forma de pago' quiero que obligue a seleccionar una forma de
pago... no quiero que pueda confirmar la venta sin esto."

**Causa real del fix anterior (11) insuficiente:** ese fix solo exigía
haber *abierto* la pestaña "Forma de pago" (`visitedPago`), pero
`medioPago` (`App.tsx:56`) arrancaba con el valor por default
`"efectivo"` — ya "elegido" sin que el vendedor lo haya tocado, así que
abrir la pestaña no forzaba ninguna decisión real. Peor: tras cada venta
se reseteaba a `"efectivo"` de nuevo (línea ~158), no a un estado vacío,
así que el problema se repetía en cada venta nueva, no solo en la primera.

**Fix correcto:** `medioPago` pasa a `VentaLocalMedioPago | null`, arranca
en `null` y se resetea a `null` (no a `"efectivo"`) después de cada venta.
`confirmVenta()` (`App.tsx`) tiene una guarda `if (!medioPago) return;` al
principio. `CarritoScreen.tsx`: se saca el `visitedPago` del fix anterior
(quedó redundante) y `confirmBlocked` ahora chequea directamente
`medioPago == null` — con los botones de medio de pago sin ninguno
resaltado hasta que se elija uno de verdad, el tab "Forma de pago" muestra
un "⚠" mientras no se eligió, y el aviso pasa a "Elegí una forma de pago
antes de confirmar."

## 12. T36 seguía duplicando productos — la sugerencia nunca evitaba crear uno nuevo

**Reporte del usuario:** en la tienda pública, dos productos "1800"
(Taverniti) distintos para lo que debería ser un solo modelo con 2
variantes de color — "son variantes distintas, se entiende?"

**Causa real (bug de diseño de T36, no un detalle menor):** el endpoint
`suggest-by-barcode` sí detectaba correctamente que el segundo código
(`01800640.034`) compartía `modeloCode` (`01800`) con un producto ya
cargado (`01800505.034`) — y `AltaScreen.tsx` sí precargaba marca/modelo/
categoría en el formulario. **Pero el botón "Guardar producto" seguía
llamando siempre a `POST /admin/products/alta-rapida`**, que *siempre*
inserta un producto nuevo — la sugerencia nunca se traducía en "agregar la
variante al producto existente". O sea, T36 solo resolvía el problema de
tipeo/normalización, no el de duplicados — que era el motivo original del
pedido.

**Fix:**
- `createVariantSchema` (`packages/shared/src/schemas/variant.ts`) suma un
  campo `barcode` opcional — faltaba (solo estaba en `updateVariantSchema`),
  así que una variante creada por `POST /admin/products/:id/variants`
  nunca podía participar de las sugerencias ni encontrarse por
  `by-barcode`.
- Ese mismo endpoint (`backend/src/modules/variants/routes.ts`) ahora
  atrapa el conflicto de barcode duplicado (409), mismo criterio que
  `alta-rapida`.
- `AltaScreen.tsx`: nuevo estado `matchedProductId` (el id del producto
  sugerido). `handleSubmit` ahora tiene dos caminos: si
  `modeloExistente && matchedProductId` (el usuario no editó "Modelo"
  después de la sugerencia) → `POST /admin/products/:id/variants` sobre
  ESE producto; si no, el camino de siempre (`alta-rapida`, producto
  nuevo). Si el usuario edita "Modelo" a mano, `matchedProductId` se
  limpia y vuelve a crear un producto nuevo (es, a propósito, una
  decisión consciente de que es un modelo distinto). El campo "Precio" se
  oculta en el camino de variante-existente (usa el precio del producto,
  sin `priceOverride`) en vez de pedir un dato que no se usaría.

**Limpieza de datos:** las dos "1800" ya creadas en producción (con 3
pedidos reales encima) se fusionaron con el mismo script usado para
"Remera básica R" — variante movida, imagen movida, producto duplicado
borrado, pedidos intactos (apuntan a la variante por id, no al producto).

## 13. Input manual de código de barras necesitaba teclado alfanumérico, no solo decimal

**Pedido:** "en el campo 'código de barras' para ingresar manualmente...
necesito poder tener un teclado alfanumérico... actualmente tengo
solamente teclado numérico."

**Causa:** el fix 9 (`EscanearScreen.tsx`) había cambiado `inputMode` de
`"numeric"` a `"decimal"` para que apareciera la tecla "." — pero
`"decimal"` sigue siendo un teclado solo de dígitos (+ "."), sin letras.
Como ya se sabía (ítem de T36/analisis.md) que el talle puede ser texto
("XL", "S"), hacía falta el teclado completo.

**Fix:** se saca `inputMode` del todo — sin esa restricción, el celular
abre su teclado de texto normal (letras, números, signos, "." incluido).

## 14. Leyenda fija de "3 cuotas sin interés" sacada del checkout

**Pedido:** tras preguntarle dónde estaba, "sacalo no tiene que estar."

**Qué era:** `frontend/src/features/store/pages/CheckoutPage.tsx` tenía un
texto hardcodeado — "Hasta 3 cuotas sin interés de $X con todas las
tarjetas al pagar con Mercado Pago" — siempre visible en el resumen del
checkout, sin relación con el campo `installmentsText` (ese sí editable
por producto, se usa en la ficha del producto, no en el checkout). No
reflejaba si la tienda tiene Mercado Pago configurado ni si esa promoción
de 3 cuotas existe realmente.

**Fix:** se borró el párrafo, el cálculo `installment` que solo se usaba
ahí, y la regla CSS `.installments-note` (`catalog.css`) que quedaba sin
uso.

## 15. Factura opcional en el checkout web

**Pregunta del usuario:** "¿la factura en una compra por la web es
obligatoria? o podemos poner la opción de agregar o no agregar factura?"

**Hallazgo:** ninguna de las dos — el checkout público (pago con Mercado
Pago) no tenía NINGUNA lógica de factura, ni en el backend
(`/public/:slug/checkout`) ni en la UI (`CheckoutPage.tsx`). La
facturación AFIP (T25) solo estaba conectada en la venta local de la PWA y
en el alta manual del admin.

**Decisión:** agregarla, opcional y apagada por default — mismo criterio
que ya usa `CarritoScreen.tsx` en la PWA.

**Diferencia clave respecto a venta-local:** venta-local cobra en el
momento, así que la factura se emite ahí mismo, en el mismo request.
El checkout web crea la orden `pending` (se cobra recién cuando Mercado
Pago confirma el pago vía webhook) — emitir la factura en el momento del
checkout sería facturar algo que todavía no se cobró. Por eso quedó
partido en dos momentos:

- `packages/shared/src/schemas/order.ts`: `facturaAfipSchema` se movió
  arriba del todo del archivo (antes estaba después de `checkoutSchema`,
  que ahora la referencia — si se hubiera dejado abajo, se rompe en
  runtime por TDZ de `const`, no solo por orden de lectura). `checkoutSchema`
  suma `factura: facturaAfipSchema.optional()`.
- `backend/src/modules/payments/routes.ts` (`POST /public/:slug/checkout`):
  si viene `factura`, inserta la fila en `invoices` (estado `pendiente` por
  default) **dentro de la misma transacción que crea la orden** — pero
  NO intenta emitirla todavía.
- `backend/src/modules/payments/webhook.ts`: cuando el webhook de MP
  confirma el pago y la orden pasa a `paid` (único lugar donde eso pasa),
  busca si existe una fila de `invoices` para esa orden y, si existe,
  recién ahí llama a `intentarEmision` — afuera de la transacción del
  webhook (llamada externa a AFIP, mismo criterio que venta-local: un
  fallo de AFIP no debe revertir el pago ya confirmado).
- `frontend/src/features/store/pages/CheckoutPage.tsx`: nueva sección "5.
  Factura (opcional)" — checkbox "Quiero factura de esta compra" + los 3
  campos (nombre/email/DNI) cuando se activa, con la misma validación
  (`facturaFormCompleto`) que ya usa `CarritoScreen.tsx` en la PWA.
  "Confirmar y pagar" se bloquea si la factura quedó a medio completar.

## Verificación

- `tsc --noEmit` limpio en los 3 puntos tocados (`backend`, `frontend`,
  `pwa`) en cada fix de código; `vite build` también limpio para el fix 8
  (nueva dependencia, se corrió el build completo para confirmar que
  bundlea bien el CSS del paquete).
- 1-4 verificados en vivo en producción por el usuario durante la demo con
  el cliente de Eliathi Modas.
- 5, 7 y 8 pendientes de verificación visual en navegador al momento de
  escribir este doc (criterio constante del proyecto, ver
  `feedback_fabbric_confirm_before_coding`) — solo confirmados por tipos/build.
- 6 verificado directamente contra la base real (conteo de productos
  restantes = 0 tras el borrado, backup confirmado en disco).
