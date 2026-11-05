# Tarea 3 — PWA: `EditarScreen.tsx`, sección "Datos"

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 1 (guard real para colecciones), Tarea 2
(modo/tipo de pantalla/rol ya resueltos).

## Objetivo (según `plan.md`, sección "Qué cambia concretamente")

Crear la pantalla real de edición con su primera sección (Datos
básicos del producto + colecciones), con el mismo criterio de
solo-lectura para `staff` que el resto de la feature.

## Alcance

- Nueva `pwa/src/screens/EditarScreen.tsx` con los 3 sub-tabs
  (Datos/Variantes/Fotos, ver mockup) — en esta tarea solo se
  completa "Datos"; "Variantes"/"Fotos" quedan como placeholder
  vacío hasta las Tareas 4 y 5.
- Al entrar: `GET /admin/products/:id` (con `variant.product.id`,
  disponible en el `VariantByBarcode` del escaneo) para traer el
  producto completo — `categoryId`, `brandId`, `costPrice`,
  `compareAtPrice`, `installmentsText`, `description`, `status`,
  `visibleInCatalog`, `collections`, además de `variants`/`images`
  (que usan las Tareas 4/5).
- Sección "Datos": nombre, marca (select, mismo patrón que
  `AltaScreen.tsx` con `GET /admin/brands`), categoría (select,
  `GET /admin/categories`), estado, precio, costo interno, precio
  anterior, cuotas/leyenda, descripción — todo vía
  `PATCH /admin/products/:id` (solo los campos que cambiaron).
  Colecciones vía `PUT /admin/products/:id/collections`.
- Si `role === "staff"`: la sección se muestra igual pero sin ningún
  control editable ni botón "Guardar" — aviso fijo arriba ("Solo
  lectura — tu rol no puede modificar").

## Criterio de aceptación

- `tsc --noEmit` limpio en `pwa/`.
- Con un usuario `owner`: editar cualquier campo de "Datos" y
  guardar persiste (confirmar recargando/re-escaneando).
- Con un usuario `staff`: la sección se ve completa pero de solo
  lectura, sin forma de guardar nada.
- `PUT /admin/products/:id/collections` devuelve 403 con un token de
  `staff` (confirmar con `curl`/script, no solo desde la UI).
- Verificado en el navegador/celular, no solo por tipos.

## Dependencias

- **La bloquean:** Tarea 1, Tarea 2.
- **Bloquea:** Tarea 4, Tarea 5 (mismo archivo `EditarScreen.tsx`,
  se construye encima de esta base).
