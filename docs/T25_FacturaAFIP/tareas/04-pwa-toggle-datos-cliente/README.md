# Fase 4 — PWA: toggle y datos del cliente

**Estado:** ✅ Hecha (2026-09-06) — 13/13 PASS (Playwright) + confirmado con una venta manual real por el usuario

## Objetivo (según plan.md)

Que el vendedor pueda activar "Facturar esta venta" desde el Carrito y cargar los datos mínimos del cliente, sin agregar fricción cuando no hace falta factura (toggle apagado por default).

## Checklist

- [x] `pwa/src/screens/CarritoScreen.tsx`: toggle "Facturar esta venta" (checkbox), debajo del selector de medio de pago, apagado por default.
- [x] Si se activa: mini-formulario con nombre, email y DNI.
- [x] Bloquear "Confirmar venta" con el toggle activo y datos incompletos — **corregido durante la implementación**: el checklist original solo mencionaba bloquear por email, pero `facturaAfipSchema` (backend) exige los **tres** campos como obligatorios en cuanto se manda el bloque `factura`. Bloquear solo por email hubiera dejado pasar un 400 del backend si nombre o DNI quedaban vacíos — se valida los tres (`facturaFormCompleto`).
- [x] `pwa/src/App.tsx` (`confirmVenta`): el bloque `factura` se agrega al body solo si `facturar` está activo (spread condicional) — sin el toggle, el payload es idéntico al de T23.
- [x] Se extendió el tipo `Screen` (variante `"confirmar"`) para transportar `factura: InvoiceStatus | null` desde la respuesta hasta la pantalla de confirmación — la Fase 5 la consume, esta fase solo la transporta.
- [x] El carrito y el formulario de factura se resetean después de una venta confirmada (mismo criterio que ya tenía el carrito).

## Hallazgo durante la prueba en navegador: el botón quedaba tapado por la barra inferior

Al probar en un viewport de celular real (no el desktop por default de Playwright), el formulario nuevo (~160px) empuja el contenido más allá de lo que la barra inferior fija (`BottomNav`, `position: fixed`) deja "reservado" — el botón "Confirmar venta" quedaba visualmente tapado por la barra, aunque seguía siendo clickeable (confirmado con la venta real que hizo el usuario, que funcionó a pesar de la superposición visual).

Se probó primero `scrollIntoView()` en un `useEffect` al activar el toggle — **no funcionó**: un elemento `position: fixed` no participa del cálculo de intersección de `scrollIntoView`, así que el navegador considera al botón "ya visible" aunque una barra fija lo tape encima, y no scrollea nada. Se reemplazó por `window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })`, verificado con un script de diagnóstico aparte (mide `getBoundingClientRect` del botón y de la barra antes/después) — confirmado que con el fix el botón (top 722/bottom 758) queda claramente por encima de la barra (top 811/bottom 844), sin superposición.

## Cómo se verificó

- **Playwright** (`pwa/t25-04-carrito-factura.mjs`, viewport de celular real 390×844): login → escaneo manual → Ficha → agregar a la venta → Carrito → confirma que el toggle y los 3 campos aparecen, que el botón se deshabilita con datos incompletos y se habilita al completarlos → confirma la venta contra homologación real (org descartable con la config AFIP de Eliathi copiada) → verifica por SQL que el pedido quedó `paid` y la factura `emitida` con CAE real. **13/13 PASS.**
- **Manual, por el usuario**: venta real contra la organización real de Eliathi (producto real "ZARA — Sweter de algodón"), factura emitida con CAE real (`86360853855069`, comprobante #13) — confirmó además el hallazgo ya documentado en la Fase 3 de que el email no llega por la restricción de modo de prueba de Resend (no es un bug de esta fase).

## Definition of Done

- [x] Confirmar una venta con el toggle apagado no pide ningún dato nuevo ni cambia el payload enviado — cero regresión sobre T23.
- [x] Confirmar una venta con el toggle activo y datos completos manda el bloque `factura` correctamente — CAE real obtenido en ambas verificaciones (automatizada y manual).
- [x] Intentar confirmar con el toggle activo y datos incompletos bloquea el botón antes de llamar al backend (los tres campos, no solo el email).

## Dependencias

- **La bloquean**: Fase 2 — ya resuelta.
- **Bloquea**: Fase 5 (la pantalla de confirmación ya recibe `factura` en el estado `Screen`, lista para mostrarla). **Desbloqueada.**
