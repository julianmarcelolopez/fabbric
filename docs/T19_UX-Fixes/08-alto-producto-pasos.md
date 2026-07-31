# 08 — Alta de producto en pasos guiados

**Estado:** ✅ Completa (2026-07-30)

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

## Resultado

Decisión de diseño del usuario antes de implementar — **guardado por paso (Opción A)**: paso 1→2 persiste datos básicos (mismo PATCH que existía), paso 2→3 no necesita PATCH propio (las variantes ya se guardan una por una al agregarlas, sin cambios), y "Guardar y publicar" en el paso 3 hace el PATCH final que marca el producto como visible.

- **Producto nace como borrador**: `ProductsPage.tsx` ahora manda `visibleInCatalog: false` explícito al crear (antes no se mandaba nada y el default del schema era `true`) — cambio 100% frontend, `createProductSchema` ya aceptaba el campo. Confirmado por API antes de tocar el navegador: producto creado con `visibleInCatalog: false`.
- **`ProductEditPage.tsx`** reescrita: estado `step` (1/2/3), formulario de "Datos básicos" recortado (se sacó el checkbox manual "Visible en catálogo" — ahora la visibilidad la gobierna únicamente el botón de publicar, para no tener dos mecanismos controlando el mismo campo). El paso 2 reusa tal cual la alerta de `04` y `VariantEditor` sin tocar su lógica; el paso 3 reusa `ImageDropzone` sin tocar su lógica y agrega el botón "Guardar y publicar" (`PATCH { visibleInCatalog: true }`). La vista previa (`ProductDetailView`) quedó fuera del `switch` de pasos, visible en los 3 — tal como pidió el usuario.
- **`WizardSteps`**: componente local al archivo (no un archivo aparte como sugería la tarea originalmente) — se usa en un solo lugar, así que crear un archivo propio era indirección de más; los 3 círculos son clickeables pero solo hacia atrás o hacia un paso ya completo (`s.n <= step || s.done`), nunca salteando uno pendiente.
- **`admin.css`**: clases nuevas `.wizard-steps`/`.wizard-circle`/`.wizard-line`/etc.
- Corregí en el camino un diseño de más: mi primer borrador hacía que `WizardSteps` avisara al padre con un `window.dispatchEvent(CustomEvent)` en vez de recibir un callback por prop — over-engineering sin necesidad real (el componente se usa una sola vez), lo cambié a un `onGoto` prop directo antes de terminar.

**Verificación real en navegador, los 3 escenarios pedidos** (usuario, con la org real):
1. **Producto de punta a punta**: "Jeans Recto" — creado → paso 1 completado → paso 2 con una variante agregada → paso 3 con una foto subida → "Guardar y publicar" → el badge "Borrador" desapareció.
2. **Cerrar a mitad del paso 2 y volver**: "Zapatillas Deportivas" — paso 1 completado (nombre, precio, categoría), sin llegar a agregar variante, navegación fuera de la página. Al volver, el listado mostró el producto con nombre/precio/categoría intactos, "Visible: No" y badge "sin variantes" — confirma que el paso 1 quedó realmente persistido en el backend, no solo en memoria.
3. **Aparece en la tienda real**: `/store/eliathi-modas` mostró "Jeans Recto" después de publicado.

Ambos productos de prueba ("Jeans Recto", "Zapatillas Deportivas") se dejaron como están, a pedido del usuario — no son datos descartables, quedan como productos reales de la demo.

`tsc --noEmit` y `vite build` limpios.
