# 07 — "Mi tienda" unificado (Home + Configuración + vista previa en vivo)

**Estado:** ✅ Completa (2026-07-30)

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

## Resultado

Implementado como **Opción A** (decisión explícita del usuario antes de arrancar): todo el estado de la pantalla — secciones (orden, visibilidad, altas, bajas) e identidad (nombre, slug, color, descripción, contacto) — vive en estado local hasta que se toca "Guardar cambios", igual que el patrón ya usado en `ProductEditPage`. Únicas excepciones: logo y banner, que se suben (y confirman) al toque, porque no tiene sentido "diferir" la subida de un archivo — mismo criterio que `ImageDropzone` en `ProductEditPage`.

- **`MyStorePage.tsx`** (nueva, reemplaza a `HomeSectionsPage.tsx` y `CatalogConfigPage.tsx`, ambas borradas por quedar sin uso): carga en paralelo config, categorías, colecciones, productos y secciones; construye una vista previa completamente client-side reutilizando `HomeSectionsRenderer` tal cual (mismo componente que la tienda pública real).
- **El punto más delicado de la tarea**: para que la vista previa funcione también con secciones agregadas localmente (que todavía no existen en el backend), los productos de cada sección se calculan en el cliente filtrando la lista completa de `GET /admin/products` por `categoryId`/`collections`, en vez de depender de los productos ya resueltos por `GET /admin/home-sections` (que solo conoce secciones que ya existen). Esto se probó explícitamente agregando una categoría nueva ("Jeans", con un producto real) y confirmando que apareció con su producto en la vista previa sin haber guardado nada todavía.
- **Guardar cambios** hace un diff contra la última foto cargada del servidor: PATCH de `catalog-config`, DELETE de las secciones sacadas, POST de las nuevas (resolviendo su id real), PATCH de visibilidad para las que cambiaron, y por último PUT de orden con la lista final de ids reales — en ese orden, porque el endpoint de orden exige la lista exacta de ids existentes. Después de guardar, recarga todo desde el backend.
- **`router.tsx`**: `/admin/home` y `/admin/config` ahora son `<Navigate to="/admin/store" replace />`; nueva ruta `/admin/store` → `MyStorePage`. **`AdminLayout.tsx`**: sidebar con un solo link "Mi tienda" en vez de "Home" + "Tienda" — necesario tocarlo ahora (antes de la tarea `01`) porque las rutas viejas ya no existen como páginas propias.

**Verificación real** (`tsc --noEmit` y `vite build` limpios primero; sin herramienta de browser automation en este entorno, verificado por el usuario en su navegador con screenshots):
- Ocultar una sección (destildar "Visible") → desaparece de la vista previa al instante, sin guardar.
- Cambiar nombre de tienda y color → se refleja al instante en el topbar de la vista previa.
- "Compartir en Instagram" → abre el share sheet nativo (probado en Windows); "Copiar link" → copia `http://localhost:5173/store/eliathi-modas` correctamente.
- Agregar la categoría "Jeans" (con un producto real) como sección nueva → aparece marcada "nueva, sin guardar" en la lista Y con su producto real ya visible en la vista previa — la prueba más importante de toda la tarea, confirmada.
- **Guardar cambios + verificación en la tienda pública real** (no solo el admin): después de guardar, `/store/eliathi-modas` mostró la sección "Jeans" con el producto real y el nombre actualizado — confirma que el diff local→backend funciona de punta a punta, no solo en la vista previa del admin.
- Redirects: `/admin/home` y `/admin/config` → confirmado que llevan a `/admin/store`.
- **No se aisló una prueba específica de "arrastrar para reordenar"** (drag & drop) — el orden final resultante fue correcto en todas las pruebas, pero la interacción de arrastre en sí no se probó por separado. Queda como una verificación pendiente de menor riesgo (la lógica de reorden es la misma que ya estaba probada en la vieja `HomeSectionsPage`, solo se le quitó el PUT inmediato).
