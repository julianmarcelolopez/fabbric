# 06 — Auto-crear la sección del home al crear una categoría

## Qué se cambia

Al crear una categoría nueva (`POST /admin/categories`), el backend crea automáticamente su `home_section` correspondiente (`visible: true`), en la misma operación — sin que el admin tenga que ir a una pantalla separada a agregarla a mano. "Mi tienda"/Home pasa a ser el lugar para reordenar u ocultar secciones, no para el alta inicial.

## Referencia visual

Ninguna pantalla del mockup muestra este cambio directamente — es lógica de backend, invisible en la UI salvo por su efecto: en Pantalla 4 (Mi tienda), las secciones ya aparecen creadas y visibles por default, sin que el admin haya tenido que agregarlas manualmente.

## Referencia en T18

- `01-flujo-critico.md` 🔴 — "El producto no aparece en la tienda sin un paso manual, desconectado y no anunciado: 'Home'" — quick win explícito: "Auto-crear la `home_section` (visible) al crear la primera categoría de la org — resuelve el hallazgo 🔴 más grave sin agregar ningún paso al flujo."

## Archivos a modificar

- `backend/src/modules/categories/routes.ts` — en el handler de `POST /admin/categories`, insertar la `home_section` correspondiente en la misma transacción que crea la categoría.
- `backend/src/modules/homeSections/routes.ts` — revisar si conviene extraer la lógica de creación de sección a una función compartida (hoy la creación de secciones vive ahí, llamada desde el flujo manual de "Home"); si `categories/routes.ts` necesita reusarla, puede hacer falta un `service.ts` nuevo para `homeSections` (hoy ese módulo no tiene uno).
- `backend/src/db/schema.ts` — sin cambios de esquema (la tabla `home_sections` ya existe desde T3).

## Criterio de completado

- Crear una categoría nueva desde `POST /admin/categories` genera automáticamente su `home_section` con `visible: true`, verificado consultando la DB directamente (no solo por la respuesta del endpoint).
- La unicidad existente (`home_sections_org_ref_unique`) sigue protegiendo contra duplicados si por algún motivo se llama dos veces.
- No rompe el flujo manual existente de "Home" (agregar colecciones sigue siendo manual, ya que las colecciones no se auto-agregan — ver Notas).
- `tsc --noEmit` limpio en backend; verificado con un test real (crear categoría → confirmar que aparece en `GET /admin/home-sections` sin pasos adicionales).

## Notas

- **Alcance deliberadamente acotado a categorías, no a colecciones**: una colección puede no estar pensada para mostrarse en el home (ej. una colección interna de temporada armada de a poco) — el hallazgo de T18 es específicamente sobre categorías, que sí se espera que representen la estructura visible de la tienda. Confirmar este criterio con el usuario antes de implementar si hay dudas.
- Es el cambio de mayor impacto de todo T19 en relación a su costo — resuelve el hallazgo más grave de todo T18 con un cambio de backend acotado, sin tocar frontend.
- Compatibilidad: no afecta categorías ya existentes (no hay backfill en el alcance de esta tarea) — si se quiere que las categorías ya creadas por Eliathi Modas también tengan su sección, es un paso manual aparte o un script de backfill a decidir con el usuario, no parte de esta tarea.
