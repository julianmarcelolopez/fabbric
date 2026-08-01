# Rol y método para la implementación de T21

## Rol

Fullstack developer (backend + frontend) — a diferencia de T20, que era estrictamente frontend ("no tocar backend" era su límite duro), acá el backend **es** el trabajo. La misión es agregar los campos y endpoints que T20 necesitaba y no tenía, siguiendo los patrones que el proyecto ya usa en todos lados, no inventando convenciones nuevas.

## Misión

Cerrar, uno por uno, los gaps documentados en la tabla "Backend pendiente" de `docs/T20_UX-Store/tareas/08-admin-configurable.md`. Cada tarea:
1. Agrega lo que falta en el backend (schema + migración + endpoint, según corresponda).
2. Expone eso en el admin (`/admin/store` u otra pantalla existente, según qué dato sea).
3. Conecta la tienda pública (páginas de T20) para que use el dato real en vez del placeholder/fallback que T20 dejó.

## Fuente de verdad

Dos cosas, en este orden:
1. **La tabla de `T20/08`** — qué campo falta, por qué, y qué se hizo mientras tanto (el placeholder/fallback exacto a reemplazar).
2. **El código real** — antes de tocar nada, leer el archivo de T20 que consume el placeholder (ej. `CatalogHomePage.tsx` para el mid-banner, `CategoriesIndexPage.tsx`/`CategoryPage.tsx` para las fotos) para saber exactamente qué reemplazar y cómo, sin adivinar.

## Patrones ya establecidos a seguir (no inventar alternativas)

- **Migraciones**: Drizzle, mismo flujo que usa el resto del schema (`backend/src/db/schema.ts` + `supabase/migrations/`).
- **Upload de imágenes**: mismo patrón que `logoUrl`/`bannerUrl` en `backend/src/modules/catalogConfig/routes.ts` — multipart, validación de tipo/tamaño (2 MB, JPEG/PNG/WebP/SVG), Supabase Storage bucket `product-images`, borrado best-effort de la imagen anterior al reemplazar.
- **Endpoints públicos**: mismo contrato de seguridad que ya usa `backend/src/modules/public/routes.ts` — selects explícitos (jamás `costPrice`, `stockLocal`, `orgId` en una respuesta pública), resolución de tenant por slug.
- **Endpoints admin**: mismo patrón que `categories`/`collections`/`catalogConfig` routes — `requireAdminAuth`, `requireOrgId`, validación con Zod (`@fabbric/shared`), WHERE que incluye siempre `orgId`.
- **Auto-creación de home_section**: `ensureCategoryHomeSection` en `backend/src/modules/homeSections/service.ts` es el patrón exacto a replicar para colecciones en la tarea `07` — no reinventar la lógica, copiar el criterio (idempotente, respeta la unique constraint).

## Lo que SÍ hace esta fase

- Migraciones de Drizzle (columnas nuevas, nunca tablas nuevas salvo que una tarea lo diga explícitamente).
- Endpoints nuevos o extendidos, admin y público.
- Componentes de upload/edición en el admin, reusando los que ya existen donde aplique.
- Conectar la tienda pública (T20) al dato real, reemplazando el placeholder correspondiente.

## Lo que NO hace esta fase

- **No inventa campos nuevos que T20 no pidió.** Si algo no está en la tabla de `T20/08`, no es de T21 — se documenta como observación y se pregunta antes de agregarlo, no se decide solo.
- **No cambia lógica de negocio existente** — precios, stock, envíos, pagos siguen exactamente igual; T21 agrega contenido configurable, no reglas nuevas.
- **No toca los gaps explícitamente excluidos** en el README (reviews, wishlist, cupones, Instagram, tracking en tiempo real) — son sistemas completos, no campos sueltos.
- **No agrega campos "por las dudas"** — cada columna nueva tiene que resolver una fila concreta de la tabla de `T20/08`. Si en el camino de implementar algo parece "más fácil" agregar una columna extra no pedida, esa es señal de que no es de esta tarea puntual — documentarlo aparte, no hacerlo de paso.

## Formato de las tareas

Cada archivo en `tareas/` sigue esta estructura:

```markdown
## Qué se implementa
## Por qué existe (referencia a T20/08)
## Cambios de backend requeridos (schema + migración + endpoint)
## Cambios de frontend requeridos (admin panel + tienda pública)
## Archivos a modificar
## Criterio de completado
## Notas y dependencias
```
