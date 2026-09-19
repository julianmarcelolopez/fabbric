# Tarea 7 — Admin: cobrar saldo en detalle de pedido

**Estado:** ✅ Hecha (2026-09-18) — verificada en vivo por el usuario (tarjeta "Saldo pendiente" en el pedido #32: Total/Pagado/Saldo/fecha límite y formulario de cobro, todo correcto).

**Depende de:** Tarea 4. (Rama independiente de la PWA — no depende de las
Tareas 5/6, puede hacerse en paralelo.)

## Objetivo (según `plan.md`, T34/Fase 7)

El mismo cobro de saldo que la PWA (Tarea 6), pero desde el admin de
escritorio — para el caso "el cliente transfiere" (decisión 1 de
`analisis.md`).

## Alcance

`frontend/src/features/admin/pages/OrderAdminDetailPage.tsx`:

- Nueva sección "Saldo pendiente" (visible solo si `order.status ===
  "partial"`), junto a la sección "Acciones" existente (línea 235-289):
  total, `pagado`, `saldoPendiente`, `balanceDueDate` (en rojo si venció)
  — todos ya vienen en el response de `GET /admin/orders/:id` (Tarea 4).
- Formulario "Cobrar saldo": monto + `<select>` de medio de pago
  (`efectivo`/`transferencia`/`tarjeta`/`mercadopago`).

**Ojo con el patrón a NO calcar**: "Cobrar (venta manual)" (línea
245-253, `mark-paid`) usa un `<select>` de `walletId` — una cartera
elegida a mano por el admin. El de acá es distinto: el medio de pago
resuelve la cartera **del lado del servidor**, igual que la PWA (mismo
endpoint, mismo contrato — decisión 1 del análisis). No mezclar los dos
patrones.

## Resultado real

Implementado tal cual el alcance — `SaldoPendienteCard`, componente aparte
(mismo criterio que `InvoiceCard`, ya existente en el archivo, tiene su
propio estado de formulario) insertado entre "Ítems" y la tarjeta de
factura, visible solo si `order.status === "partial"`. Reusa
`pesosToCents`/`centsToPesosInput` (`frontend/src/lib/money.ts`, mismos
helpers que ya usa la PWA — copiados ahí en su momento desde acá). El
`<select>` de medio de pago resuelve la cartera del lado del servidor
(igual que la PWA), sin mezclarse con el patrón de `walletId` de "Cobrar
(venta manual)" que ya existía en la página.

`npx tsc --noEmit` limpio dentro del contenedor Docker.

## Criterio de aceptación

Pendiente de verificación visual — servidor dev ya corriendo
(`http://localhost:5173`). Cobrar el saldo de un pedido `partial` desde el
admin (no la PWA) y confirmar que pasa a `paid`, con el mismo
comportamiento que la Tarea 6 probó desde la PWA — es el mismo endpoint,
así que alcanza con un caso real, no hace falta repetir toda la matriz de
pruebas.

## Dependencias

- **La bloquean:** Tarea 4.
- **Bloquea:** nada.
