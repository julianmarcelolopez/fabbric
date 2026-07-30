# 08 — Alta de producto en pasos guiados

## Qué se cambia

`ProductEditPage` se rediseña como un flujo guiado de 3 pasos con indicador de progreso (Datos básicos → Variantes → Fotos), en vez de un formulario largo de una sola tirada. Cada paso muestra solo lo que corresponde, con la vista previa en vivo (ya existente) siempre visible al costado. El botón principal pasa de "Guardar cambios" a "Guardar y publicar", reforzando que completar el flujo es lo que hace que el producto quede realmente disponible (en conjunto con `06`, que ya resuelve la visibilidad en el home sin pasos extra).

## Referencia visual

Pantalla 3 (Alta de producto) — barra de progreso superior con 3 círculos numerados (1 Datos básicos, activo; 2 Variantes, pendiente; 3 Fotos, pendiente) conectados por líneas, y un botón "Guardar y publicar" fijo abajo (`form-actions`, sticky). El bloque de Variantes incluye el aviso de `04-aviso-sin-variantes.md` embebido directamente en el paso 2.

## Referencia en T18

- `01-flujo-critico.md` 🔴 (los dos hallazgos) — "Producto sin variante = no se puede comprar" y, en conjunto con `06`, el hallazgo de "Home" — el objetivo combinado es acortar la percepción de los 11 pasos documentados en el resumen ejecutivo de `06-ux-review.md`.
- `06-ux-review.md` — resumen ejecutivo: "11 pasos... muy por encima del principio de máximo 3 pasos para cualquier tarea crítica".

## Archivos a modificar

- `frontend/src/features/admin/pages/ProductEditPage.tsx` — reestructurar en pasos, con estado de paso activo y navegación entre ellos.
- Nuevo componente, ej. `frontend/src/features/admin/components/ProductWizardSteps.tsx` — indicador de progreso reusable (nombre y ubicación a definir en la implementación).
- `frontend/src/features/admin/admin.css` — estilos del indicador de progreso y de los pasos.
- `frontend/src/features/admin/components/VariantEditor.tsx` — sin cambios de lógica, se reubica dentro del paso 2.
- `frontend/src/features/admin/components/ImageDropzone.tsx` — sin cambios de lógica, se reubica dentro del paso 3.

## Criterio de completado

- Los 3 pasos son navegables (adelante/atrás) sin perder los datos ya cargados en pasos anteriores.
- El paso de Variantes incluye la alerta de `04` (o la reusa si ya existe).
- La vista previa en vivo sigue funcionando igual que hoy en cualquier paso.
- `tsc --noEmit` limpio; verificado en navegador creando un producto de punta a punta usando el flujo de 3 pasos.

## Notas

- **Depende de `04-aviso-sin-variantes.md`** si se quiere evitar reimplementar la misma alerta dos veces — conviene hacer `04` primero, aunque no es estrictamente bloqueante (se puede hacer la alerta acá directamente si `04` todavía no está lista).
- Es la tarea de mayor esfuerzo de todo el Sprint 2 — a diferencia de `04`/`05`/`06` (cambios acotados a un archivo o dos), esta reestructura el editor de producto completo. Vale la pena confirmar el diseño exacto de los 3 pasos con el usuario antes de arrancar la implementación, no asumir que el mockup es la especificación final.
- No cambia ningún endpoint del backend — sigue siendo el mismo `PATCH /admin/products/:id` + `POST /admin/products/:id/variants` + upload de imágenes, solo se reorganiza cuándo se muestra cada parte del formulario.
