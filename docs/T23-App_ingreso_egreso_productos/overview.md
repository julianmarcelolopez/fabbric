# T23 — App de ingreso/egreso de productos (PWA integrada al backend de fabbric)

## Relación con T22

`docs/T22_Carga_Masiva_Productos` definió la estructura del producto (columnas, `codigo_barras` como clave única, reglas de validación, manejo de imágenes como referencia) pensada originalmente para Google Sheets + AppSheet. Ese análisis de estructura **sigue vigente como referencia conceptual**, pero la tabla real que la implementa no es una tabla nueva: es la que ya existe en `backend/src/db/schema.ts` (`products` + `productVariants`), ver "Decisión de arquitectura" más abajo.

Lo que **no** sigue vigente de T22 es la parte de implementación pensada específicamente para AppSheet (botón de carga masiva con hoja de staging y Apps Script como webhook) — eso quedaba resuelto a medida de las limitaciones de AppSheet, que ya no es la interfaz del sistema. La carga masiva por CSV en sí (no la implementación de AppSheet) queda **diferida**, ver "Decisiones resueltas", punto 8.

## Contexto

**Eliathi Modas (Edgar Silguero) no es un cliente hipotético: ya es un tenant real de la plataforma fabbric** — tiene su organización, su catálogo (`products`/`productVariants`), su checkout con Mercado Pago y su login de administrador funcionando (ver `docs/analisis-negocio.md`, `docs/plan_2.md`). Esta app agrega el canal que falta: el control de stock físico del local, hecho desde el celular por el dueño y sus vendedores, escaneando cada producto en vez de cargar todo a mano desde una planilla o el panel de escritorio.

Por eso T23 **no crea un sistema paralelo**: la PWA es un cliente nuevo (mobile-first, con cámara) del mismo backend Fastify que ya usa `frontend/` — mismo catálogo, mismo stock, mismo login de administrador. Lo único genuinamente nuevo es la capacidad de buscar un producto por código de barras y un flujo de venta presencial pensado para ser tan rápido como una pistola lectora de punto de venta.

## Decisión de arquitectura (reemplaza el diseño original de T23)

La primera versión de este documento proponía un proyecto Supabase nuevo con tablas propias (`productos`, `movimientos`, `ventas`), RLS como mecanismo de seguridad, y una función RPC de Postgres para la venta. Al revisar `backend/src/db/schema.ts` se confirmó que casi todo ese dominio **ya existe**, construido en T2/T4/T6/T7/T9:

| Necesidad de T23 | Ya resuelto en `backend/` |
|---|---|
| Catálogo de productos (marca, talle, color, precio) | `products` (nombre, marca, categoría, precio) + `productVariants` (talle, color, `stockOnline`/`stockLocal` por separado) |
| Movimientos de stock (entrada/salida) | `stockMovements` — tipos `entrada`/`venta`/`ajuste`/`sync`, con `channel: online\|local` |
| Descuento de stock atómico al vender | `POST /admin/variants/:id/stock-movements` — update en SQL con `WHERE stock + delta >= 0`, 400 `insufficient_stock` sin condición de carrera |
| Venta presencial con ítems de catálogo | `POST /admin/orders` (T7, "alta manual de pedidos") ya soporta `{variantId, qty, channel: 'local'}` |
| Cobro y registro financiero | `POST /admin/orders/:id/mark-paid` (T9) — pending→paid + movimiento financiero vinculado a una cartera, en una transacción |
| Login dueño/vendedores | `admin_users`, roles `owner`/`staff`, email real de Supabase Auth |
| Storage de fotos | Bucket `product-images` + `POST /admin/products/:id/images` ya existente |

Lo que **sí** falta y es trabajo nuevo de T23:

- Un campo de código de barras para buscar por escaneo (no existe en `productVariants` hoy).
- Un endpoint de venta presencial combinado en un solo paso (hoy el flujo de T7/T9 es crear pedido + marcar pagado como dos llamadas separadas).
- La PWA en sí: escaneo por cámara, UI mobile-first, carrito local.
- La carga masiva por CSV (diferida, ver punto 8 de "Decisiones resueltas").

## Decisiones resueltas

1. **Proyecto Supabase**: el mismo que ya usa `backend/`/`frontend/` (`fabbric-dev`). No se crea un proyecto nuevo.
2. **Modelo de datos**: se reusan `products`, `productVariants`, `stockMovements`, `orders`/`orderItems`. Se agrega una columna nueva **`barcode`** (text, único por organización) en `productVariants` — es la única migración de schema que requiere esta app.
3. **Alta por escaneo**: si el código no existe, se crea un `product` nuevo (`categoryId` elegido con un selector simple en el formulario móvil — no hay categoría fija por defecto) y una `productVariant` (talle, color, `barcode`, `stockLocal` inicial). La foto sube al bucket `product-images` ya existente, a nivel producto (mismo patrón que el alta manual del admin de escritorio).
4. **Precios en centavos**: como el resto de fabbric, `products.price` es un entero en centavos. La PWA pide el precio en pesos y lo convierte antes de mandarlo al backend (mismo helper `pesosToCents` de `frontend/src/lib/money.ts`).
5. **Registrar entrada**: reusa `POST /admin/variants/:id/stock-movements` (`channel: "local"`, `type: "entrada"`, `delta` = cantidad indicada).
6. **Confirmar venta — endpoint nuevo `POST /admin/orders/venta-local`**: pensado para que la PWA funcione como una pistola de punto de venta (un solo toque, sin pasos intermedios que puedan quedar a medias). En una sola transacción del backend: crea el pedido con sus ítems (`channel: "local"`), valida y descuenta stock, lo marca `paid`, y registra el movimiento financiero. Reemplaza la idea original de una función RPC de Postgres — la atomicidad se resuelve en la transacción de Drizzle del backend, igual que ya hace `mark-paid`.
7. **Medio de pago → cartera**: el vendedor elige un medio de pago (`efectivo`, `transferencia`, `tarjeta`, `mercadopago`) y el backend resuelve sola la cartera correspondiente, creándola la primera vez que se usa (mismo patrón `ensureMpWallet` de T9). Las cuatro son carteras **separadas** — no se asume que transferencia y Mercado Pago compartan destino. El vendedor nunca ve el concepto de "cartera", solo el de medio de pago. No hace falta una columna `medio_pago` en `orders`: queda registrado a través del `walletId` del movimiento financiero vinculado al pedido.
8. **Carga masiva por CSV — diferida, no se implementa en esta pasada**: el camino real de carga inicial de catálogo es escanear cada producto físico (Fase 3), no importar un archivo — y una carga CSV tampoco podría traer la foto (hace falta la prenda en mano para eso), así que escanear cubre mejor el caso de uso real. Mismo criterio que ya había tomado `docs/plan_2.md` para la demo. El trabajo de diseño ya hecho (upsert vs. descarte, sanitización, columna `stock` del proveedor) queda documentado en `plan.md` y en `tareas/06-carga-masiva/` para cuando haga falta retomarlo, sin implementarse ahora.
9. **Login**: Supabase Auth real, igual que el panel de administrador (`admin_users`, roles `owner`/`staff`). No hace falta ningún mapeo de usuario a email falso — el vendedor se loguea con su email real.
10. **RLS**: no se usa. La autorización sigue viviendo en el backend (`requireAdminAuth` + `requireOrgId`), igual que el resto de fabbric — la PWA nunca habla directo con Supabase para datos de negocio, solo para Auth (login).
11. **Nombre de la carpeta de la PWA en el monorepo**: `pwa/`, sumada al array `workspaces` del `package.json` raíz.

## Objetivo

Una PWA que el dueño y sus vendedores usan desde el celular para:

1. Dar de alta un producto nuevo (con foto) al escanearlo por primera vez — mismo catálogo que ve la tienda online.
2. Registrar entradas de stock local (ingreso) cuando llega mercadería del proveedor.
3. Registrar ventas presenciales (egreso de stock local) escaneando uno o varios productos y confirmando la operación en un solo toque.
4. *(Diferido — ver "Decisiones resueltas", punto 8)* Cargar productos de forma masiva vía CSV, para cuando exista una lista digital y no tenga sentido escanear uno por uno.

## Modelo de datos

No hay tablas nuevas propias de esta app — se reusa el schema de `backend/src/db/schema.ts`. Único cambio de schema:

**`productVariants`** (ya existente — se agrega una columna)
| Columna | Tipo | Notas |
|---|---|---|
| ...columnas existentes... | | `talle`, `color`, `sku`, `stockOnline`, `stockLocal`, `priceOverride`, `productId`, `orgId` |
| **`barcode`** (nueva) | text, único por org | clave de búsqueda al escanear — distinta de `sku` (código interno), es el código de barras físico de la prenda |

Tablas reusadas sin cambios de schema:

- **`products`**: `name` (≈ "modelo"), `brand` (≈ "marca"), `categoryId` (obligatorio — se elige con selector en el alta móvil), `price` (centavos), `costPrice`, `compareAtPrice`, `status`, `visibleInCatalog`.
- **`stockMovements`**: `variantId`, `channel` (`local` para todo lo que hace esta app), `type` (`entrada`/`venta`), `delta`, `note`.
- **`orders`** / **`orderItems`**: la venta presencial crea un `order` con `orderItems` de `channel: "local"`, igual que un pedido manual del admin.
- **`wallets`** / **`financialMovements`**: el cobro de la venta presencial crea/usa una cartera por medio de pago y su movimiento financiero vinculado.

El stock de una variante **no se guarda como campo fijo editable**: solo cambia insertando movimientos en `stockMovements` (regla ya vigente en todo fabbric desde T4 — "el stock nunca se setea, se mueve").

**Storage**: bucket `product-images` (ya existente), mismo patrón de subida que el alta manual del admin (`POST /admin/products/:id/images`, multipart, JPEG/PNG/WebP).

**Auth**: Supabase Auth real (mismo proyecto, mismos usuarios que el panel admin) — el dueño y sus vendedores necesitan una fila en `admin_users` (rol `owner` o `staff`) para poder loguearse en la PWA.

## Pantallas / flujo

La app tiene solo **dos destinos reales** en la navegación (bottom nav, visible después del login): **Escanear** y **Carrito**. Todo lo demás son estados a los que se llega por una acción concreta, no lugares a los que se navega libremente — ver mockup navegable en `mockups.html`.

1. **Login** — acceso con email/contraseña real (Supabase Auth, mismo login que el admin de escritorio). Pantalla previa, sin bottom nav.
2. **Escanear** (destino de la bottom nav) — pantalla principal. Abre la cámara del celular (vía navegador) y lee el código de barras. Busca contra `GET /admin/variants/by-barcode/:code`. Según el resultado, pasa a "Alta de producto" o "Ficha de producto".
3. **Alta de producto** (estado, no destino — se llega solo si el código escaneado no existe) — formulario: marca, modelo, talle, color, precio, **categoría** (selector), + captura de foto con la cámara. Al guardar: `POST /admin/products` (crea el producto) → `POST /admin/products/:id/variants` (crea la variante con el `barcode` y el stock inicial) → `POST /admin/products/:id/images` (sube la foto). Vuelve a Escanear.
4. **Ficha de producto** (estado, no destino — se llega solo si el código escaneado ya existe) — muestra foto, marca, talle, color, precio y `stockLocal` actual. Dos acciones, ambas vuelven a Escanear al ejecutarse:
   - **Registrar entrada**: `POST /admin/variants/:id/stock-movements` (`channel: local`, `type: entrada`).
   - **Agregar a la venta**: suma el producto al carrito en curso (estado local de la app, no se persiste hasta confirmar) y actualiza el contador en el ícono de Carrito de la bottom nav.
5. **Carrito** (destino de la bottom nav) — lista de productos agregados a la venta actual, con cantidad y total corriendo. Permite quitar ítems. Selector de medio de pago (efectivo / transferencia / tarjeta / Mercado Pago). Botón **Confirmar venta**.
6. **Confirmar venta** (estado, no destino — solo se llega tocando el botón dentro de Carrito) — llama a `POST /admin/orders/venta-local` (ver "Decisiones resueltas", punto 6), que en una sola transacción crea el pedido, valida y descuenta stock, lo marca pagado, y registra el movimiento financiero en la cartera resuelta por el medio de pago elegido. Si falta stock, la operación se rechaza (400) y se muestra el error sin salir de Carrito ni perder los ítems. Si sale bien, vacía el carrito y ofrece volver a Escanear.

**Carga masiva por CSV**: diferida (ver "Decisiones resueltas", punto 8) — no forma parte de esta implementación.

## Fuera de alcance de T23

- Integración con facturación electrónica ARCA/AFIP al confirmar la venta (ticket aparte).
- Migración de fotos ya cargadas en Google Drive, si las hubiera (script aparte, una sola vez).
- ~~Sincronización de stock con la tienda web existente~~ — ya no aplica: al reusar `products`/`productVariants`/`stockMovements`, el stock local que mueve esta app **es** el mismo que ve la tienda online, no hay dos fuentes que sincronizar.

## Diferido (no fuera de alcance — se retoma más adelante)

- Carga masiva de productos por CSV. Ver punto 8 de "Decisiones resueltas" y `tareas/06-carga-masiva/README.md` para el diseño ya resuelto, listo para cuando se decida implementarlo.

## Stack

- **Frontend nuevo**: PWA React + Vite (carpeta `pwa/`), instalable desde el navegador del celular. Consume el mismo backend REST que `frontend/`, con el mismo patrón de cliente (`apiJson`/`apiUpload` con Bearer token de Supabase Auth, ver `frontend/src/lib/api.ts`).
- **Lectura de código de barras**: librería de escaneo por cámara del navegador (ej. `html5-qrcode`).
- **Backend**: el ya existente (`backend/`, Fastify + Drizzle + Supabase). Se extiende, no se reemplaza: una migración (`barcode`) + dos endpoints nuevos (`by-barcode`, `venta-local`).
- **Transacciones de venta**: transacción de Drizzle dentro del endpoint `venta-local` del backend existente — no una función RPC de Postgres.
- **Hosting**: junto con `frontend/`, mismo esquema de deploy que ya usa fabbric (ver memoria de deploy en EasyPanel).

## Criterios de aceptación

- Escanear un código que no existe permite darlo de alta completo (con foto) en menos de 4 pasos (incluye elegir categoría).
- Escanear un código existente muestra su ficha con el `stockLocal` correcto.
- Registrar una entrada no requiere pasar por el carrito ni por una venta.
- Una venta con varios productos se confirma como una sola operación (`POST /admin/orders/venta-local`): un pedido, sus ítems, el descuento de stock y el movimiento financiero, todo o nada.
- El stock de cada variante se actualiza automáticamente al confirmar una venta o registrar una entrada, sin intervención manual — y ese mismo stock es el que ve la tienda online (no hay sincronización porque es la misma fuente).
- Confirmar una venta con stock insuficiente para algún ítem rechaza toda la operación (ningún movimiento parcial queda registrado) y muestra el error al vendedor sin perder el carrito.
- El medio de pago elegido queda reflejado en la cartera correcta del módulo de Finanzas ya existente.
