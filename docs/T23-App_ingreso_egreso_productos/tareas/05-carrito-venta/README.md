# Fase 5 — Carrito y confirmación de venta

**Estado:** ✅ Hecha (2026-08-17) — verificada de punta a punta con datos reales, incluyendo el caso de stock insuficiente. Sin cambios de backend (el endpoint `venta-local` ya existía desde la Fase 1).

## Objetivo (según plan.md)

Implementar el carrito como estado local de la app y la confirmación de venta en un solo toque contra el endpoint combinado `POST /admin/orders/venta-local` (Fase 01) — pensado para que la PWA funcione como una pistola de punto de venta.

## Checklist (desglose de Prompt 5 de implementacion.md)

- [x] Carrito como estado local (no persistido contra el backend hasta confirmar). Cada "Agregar a la venta" desde la Ficha lo suma a una lista en pantalla con cantidad y total corriendo.
- [x] Opción de quitar ítems del carrito.
- [x] Contador de ítems (badge) en el ícono de Carrito de la bottom nav.
- [x] Selector de medio de pago en la pantalla Carrito: `efectivo`, `transferencia`, `tarjeta`, `mercadopago` (chips, igual que `mockups.html`). Es solo el cobro presencial — no llama a la API de MP.
- [x] Al tocar "Confirmar venta": una sola llamada a `POST /admin/orders/venta-local` con los ítems (`variantId`, `qty`) y el `medioPago` elegido — sin pasos separados.
- [x] Si la respuesta es 400 (stock insuficiente): muestra el error, **sin** vaciar el carrito ni salir de la pantalla Carrito — verificado explícitamente.
- [x] Si la respuesta es exitosa: vacía el carrito y navega a la pantalla "Confirmar venta" (`ConfirmarScreen.tsx`, nueva) mostrando el `total` que devolvió el backend.

## Cómo se implementó

El carrito vive como estado de `App.tsx` (no de `CarritoScreen`), porque dos pantallas distintas lo tocan: `FichaScreen` lo alimenta (`onAddToCart`) y `CarritoScreen` lo consume/confirma. Decisión de fidelidad al mockup: **la cantidad del stepper de la Ficha solo aplica a "Registrar entrada"** (rótulo explícito en la UI) — "Agregar a la venta" siempre suma 1 unidad por toque (o incrementa la cantidad si la variante ya está en el carrito), igual que el prototipo (`mockups.html`).

Archivos nuevos/tocados:
- `pwa/src/App.tsx`: estado `cart`/`medioPago`/`confirmSubmitting`/`confirmError`, funciones `addToCart`/`removeFromCart`/`confirmVenta`, nuevo estado de pantalla `{ kind: "confirmar"; total; medioPago }`.
- `pwa/src/screens/FichaScreen.tsx`: botón "Agregar a la venta" activado (antes placeholder).
- `pwa/src/screens/CarritoScreen.tsx`: reescrita de stub a real — lista de ítems con opción de quitar, chips de medio de pago, total corriente, botón "Confirmar venta".
- `pwa/src/screens/ConfirmarScreen.tsx`: nueva — pantalla de éxito con el total y medio de pago devueltos por el servidor.
- `pwa/src/BottomNav.tsx`: badge con la cantidad total de ítems en el carrito.

## Criterios de aceptación (de overview.md)

- [x] Una venta con varios productos se confirma como una sola operación (una sola llamada HTTP): un `order`, sus `orderItems`, el descuento de stock y el movimiento financiero, todo o nada — verificado por SQL.
- [x] El `stockLocal` de cada variante se actualiza automáticamente al confirmar una venta, sin intervención manual.
- [x] Confirmar una venta con stock insuficiente para algún ítem rechaza toda la operación (ningún movimiento parcial queda registrado) y muestra el error al vendedor sin perder el carrito — verificado explícitamente, incluida la ausencia de cualquier `stockMovement` huérfano.
- [x] El medio de pago elegido queda reflejado en la cartera correcta — verificado por SQL (cartera "Transferencia" creada y `financialMovement` vinculado al pedido). **No verificado visualmente en `FinanzasPage`** del panel admin de escritorio (mismo pendiente ya anotado en Fases 3 y 4).
- [x] El total mostrado en la pantalla de confirmación es el devuelto por el servidor.

## Cómo se verificó

- **Playwright** (`test-venta.mjs`, script de sesión) contra dos productos de prueba reales (Producto A, `stockLocal: 10`; Producto B, `stockLocal: 1`, para forzar el caso de stock insuficiente):
  1. Escanear A → "Agregar a la venta" (x1) → badge del carrito muestra 1.
  2. Escanear A de nuevo → "Agregar a la venta" → badge muestra 2 (mismo ítem, cantidad acumulada).
  3. Ir a Carrito: muestra "Producto A Venta x2", total $5.000,00 correcto.
  4. Elegir medio de pago "Transferencia".
  5. Confirmar venta → pantalla de éxito con total y medio de pago correctos → "Volver a escanear" → carrito vacío, sin badge.
  6. Escanear B dos veces, agregando 2 unidades (stock real es 1) → Confirmar venta → error "Sin stock local para Producto B..." → **no** navega a la pantalla de éxito, **no** vacía el carrito.

  **14/14 PASS**, un único mensaje de consola (400 esperado, del intento de venta con stock insuficiente).
- **SQL** tras el test: un `order` (`status: paid`, `total: 500000`), un `orderItem` (`qty: 2`, `unitPrice: 250000`), un `stockMovement` (`channel: local`, `type: venta`, `delta: -2`, `note: "venta local #1"`), `stockLocal` de A en 8 (10 − 2), cartera "Transferencia" creada automáticamente, `financialMovement` vinculado al pedido por el monto correcto. `stockLocal` de B sin cambios (sigue en 1) y **cero** `stockMovements` para B — confirma que la venta fallida no dejó nada a medias.
- **Limpieza**: `financialMovements`, `orderItems`, `orders`, `stockMovements`, `wallets`, `productVariants`, `products`, `categories`, `adminUsers`, `organizations` de prueba borrados por SQL; usuario de Supabase Auth borrado. No quedó nada en la base real.

## Dependencias

- **La bloquean**: Fase 01 (endpoint `venta-local`) y Fase 03 (Ficha de producto, que alimenta el carrito vía "Agregar a la venta").
- **Bloquea**: Fase 07 (pruebas end-to-end del flujo de venta, incluyendo el caso de stock insuficiente).
