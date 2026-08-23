# Implementación — T23 App de ingreso/egreso de productos

Ver `overview.md` para el contexto completo, la decisión de arquitectura y el modelo de datos, y `plan.md` para las fases. Esta app **extiende** el backend existente (`backend/`) — no crea un backend ni un proyecto Supabase propios.

## Prompt 0 — Analizar qué queda obsoleto de T22

> Leé `docs/T22_Carga_Masiva_Productos/overview.md` y `docs/T22_Carga_Masiva_Productos/analisis.md`, y compará ese planteo contra `docs/T23-App_ingreso_egreso_productos/overview.md`. T22 estaba diseñado sobre Google Sheets + AppSheet; T23 lo reemplaza con una PWA integrada al backend de fabbric. Reportá, punto por punto:
> - Qué partes de T22 siguen siendo válidas tal cual (ej. estructura de columnas de producto, reglas de validación como código de barras único).
> - Qué partes de T22 quedan obsoletas porque dependían específicamente de AppSheet/Sheets/Drive.
> - Si hay algo de T22 que no está cubierto todavía en T23 y debería agregarse antes de empezar a implementar.
>
> No implementes nada en este paso, solo el análisis y el reporte.

*(Histórico — sigue siendo válido como registro de la comparación T22 vs. T23, aunque el diseño de implementación de T23 cambió después de este prompt.)*

## Prompt 1 — Extender el backend existente

> Sobre `backend/` (Fastify + Drizzle + Supabase, **no** un proyecto nuevo):
> - Migración Drizzle: agregá una columna `barcode` (text, nullable, único por `orgId`) a `productVariants` en `backend/src/db/schema.ts`. Generá la migración con `db:generate` (nunca `db:push`) y corré `db:migrate`.
> - Endpoint nuevo `GET /admin/variants/by-barcode/:code` (mismo módulo que `variants/routes.ts` o uno nuevo `barcode/routes.ts`, con `requireAdminAuth` + `requireOrgId`): busca la `productVariant` por `barcode` dentro de la org del admin autenticado, devolviendo también los datos del `product` (nombre, marca, categoría), la primera imagen y el `stockLocal` calculado. 404 si no existe.
> - Endpoint nuevo `POST /admin/orders/venta-local` (módulo `orders` o uno nuevo): recibe `{ items: [{variantId, qty}], medioPago: 'efectivo'|'transferencia'|'tarjeta'|'mercadopago' }`. En una sola transacción:
>   - Valida stock suficiente en cada `variantId` (canal `local`); si falta, aborta con 400 `insufficient_stock` sin dejar nada escrito.
>   - Crea el `order` (con `orderItems` de `channel: 'local'`, snapshots de nombre/precio/costo como ya hace el alta manual de T7) y descuenta stock con movimientos `venta`.
>   - Marca el pedido `paid`.
>   - Resuelve la cartera correspondiente al `medioPago` recibido (una cartera por medio de pago: `Efectivo`, `Transferencia`, `Tarjeta`, `Mercado Pago`), creándola si no existe (mismo patrón `ensureMpWallet` de `finance/service.ts`), y registra el movimiento financiero vinculado al pedido.
>   - Devuelve el pedido con su `total`.
> - No hace falta tocar RLS, Auth, ni Storage — se reusa todo lo existente.

## Prompt 2 — Scaffold de la PWA

> Creá la carpeta `pwa/` en la raíz del monorepo y sumala al array `workspaces` de `package.json` (raíz). Armá el proyecto (React + Vite, configurado como PWA instalable). Cliente de API: copiá el patrón de `frontend/src/lib/api.ts` (`apiJson`/`apiUpload`, con el `access_token` de la sesión de Supabase como Bearer) y `frontend/src/lib/supabaseClient.ts`, apuntando al mismo proyecto Supabase y al mismo `VITE_API_URL` del backend. Incluí una pantalla de login con email/contraseña real contra Supabase Auth (mismo login que ya usa `frontend/` para el panel admin — sin ningún mapeo de usuario a email falso).

## Prompt 3 — Escaneo y alta de producto

> Implementá la pantalla "Escanear" que abra la cámara del celular vía navegador y lea códigos de barras (librería tipo `html5-qrcode`). Al leer un código, llamá a `GET /admin/variants/by-barcode/:code`:
> - Si devuelve 404: mostrar el formulario de alta (marca, modelo, talle, color, precio, **categoría** — selector simple contra `GET /admin/categories`, foto). Al guardar: `POST /admin/products` (categoryId, name=modelo, brand=marca, price en centavos vía `pesosToCents`) → `POST /admin/products/:id/variants` (talle, color, `barcode`, `stockLocal` inicial) → `POST /admin/products/:id/images` (la foto).
> - Si devuelve 200: mostrar la ficha del producto (foto, marca, talle, color, precio, `stockLocal`) con dos acciones: "Registrar entrada" y "Agregar a la venta".

## Prompt 4 — Entrada de stock (ingreso)

> Implementá la acción "Registrar entrada" de la ficha de producto: agregá un control de cantidad (stepper +/-, default 1). Al tocar "Registrar entrada": `POST /admin/variants/:id/stock-movements` con `{ channel: 'local', type: 'entrada', delta: cantidad }`.

## Prompt 5 — Carrito y confirmación de venta (egreso)

> Implementá el carrito de venta como estado local de la app (no persistido hasta confirmar): cada "Agregar a la venta" desde la ficha de producto lo suma a una lista en pantalla con cantidad y total corriendo, con opción de quitar ítems. En la pantalla de Carrito, agregá un selector de medio de pago (`efectivo`, `transferencia`, `tarjeta`, `mercadopago` — este último es el cobro presencial con QR/Point, no dispara ninguna llamada a la API de Mercado Pago, es solo el valor que determina la cartera). Al tocar "Confirmar venta": llamá a `POST /admin/orders/venta-local` con los ítems del carrito y el medio de pago elegido, en una sola llamada. Si responde 400 por stock insuficiente, mostrá el error sin salir de Carrito y sin vaciar el carrito. Si responde bien, vaciá el carrito y navegá a la pantalla de Confirmar venta con el `total` que devolvió el backend.

## Prompt 6 — Carga masiva por CSV — **DIFERIDO, no implementar en esta pasada**

> Se deja documentado para cuando se retome (ver `overview.md`, "Decisiones resueltas" punto 8, y `plan.md` Fase 6). El diseño de las reglas de negocio ya está resuelto (upsert por `codigo_barras`, `trim` de texto, columna `stock` opcional que genera movimiento `entrada` solo en productos nuevos) — al implementarlo, hay que remapear contra `products`/`productVariants`/`stockMovements` en vez de tablas propias, ya que el modelo cambió respecto del diseño original.

## Fuera de alcance (no incluir en esta implementación)

- Integración con facturación electrónica ARCA/AFIP.
- Migración de fotos desde Google Drive/Sheets (script aparte si hiciera falta).
