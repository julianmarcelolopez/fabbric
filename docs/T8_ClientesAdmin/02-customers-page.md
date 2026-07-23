# Tarea 2 — `CustomersPage` (tabla + detalle con historial clickeable)

**Estado:** ✅ Completada (2026-07-10)
**Depende de:** [01-endpoints-clientes.md](01-endpoints-clientes.md)

## Objetivo

La vista de clientes del admin, conectada con la gestión de pedidos de T7.

## Pasos

- [x] Entrada "Clientes" en el sidebar (después de Pedidos), rutas `/admin/customers` y `/admin/customers/:id`
- [x] `CustomersPage.tsx`: buscador (nombre/email) + tabla: nombre, email, teléfono, pedidos, total gastado, última compra — fila clickeable al detalle
- [x] `CustomerDetailPage.tsx`: datos de contacto completos (incluida dirección) + historial de pedidos con badges de estado/tipo — **cada pedido linkea a `/admin/orders/:id`** (la gestión de T7)
- [x] Estados de carga/error consistentes con el resto del admin

## Definition of Done

- [x] Typecheck limpio; Vite compila
- [ ] Verificación en navegador → tarea 3

## Notas de ejecución (2026-07-10)

- Buscador con **debounce de 300 ms** contra el `?search=` del endpoint (filtra el servidor, no el cliente) — placeholder "Nombre o email…".
- Tipos nuevos en `types.ts`: `AdminCustomerRow` extendido con las métricas (compatible con el selector del alta manual de T7, que sigue usando el mismo endpoint) + `AdminCustomerDetail`/`AdminCustomerOrder`.
- Fila entera clickeable (`onClick` → navigate) y además el nombre es `Link` (accesible / abrir en otra pestaña); badges de estado y tipo reutilizan `ADMIN_ORDER_STATUS` / `ADMIN_ORDER_TYPE_LABELS` de T7.
- `tsc --noEmit` limpio en el contenedor frontend; Vite tomó todo por HMR sin errores.
