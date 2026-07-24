# Tarea 3 — Definition of Done de T11

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** tareas 1 a 2

## Objetivo

Cerrar T11 con el criterio de `docs/plan_2.md`: *producto con `compareAtPrice` cargado se ve con precio tachado + precio final en el card y en el detalle, en la tienda pública*.

## Checklist final (usuario, en navegador)

- [x] Cargar "Precio anterior ($)" en un producto desde `/admin/products/:id` → mientras tipeás (sin guardar todavía), el panel "Vista previa" al lado muestra el precio tachado + el final.
- [x] Guardar → recargar la página → el campo sigue cargado y el preview lo sigue mostrando.
- [x] Ese producto está en una sección del home → entrar a `/admin/home` (preview del admin) → el card lo muestra tachado.
- [x] Abrir la tienda pública real (`/store/:slug`) → el mismo card en la portada muestra el tachado.
- [x] Entrar al detalle de ese producto en la tienda (`/store/:slug/p/:id`) → tachado + precio final.
- [x] Variante con `priceOverride` propio → el tachado desaparece; volver al precio base → reaparece.
- [x] Un producto SIN precio anterior cargado se ve exactamente igual que siempre en los 4 lugares.
- [x] Consola limpia (F12) en las 4 pantallas.

## Resultado (2026-07-24)

Verificado en navegador por el usuario, punto por punto. Apareció un defecto visual real durante la verificación: `.pcard-price-original` (el precio tachado en las grillas del home) no tenía reducción de tamaño de fuente — salía del mismo tamaño que el precio final, sin la jerarquía visual que sí tenía `.pdv-price-original` en el detalle. Corregido (`font-size: 0.75em`) y reverificado — quedó bien. **Criterio de la fase cumplido.**

## Al cerrar

- [x] Actualizar README de T11 + memoria; sugerir commit (`feat: t11 precio con descuento`).
