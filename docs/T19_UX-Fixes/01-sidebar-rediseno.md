# 01 — Rediseño del sidebar

## Qué se cambia

El sidebar del admin pasa de una lista plana de 12 links (Dashboard, Categorías, Colecciones, Productos, Stock, Pedidos, Clientes, Finanzas, Home, Envíos, Tienda, Configuración) a una versión agrupada por sección (Panel / Catálogo / Mi tienda / Ventas / Configuración), con un widget de estado de la tienda ("Tienda activa" con link) debajo de la marca. Categorías, Colecciones y Stock dejan de tener su propio link — pasan a ser tabs dentro de Productos (ver `02-productos-con-tabs.md`); Home y Tienda se fusionan en un solo link "Mi tienda" (ver `07-mi-tienda-unificado.md`).

Esta tarea también agrega el breakpoint mobile que hoy no existe: por debajo de un ancho definido (a decidir en la implementación, ~768px), el sidebar colapsa a un menú accesible por botón en vez de ocupar 220px fijos — el hallazgo 🔴 de `05-mobile.md` está condicionado a verificación visual, pero como esta tarea ya toca `admin.css` de punta a punta, conviene resolverlo acá en vez de abrir una tarea aparte.

## Referencia visual

Pantalla 1 (Dashboard), Pantalla 2 (Productos), Pantalla 3 (Alta de producto), Pantalla 4 (Mi tienda) — el sidebar nuevo aparece en las 4, con los grupos "Panel / Catálogo / Mi tienda / Ventas / Configuración" y el widget de estado "Tienda activa". El mockup no muestra una versión mobile colapsada del sidebar (todas las pantallas están mockeadas en ancho desktop) — el comportamiento mobile queda a criterio de esta tarea, no del mockup.

## Referencia en T18

- `02-panel-admin.md` — contexto general de organización del panel (Envíos al final del sidebar sin señal, entre otros).
- `05-mobile.md` 🔴 — "El panel admin entero usa un sidebar fijo de 220px, sin colapsar en mobile" (inferido del CSS, no observado en dispositivo real).

## Archivos a modificar

- `frontend/src/features/admin/AdminLayout.tsx` — estructura de grupos, widget de estado, links actualizados (sacar Categorías/Colecciones/Stock/Home sueltos).
- `frontend/src/features/admin/admin.css` — estilos del sidebar agrupado + breakpoint mobile.
- `frontend/src/router.tsx` — depende de qué decidan `02` y `07` sobre las rutas que desaparecen (no tocar acá si esas tareas no están hechas todavía; ver Notas).

## Criterio de completado

- El sidebar muestra los 5 grupos con los links que corresponden después de `02` y `07` (o, si se hace antes, con los links viejos agrupados igual — ver Notas sobre orden).
- `tsc --noEmit` limpio en frontend.
- Verificado en un iPhone real (o simulador de Chrome DevTools a 390px): el sidebar no ocupa 220px fijos, hay una forma de acceder a la navegación sin que el contenido quede en ~170px de ancho.
- Verificado en desktop que no se rompió nada de la navegación existente.

## Notas

- **Orden con 02 y 07**: esta tarea puede hacerse antes de que existan las tabs de Productos o la pantalla unificada de Mi tienda — en ese caso, el sidebar queda con los links viejos pero ya agrupados visualmente, y se actualiza de nuevo cuando 02/07 estén listas. Evaluar con el usuario si conviene hacer 01 después de 02 y 07 para no tocar el mismo archivo dos veces.
- El widget "Tienda activa" necesita saber el estado real de `catalog_configs.active` — dato que ya viene en `GET /admin/catalog-config` (usado hoy en `CatalogConfigPage`), no hace falta un endpoint nuevo.
- El breakpoint mobile es una decisión de diseño no resuelta por el mockup — usar un patrón estándar (menú hamburguesa + overlay) es razonable, pero confirmar con el usuario antes de implementar si prefiere otra solución (ej. bottom nav).
