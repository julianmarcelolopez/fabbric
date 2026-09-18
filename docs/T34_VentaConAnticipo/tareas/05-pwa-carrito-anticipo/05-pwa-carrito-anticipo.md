# Tarea 5 — PWA: Carrito con anticipo

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

En Docker local (`docker compose up -d pwa`): venta con anticipo de punta
a punta —cliente nuevo creado en el momento, monto parcial, fecha
límite— y confirmar que la Ficha de "Venta registrada" refleja el saldo,
no el total. El resto de los medios de pago (efectivo/transferencia/
tarjeta/mercadopago) se comportan exactamente igual que antes.

## Dependencias

- **La bloquean:** Tarea 2, Tarea 3.
- **Bloquea:** nada — la Tarea 6 depende de la Tarea 4, no de esta.
