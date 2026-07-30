# 07 — "Mi tienda" unificado (Home + Configuración + vista previa en vivo)

## Qué se cambia

`HomeSectionsPage` (`/admin/home`) y `CatalogConfigPage` (`/admin/config`) se fusionan en una sola pantalla "Mi tienda": panel de configuración a la izquierda (secciones visibles con reorden/toggle, banner, identidad — nombre y color) y una vista previa en vivo de la tienda pública real a la derecha, que se actualiza mientras se edita. Se agregan botones "Copiar link" y "Compartir en Instagram" arriba de todo.

## Referencia visual

Pantalla 4 (Mi tienda) — panel izquierdo con "Secciones visibles" (drag handle + nombre + cantidad de productos + toggle), "Banner principal" (dropzone) e "Identidad" (nombre de tienda, color); panel derecho con la vista previa real de la tienda (topbar, banner, secciones con productos) dentro de un marco de ~480px simulando mobile.

## Referencia en T18

- `01-flujo-critico.md` (mejora estructural) — "Unificar Categorías, Colecciones y Home en un único flujo guiado de 'publicar mi tienda'" (la mitad de Categorías/Colecciones la cubre `02`; esta tarea cubre la mitad de Home + Config).
- `03-catalogo-publico.md` 🟡 — "El estado vacío del home es un callejón sin salida" — tener todo en una sola pantalla con vista previa en vivo hace mucho más difícil que el home quede vacío sin que el admin lo note.

## Archivos a modificar

- `frontend/src/features/admin/pages/HomeSectionsPage.tsx` — su lógica (drag & drop, toggle visible, agregar sección) se integra a la nueva pantalla unificada.
- `frontend/src/features/admin/pages/CatalogConfigPage.tsx` — ídem, su lógica de banner/identidad se integra.
- Nueva página (nombre a definir, ej. `MyStorePage.tsx`) que reemplaza a las dos anteriores.
- `frontend/src/features/catalog/HomeSectionsRenderer.tsx` — se reutiliza tal cual para la vista previa en vivo (ya es el mismo componente que usa la tienda pública real, por diseño desde T3).
- `frontend/src/router.tsx` — unificar `/admin/home` y `/admin/config` en una sola ruta (ej. `/admin/store`).
- `frontend/src/features/admin/AdminLayout.tsx` — sidebar: un solo link "Mi tienda" en vez de "Home" + "Tienda" (coordinar con `01`).

## Criterio de completado

- Toda la funcionalidad de las dos páginas viejas sigue disponible desde la nueva pantalla única (nada se pierde).
- La vista previa refleja cambios en tiempo real (reordenar secciones, ocultar, cambiar color/nombre) sin necesidad de guardar primero, siguiendo el mismo patrón de preview-en-vivo ya usado en `ProductEditPage`.
- Los botones "Copiar link" y "Compartir en Instagram" funcionan (clipboard / Web Share API, mismo patrón que el `ShareButton` que ya existe en la tienda pública).
- `tsc --noEmit` limpio; verificado en navegador reordenando secciones y confirmando que el orden se refleja en la tienda pública real después de guardar.

## Notas

- Esta es una fusión de UI, no un cambio de modelo de datos — `catalog_configs` y `home_sections` siguen siendo tablas separadas, solo se edita todo desde una pantalla.
- Depende de `06-auto-home-section.md` para que la experiencia sea realmente fluida (si `06` no está hecha todavía, esta pantalla igual funciona, pero el admin va a tener que agregar secciones a mano la primera vez, que es exactamente lo que `06` evita).
- El ancho de ~480px del marco de vista previa en el mockup simula un viewport mobile — coherente con que el comprador real navega desde el celular; no es necesario que sea exactamente 480px, pero sí que se sienta como una vista de tienda, no como una tabla de administración.
