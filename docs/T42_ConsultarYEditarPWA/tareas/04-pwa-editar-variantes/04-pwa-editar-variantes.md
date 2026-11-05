# Tarea 4 — PWA: `EditarScreen.tsx`, sección "Variantes"

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 1 (guard real para editar/borrar), Tarea 3
(pantalla base + fetch del producto completo ya resueltos).

## Objetivo (según `plan.md`, sección "Qué cambia concretamente")

Completar la segunda sección de `EditarScreen.tsx`: listar, editar,
borrar y agregar variantes del producto — mismo criterio de
solo-lectura para `staff`.

## Alcance

- Sección "Variantes": lista de variantes del producto (talle/color/
  barcode/stock, ya traídas por `GET /admin/products/:id` en la
  Tarea 3) con:
  - Editar (talle/color/sku/barcode/priceOverride) vía
    `PATCH /admin/variants/:id`.
  - Borrar vía `DELETE /admin/variants/:id`.
  - Agregar vía `POST /admin/products/:id/variants`.
- Conflicto de barcode duplicado (409) se muestra como error, igual
  que en `AltaScreen.tsx`.
- Color opcional ya es el comportamiento por defecto en todo el stack
  (T43) — no hace falta ningún manejo especial acá, el campo color
  simplemente puede quedar vacío al editar o agregar.
- Si `role === "staff"`: la sección se muestra igual pero sin ningún
  control editable ni botones de guardar/borrar/agregar — mismo
  aviso fijo que en "Datos".

## Criterio de aceptación

- `tsc --noEmit` limpio en `pwa/`.
- Con un usuario `owner`: editar/agregar/borrar una variante persiste
  (confirmar recargando/re-escaneando).
- Con un usuario `staff`: la sección se ve completa pero de solo
  lectura, sin forma de tocar nada.
- `PATCH /admin/variants/:id` y `DELETE /admin/variants/:id` devuelven
  403 con un token de `staff` (confirmar con `curl`/script).
- Un barcode duplicado al editar/agregar muestra el mismo error 409
  que ya maneja el resto del sistema, sin romper la pantalla.
- El alta por escaneo (`AltaScreen.tsx`, que también llama
  `POST /admin/products/:id/variants` para `staff`) sigue funcionando
  exactamente igual — no se tocó ese endpoint.
- Verificado en el navegador/celular, no solo por tipos.

## Dependencias

- **La bloquean:** Tarea 1, Tarea 3.
- **Bloquea:** ninguna.
