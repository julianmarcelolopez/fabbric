# Tarea 5 — PWA: Carrito con anticipo

**Estado:** ✅ Hecha (2026-09-18) — verificada en vivo por el usuario (búsqueda/alta de cliente, monto/saldo en vivo, confirmación con resumen de anticipo, thumbnail de producto agregado y confirmado).

**Depende de:** Tarea 2, Tarea 3 (no necesita `cobrar-saldo`, solo crear
la venta).

## Objetivo (según `plan.md`, T34/Fase 5)

Que el vendedor pueda cerrar una venta puerta a puerta con anticipo desde
la PWA: elegir el medio de pago "Anticipo", identificar al cliente (nuevo
o existente), y guardar cuánto paga ahora + fecha límite del resto.

## Alcance

`pwa/src/screens/CarritoScreen.tsx` (después de T33: el selector de medio
de pago ya vive como pestaña segmentada dentro del tab "Forma de pago",
`MEDIOS: { value: MedioPago; label: string }[]`):

- `MEDIOS` pasa a tipar `VentaLocalMedioPago` (Tarea 1) y suma
  `{ value: "anticipo", label: "Anticipo" }`.
- Al elegir "Anticipo", debajo del selector:
  - Buscador de cliente: debounce 300ms sobre `GET
    /admin/customers?search=` (mismo patrón que
    `CustomersPage.tsx:14-31`, no el `<select>` sin búsqueda de T7) + opción
    "Crear cliente nuevo" (nombre + teléfono, `POST /admin/customers` de
    la Tarea 2) si la búsqueda no encuentra a nadie.
  - Input "Monto que paga ahora" (tope = `total`, muestra "Saldo
    pendiente: $X" en vivo, calculado en el cliente).
  - Selector de fecha "Fecha límite para el saldo" (`<input type="date">`,
    sin librería nueva).
- "Confirmar venta" deshabilitado hasta completar los 3 campos cuando
  `medioPago === "anticipo"` (mismo patrón de `disabled` que ya usa el
  botón para `facturaIncompleta`).
- `App.tsx` (`medioPago` state, línea 48) pasa a tipar
  `VentaLocalMedioPago`; el body que arma `confirmVenta()` (línea
  ~103-113) suma `montoPagado`/`customerId`/`balanceDueDate` cuando
  corresponde.
- `ConfirmarScreen.tsx` — `MEDIO_LABELS` (línea 7-12) suma `anticipo:
  "Anticipo"`; si `medioPago === "anticipo"`, el resumen muestra "Anticipo
  $X de $Y — saldo $Z" en vez de solo el total (dato ya disponible en el
  response de `venta-local`, sin fetch extra).

## Resultado real

Implementado tal cual el alcance. Detalles de diseño resueltos al
implementar (no estaban 100% cerrados en el plan):

- `montoPagado`/`balanceDueDate`/`customerId`/`customerName` se levantaron
  a `App.tsx` como estado controlado (mismo patrón que `facturar`/
  `facturaForm`), porque `confirmVenta()` los necesita para armar el body.
  El texto de búsqueda de cliente y los resultados quedaron **locales** a
  `CarritoScreen` — solo el cliente ya elegido sube.
- El buscador desaparece y se reemplaza por una fila "seleccionado, con
  botón Cambiar" una vez que hay `customerId` — evita que el vendedor siga
  viendo el buscador con un cliente ya elegido.
- "Crear cliente nuevo" es un link que despliega un mini-formulario
  (nombre + teléfono) inline, no una pantalla aparte — `POST
  /admin/customers` (Tarea 2) y al confirmar selecciona automáticamente al
  cliente recién creado.
- `montoPagado > total` se trata como parte de "incompleto" (bloquea
  "Confirmar venta", con mensaje propio), no solo los 3 campos vacíos —
  agregado al implementar, no estaba explícito en el plan.
- `ConfirmarScreen` necesitó un campo nuevo (`montoPagado`) en el estado
  `Screen["confirmar"]` de `App.tsx` para poder mostrar "Anticipo $X de $Y
  — saldo $Z" — no alcanzaba con lo que ya viajaba en el response de
  `venta-local` sin guardarlo aparte en el estado de navegación.
- Reusa `pesosToCents`/`centsToPesosInput` (`pwa/src/lib/money.ts`), ya
  existentes — no hizo falta un parser nuevo para el input de monto.

`npx tsc --noEmit` y `npx vite build --mode production` limpios dentro del
contenedor Docker.

**Extra encontrado en la verificación visual (no estaba en el plan)**: el
usuario notó que la fila de cada ítem del carrito no mostraba la foto del
producto. Se agregó `imageUrl` a `CartItem` (ya viene en
`VariantByBarcode` al escanear, `App.tsx` lo copia tal cual en
`addToCart` — sin pedirlo de nuevo al backend) y un thumbnail de 52×52 a
la izquierda de cada fila — mismo lenguaje visual que la foto grande de
`FichaScreen` (fondo `colors.gray` placeholder, `objectFit: cover`,
`borderRadius` del tema), solo que chico y a la izquierda en vez de grande
y centrado, patrón estándar de carrito.

## Criterio de aceptación

Pendiente de verificación visual — servidor dev ya corriendo
(`http://localhost:5174`). En Docker local: venta con anticipo de punta a
punta —cliente nuevo creado en el momento, monto parcial, fecha límite— y
confirmar que la pantalla de "Venta registrada" refleja el saldo, no el
total. El resto de los medios de pago (efectivo/transferencia/tarjeta/
mercadopago) debería comportarse exactamente igual que antes.

## Dependencias

- **La bloquean:** Tarea 2, Tarea 3.
- **Bloquea:** nada — la Tarea 6 depende de la Tarea 4, no de esta.
