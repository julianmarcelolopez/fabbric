# 07 — Auto-creación de home_section para colecciones

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

Que crear una colección nueva la agregue automáticamente al home (`home_sections`), igual que ya pasa con las categorías desde T19/06 — hoy solo las categorías tienen esa auto-creación.

## Por qué existe (referencia a T20/08)

Fila "Listado completo de colecciones" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: `ensureCategoryHomeSection` (`backend/src/modules/homeSections/service.ts`) corre al crear una categoría (`POST /admin/categories`) desde T19/06, pero no existe un `ensureCollectionHomeSection` equivalente para `POST /admin/collections`. Consecuencia directa, encontrada en T20/04: el tab "Colecciones" de `CategoriesIndexPage.tsx` solo muestra lo que un admin agregó **manualmente** a la gestión de home sections — para un tenant nuevo que crea colecciones pero nunca toca esa pantalla, el tab queda vacío ("Próximamente nuevas colecciones") aunque sí tenga colecciones reales.

## Cambios de backend requeridos

- **Nueva función** `ensureCollectionHomeSection(tx, orgId, collectionId)` en `backend/src/modules/homeSections/service.ts` — mismo patrón exacto que `ensureCategoryHomeSection`: idempotente (busca si ya existe una `home_section` con `refType: "collection"` y ese `refId` antes de insertar), respeta `home_sections_org_ref_unique`, `sortOrder` al final (`max(sortOrder) + 1`).
- **`POST /admin/collections`** (`backend/src/modules/collections/routes.ts`): igual que `POST /admin/categories` ya hace, envolver el insert en una transacción que también llama a `ensureCollectionHomeSection`.
- **Sin schema nuevo, sin migración** — `home_sections` ya soporta `refType: "collection"` desde que se creó la tabla (T3), simplemente nunca se dispara automáticamente para colecciones.
- **Backfill opcional**: evaluar si conviene un script de backfill para colecciones YA existentes que no tienen `home_section` (mismo criterio que el backfill que se hizo en T19/06 para categorías viejas) — si hay tenants con colecciones creadas antes de esta tarea, quedarían igual de "invisibles" en el tab hasta correr ese backfill.

## Cambios de frontend requeridos

Ninguno — la UI de T20/04 (`CategoriesIndexPage.tsx`) ya está preparada para mostrar colecciones reales del home tal como muestra categorías; el problema era puramente de datos (colecciones que nunca llegaban a `home_sections`), no de interfaz.

## Archivos a modificar

- `backend/src/modules/homeSections/service.ts`
- `backend/src/modules/collections/routes.ts`
- (opcional) un script de backfill, mismo criterio que el que ya existe para categorías

## Criterio de completado

- Crear una colección nueva desde el admin y verla aparecer, sin ningún paso manual adicional, en el tab "Colecciones" de `/store/:slug/categorias`.
- Colecciones creadas ANTES de esta tarea: documentar explícitamente si quedan sin `home_section` (comportamiento conocido, no un bug) o si se corrió el backfill para dejarlas igualadas.
- `tsc --noEmit` limpio; verificado con una colección real creada después del cambio.

## Notas y dependencias

- **Independiente de todo el resto de T21** — no depende de `01` a `06` ni ellas de esta.
- **La más simple de las 7 tareas** — es literalmente copiar un patrón que ya existe y probado (`ensureCategoryHomeSection`) para una segunda entidad. Buen candidato para hacer primero.

## Resultado

**Implementación**: en vez de duplicar `ensureCategoryHomeSection` literalmente, se extrajo la lógica común a una función interna `ensureHomeSection(tx, orgId, refType, refId)` (no exportada) en `backend/src/modules/homeSections/service.ts`, y tanto `ensureCategoryHomeSection` como el nuevo `ensureCollectionHomeSection` quedaron como wrappers de una línea sobre esa función — mismo comportamiento exacto para los call-sites existentes (nada cambió para categorías), sin dos copias de la misma lógica idempotente para mantener en paralelo. `POST /admin/collections` (`backend/src/modules/collections/routes.ts`) ahora envuelve el insert en una transacción que llama a `ensureCollectionHomeSection`, mismo patrón que `POST /admin/categories` ya usa desde T19/06.

**Backfill**: se evaluó y **no se implementó** — la única organización real (Eliathi Modas) tiene 0 colecciones hoy (confirmado en la verificación de T20/04), así que no hay ninguna colección huérfana que backfillear, y no tendría sentido escribir un script que no se puede probar contra datos reales. Si en el futuro un tenant importa/tiene colecciones creadas antes de este cambio, el backfill es trivial de escribir en ese momento (mismo criterio que el de T19/06, adaptado a `refType: "collection"`) — queda anotado acá, no resuelto de antemano para un caso hipotético.

**Verificación real** (`backend/t21-07-collection-home-section.mjs`, queda en el repo sin trackear, mismo criterio que los scripts de T20): admin *staff* temporal en la org real, se creó una colección de verdad vía `POST /admin/collections`, se confirmó que la `home_section` se creó sola (sin ningún paso manual) con `visible: true` por default, que aparece de inmediato en `GET /public/eliathi-modas/home` con `refType: "collection"` y el nombre correcto, y que la constraint de unicidad se respeta (no se duplica). 8/8 checks en verde, sin residuos en la DB al terminar.

`tsc --noEmit` limpio en `backend/`. Sin cambios de frontend (como estaba previsto — la UI de T20/04 ya estaba lista, el problema era puramente de datos).
