# Tarea 4 — Ficha de producto

**Estado:** ✅ Hecha (2026-08-17) — ya estaba prácticamente completa desde la Tarea 2, verificada ahora de punta a punta con datos reales
**Depende de:** Tarea 2 (`02-escaneo`)

## Objetivo

Mostrar los datos de un producto ya existente al escanearlo, con su stock local actual. Las acciones reales ("Registrar entrada" / "Agregar a la venta") todavía no hacen nada — se completan en las Fases 04 y 05 del plan general — pero tienen que estar presentes como placeholder para no romper la navegación ni la continuidad visual con `mockups.html`.

## Nota

`FichaScreen.tsx` ya se había escrito, casi completa, durante la Tarea 2 (necesitaba mostrar algo real para poder probar el flujo `by-barcode` de punta a punta). Esta tarea no agregó código nuevo — verificó lo que ya existía contra los dos casos reales que le faltaban probar (producto con foto y sin foto) y documentó el resultado.

## Pasos

- [x] Pantalla Ficha: recibe los datos ya resueltos por `GET /admin/variants/by-barcode/:code` en la Tarea 2 (no vuelve a pedirlos) — foto (o placeholder si no tiene), marca, talle, color, precio, `stockLocal`.
- [x] Botones "Registrar entrada" y "Agregar a la venta": presentes, `disabled` (opción elegida en vez de un mensaje "Próximamente" al tocar — al estar deshabilitados, no hay forma de que rompan nada ni de que se toquen por error).
- [x] Botón/gesto para volver a Escanear (`←`).

## Definition of Done

- [x] Escanear un código existente muestra la Ficha con los datos reales del producto (no datos de prueba hardcodeados) — verificado con dos productos reales insertados por SQL (marca, nombre, talle, color, precio y stock, todos correctos).
- [x] Si el producto no tiene foto, se ve el placeholder "Sin foto", no un ícono roto — verificado con un producto real sin `productImages`.
- [x] Tocar los botones placeholder no genera errores de consola ni pantallas en blanco — confirmado que están `disabled` (no se pueden tocar) y que no aparece ningún error de consola en toda la sesión de prueba.
- [x] Volver a Escanear funciona correctamente — verificado dos veces (una por cada caso).
- [x] Probado en navegador contra datos reales del backend.

## Cómo se verificó

- **Playwright** (`test-ficha.mjs`, script de sesión) contra una org temporal con dos productos reales (uno con foto y stock 7, otro sin foto y stock 1), insertados directamente por SQL para tener control total sobre los valores esperados. Login real, entrada manual de cada `barcode`, chequeo de cada dato mostrado en pantalla (marca, nombre, talle, color, precio formateado, stock, presencia/ausencia de `<img>`), estado `disabled` de ambos botones placeholder, y navegación de vuelta a Escanear. **15/15 PASS**, cero errores de consola.
- **Limpieza**: se borraron `product_images`, `product_variants`, `products`, `categories`, `admin_users`, `organizations` (la org temporal) por SQL, y el usuario de Supabase Auth de prueba (`auth.admin.deleteUser`). No quedó ningún dato de prueba en la base real.

## Dependencias

- **La bloquean**: Tarea 2 (`escaneo`) — necesita los datos ya resueltos por esa pantalla.
- **Bloquea**: Fase 04 (Registrar entrada) y Fase 05 (Agregar a la venta) del plan general — van a reemplazar los botones placeholder de acá por la funcionalidad real.
