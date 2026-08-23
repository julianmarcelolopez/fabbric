# Fase 4 — Entrada de stock

**Estado:** ✅ Hecha (2026-08-17) — verificada de punta a punta con datos reales, sin cambios de backend (el endpoint ya existía desde T4)

## Objetivo (según plan.md)

Implementar la acción "Registrar entrada" de la Ficha de producto, reusando el endpoint de movimientos de stock que ya existe en el backend (T4).

## Checklist (desglose de Prompt 4 de implementacion.md)

- [x] Agregar un control de cantidad en la Ficha de producto: stepper +/-, valor default 1 (ver `mockups.html`, pantalla `ficha`).
- [x] Al tocar "Registrar entrada": `POST /admin/variants/:id/stock-movements` con `{ channel: 'local', type: 'entrada', delta: cantidad }`.
- [x] No pasa por el carrito ni genera ningún `order` — confirmado por SQL (un solo row en `stock_movements`, nada en `orders`).
- [x] Vuelve a la pantalla Escanear al confirmar.

## Cómo se implementó

Todo el trabajo fue en `pwa/src/screens/FichaScreen.tsx` — el endpoint (`POST /admin/variants/:id/stock-movements`, `backend/src/modules/stock/routes.ts`) ya existía desde T4 y no se tocó. Se agregó estado local `qty` (default 1, stepper `-`/`+` con mínimo 1), y un `handleEntrada` que llama al endpoint con `{ channel: "local", type: "entrada", delta: qty }` y navega a Escanear (`onDone`) si sale bien; si falla, muestra el mensaje de error sin navegar y sin perder el estado. El botón "Agregar a la venta" queda igual que antes, deshabilitado como placeholder (Fase 5, todavía no implementada).

## Criterios de aceptación (de overview.md)

- [x] Registrar una entrada no requiere pasar por el carrito ni por una venta.
- [x] El `stockLocal` de la variante se actualiza automáticamente — verificado re-escaneando el mismo código y viendo el stock actualizado en la Ficha. **No verificado visualmente en `StockPage` del panel admin de escritorio** (mismo dato por SQL, igual que el pendiente ya anotado en la Fase 3 para el alta de productos).

## Cómo se verificó

- **Playwright** (`test-entrada.mjs`, script de sesión) contra un producto de prueba real con `stockLocal: 3`: login → escanear el código → confirma "Stock: 3" en la Ficha → sube el stepper a 2 con el botón `+` → toca "Registrar entrada" → vuelve a Escanear → **re-escanea el mismo código** → confirma "Stock: 5" (3 + 2, sin atajos). **5/5 PASS**, cero errores de consola.
- **SQL** tras el test: un único row en `stock_movements` (`channel: "local"`, `type: "entrada"`, `delta: 2`), `product_variants.stock_local = 5`, y ningún row nuevo en `orders` — confirma que la entrada no pasa por el flujo de venta.
- **Limpieza**: org/categoría/producto/variante/movimiento/admin de prueba borrados por SQL, usuario de Supabase Auth borrado. No quedó nada en la base real.

## Dependencias

- **La bloquean**: Fase 01 (el endpoint ya existe desde T4, no hay que crearlo — pero la Ficha depende de la Fase 03) y Fase 03 (Ficha de producto).
- **Bloquea**: Fase 07 (pruebas end-to-end del flujo de entrada).
