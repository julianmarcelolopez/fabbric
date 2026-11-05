# T42 — Modo "Consultar" en la PWA: ver y corregir un producto escaneado

## Pedido original

"la aplicación pwa necesita un modo o algo para consultar... y poder
modificar lo que carga... ¿es posible?"

## Por qué esto importa (contexto de la sesión)

Casi todo lo arreglado en `docs/bugs/B001_ProductosDuplicadosPorModelo/`
hoy fue exactamente este problema: un color tipeado "Blancaa" en vez de
"Blanca", un talle con espacios de más, un código de barras con guiones
en vez de punto, un modelo mal escaneado. Hoy, la única forma de corregir
eso es que **el usuario me pida a mí que corra SQL a mano** contra la
base real — no hay ninguna pantalla, ni en la PWA ni en el admin de
escritorio fácilmente alcanzable desde el piso de venta, para que quien
tiene la prenda en la mano la escanee y corrija el dato ahí mismo.

## Estado actual (verificado contra el código real)

- `pwa/src/App.tsx:75` — el modo de la PWA es
  `const [modo, setModo] = useState<"venta" | "entrada">("venta")`: solo
  dos modos existen hoy, "Vender" y "Recibir mercadería" (tabs en
  `EscanearScreen.tsx`, ver captura adjunta del usuario).
- Escanear un código conocido en cualquiera de los dos modos lleva a
  `FichaScreen.tsx` — muestra foto, marca+nombre, talle/color, precio,
  stock local, y UNA acción según el modo (`Registrar entrada` o
  `Agregar a la venta`, líneas 148-195). **No hay ningún botón para
  editar nada** — es una pantalla de solo lectura + una acción.
- El tipo que trae todo esto, `VariantByBarcode`
  (`pwa/src/types.ts:12-27`, viene de
  `GET /admin/variants/by-barcode/:code`), no incluye `categoryId` ni
  `brandId` — solo los nombres resueltos (`product.brand`,
  `category.name`) — alcanza para mostrar, no para precargar un `<select>`
  de edición de marca/categoría.
- **El backend YA tiene todo lo necesario para editar, no hace falta
  nada nuevo ahí**:
  - `PATCH /admin/variants/:id` (`backend/src/modules/variants/routes.ts`,
    `updateVariantSchema` en `@fabbric/shared`) — acepta `talle`, `color`,
    `sku`, `barcode`, `priceOverride`, todos opcionales (`.partial()`).
    Ya maneja el conflicto de barcode duplicado (409) igual que el resto
    del sistema.
  - `PATCH /admin/products/:id` (`backend/src/modules/products/routes.ts`,
    `updateProductSchema`) — acepta `name`, `price`, `categoryId`,
    `brandId`/`newBrandName`, etc., todos opcionales.
  - Son los mismos endpoints que ya usa `ProductEditPage.tsx` en el admin
    de escritorio — T42 no inventa un mecanismo de edición nuevo, solo le
    da una puerta de entrada más rápida desde la PWA.

## Ampliación del pedido (2026-11-03): permisos + paridad con el admin

Dos pedidos nuevos sobre la propuesta inicial:

### 1. "Consultar" para todos, "Modificar" solo para administradores

**Ya existe la base para esto, no hace falta inventar un sistema de
roles.** `admin_users.role` (`backend/src/db/schema.ts:17,59`) ya es
`"super_admin" | "owner" | "staff"`, y
`request.adminUser.role` ya viaja en cada request autenticado
(`backend/src/plugins/auth.ts:76-84`) — lo arma `requireAdminAuth`, que
hoy usan TODOS los endpoints de escritura (`PATCH /admin/variants/:id`,
`PATCH /admin/products/:id`, etc.) sin mirar el rol.

**Decisión a tomar**: para que "solo administradores pueden modificar"
sea real (no solo un botón escondido en la PWA, que un `staff` podría
saltarse llamando a la API directo con su propio token), hace falta un
guard nuevo en el backend — ej. `requireOwnerOrAbove` (mismo patrón que
`requireSuperAdmin`, `backend/src/plugins/auth.ts:149-154`) — aplicado a
los endpoints de escritura que la PWA va a usar acá
(`PATCH /admin/variants/:id`, `PATCH /admin/products/:id`,
`POST`/`DELETE` de variantes e imágenes).

Como esos mismos endpoints también los usa el admin de escritorio
(`ProductEditPage.tsx`), aplicar el guard ahí los deja consistentes en
los dos lados: un `staff` tampoco podría editar desde el admin de
escritorio, no solo desde la PWA. Asumido así salvo que el usuario diga
lo contrario — tiene sentido con el rol (`staff` = vendedor de piso,
`owner`/`super_admin` = quien administra el catálogo).

### 2. Editar "lo más parecido posible" al admin — marca/categoría/estado/costo/precio anterior/cuotas/descripción/colecciones, variantes (crear/editar/borrar), fotos (subir/borrar)

**El backend ya tiene absolutamente todo lo necesario — cero endpoints
nuevos, es 100% trabajo de PWA:**

| Sección (como en `ProductEditPage.tsx`) | Endpoint ya existente |
|---|---|
| Datos básicos (nombre, marca, categoría, estado, precio, costo, precio anterior, cuotas, descripción) | `PATCH /admin/products/:id` (`updateProductSchema`) |
| Colecciones | `PUT /admin/products/:id/collections` |
| Variantes — crear | `POST /admin/products/:id/variants` |
| Variantes — editar (talle/color/sku/barcode/priceOverride) | `PATCH /admin/variants/:id` |
| Variantes — borrar | `DELETE /admin/variants/:id` |
| Fotos — subir | `POST /admin/products/:id/images` (mismo que ya usa `AltaScreen.tsx` — con el recorte de `ImageCropper.tsx`, T37, reusable tal cual) |
| Fotos — borrar | `DELETE /admin/images/:id` |
| Traer todo junto | `GET /admin/products/:id` (ya devuelve producto + variantes + imágenes + colecciones) |

Dado que todo esto ya existe, "lo más parecido posible al admin" es
alcanzable — la pantalla de edición de la PWA pasa a tener 3 secciones
(igual que el wizard del admin: Datos básicos / Variantes / Fotos), solo
que pensadas para una pantalla de celular en vez de desktop.

**Recomendación de fasing** (para no implementar todo de una sin
verificar en el camino): Fase 1 = Datos básicos completo + permisos;
Fase 2 = Variantes; Fase 3 = Fotos (reusando `ImageCropper.tsx` tal
cual). Cada fase queda usable por sí sola. A confirmar con el usuario si
prefiere todo junto o por fases.

## Alcance propuesto para T42 (v1 original, mantenido como base)

Un tercer modo en `EscanearScreen.tsx`, junto a "Vender"/"Recibir
mercadería": **"Consultar"**. Escanear (o tipear) un código en ese modo
no lleva a `FichaScreen` (la de vender) — lleva a una pantalla nueva,
`EditarScreen.tsx`, con los datos del producto en campos editables:

- **Nombre del producto** (texto)
- **Precio** (el del producto, no un override por variante — mismo
  campo que ya edita `ProductEditPage.tsx`)
- **Talle**
- **Color**
- **Código de barras**

Con un botón "Guardar cambios" que manda solo lo que cambió a
`PATCH /admin/variants/:id` (talle/color/barcode) y
`PATCH /admin/products/:id` (nombre/precio) — dos requests si hace falta
tocar las dos cosas, uno si solo cambió algo de un lado.

**Fuera de alcance de v1** (explícitamente, para no inflar el pedido):

- Cambiar marca o categoría — requiere selects con catálogo cargado
  (igual que el admin), más complejo en una pantalla de celular pensada
  para una corrección rápida; si hace falta, es una vuelta aparte.
- Cambiar stock — eso ya tiene su propio mecanismo (movimientos,
  `/admin/variants/:id/stock-movements`), a propósito no se mezcla con
  una edición libre de número (regla de siempre: el stock nunca se
  "setea", se mueve).
- Crear un producto nuevo desde acá — eso ya existe (Alta por escaneo,
  T36/T37).
- Borrar el producto — queda para el admin de escritorio, es una acción
  más delicada.

## Mockup visual

Ver `plan.md` para el link al mockup interactivo (ancho de celular,
mismo estilo visual real de la PWA: header navy, logo "Eliathi",
tabs Vender/Recibir mercadería/Consultar, bottom nav).

## Criterios de aceptación

- Un tercer tab "Consultar" aparece en `EscanearScreen.tsx`, junto a
  "Vender"/"Recibir mercadería".
- Escanear/tipear un código conocido en modo Consultar abre
  `EditarScreen.tsx` con los 5 campos precargados.
- Guardar cambios solo manda al backend los campos que realmente
  cambiaron (no reenvía todo siempre).
- Un código de barras duplicado al guardar muestra el mismo error 409
  que ya maneja el resto del sistema, sin romper la pantalla.
- Escanear un código que NO existe en modo Consultar muestra un mensaje
  claro ("no encontrado"), no lleva a Alta (ese flujo es otro, no se
  mezcla).
- `tsc --noEmit` limpio en `pwa/`.
- Verificado en el navegador (o en el celular real), no solo por tipos.
