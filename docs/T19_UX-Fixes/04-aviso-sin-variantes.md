# 04 — Aviso inline cuando el producto no tiene variantes

## Qué se cambia

En la ficha de edición de producto, el bloque de Variantes muestra una alerta inline visible ("Sin al menos una variante, tus clientes no van a poder agregar el producto al carrito") mientras el producto no tenga ninguna variante cargada — en vez de que el único indicio sea la vista previa lateral o, peor, la tienda pública.

## Referencia visual

Pantalla 3 (Alta de producto) — dentro de la tarjeta "Variantes (talle / color)", justo debajo del título, una alerta ámbar: "⚠️ Sin al menos una variante, tus clientes no van a poder agregar el producto al carrito."

## Referencia en T18

- `01-flujo-critico.md` 🔴 — "Producto sin variante = no se puede comprar, y el aviso llega demasiado tarde" — quick win explícito: "Aviso inline en `ProductEditPage` cuando el producto no tiene variantes".

## Archivos a modificar

- `frontend/src/features/admin/pages/ProductEditPage.tsx` — agregar el bloque de alerta condicionado a `product.variants.length === 0`, ubicado junto a `VariantEditor`.
- `frontend/src/features/admin/admin.css` — clase de alerta ámbar si no existe ya un patrón reusable (revisar si conviene compartir estilo con `05-aviso-zona-envio.md`, que es una alerta del mismo tipo en otra pantalla).

## Criterio de completado

- La alerta aparece cuando `variants.length === 0` y desaparece apenas se agrega la primera variante, sin necesidad de recargar la página.
- `tsc --noEmit` limpio.
- Verificado en navegador: crear un producto nuevo, confirmar que la alerta está visible antes de agregar variantes y que desaparece después.

## Notas

- Cambio pequeño y autocontenido — buen candidato para hacerse primero dentro del Sprint 1, ya que no depende de ninguna otra tarea de esta lista.
- Si `02-productos-con-tabs.md` ya agregó el badge "Sin variantes" en el listado, esta tarea puede reusar la misma condición de detección (`variants.length === 0`) para mantener consistencia entre el listado y la ficha.
