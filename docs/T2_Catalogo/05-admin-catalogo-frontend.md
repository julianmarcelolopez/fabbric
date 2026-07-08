# Tarea 5 — Páginas admin: categorías, colecciones, productos

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [02-categorias-colecciones.md](02-categorias-colecciones.md), [03-productos-variantes.md](03-productos-variantes.md), [04-imagenes.md](04-imagenes.md)

## Objetivo

Que el vendedor gestione todo el catálogo desde el navegador. El shell de `/admin` de T1 gana navegación y sus primeras páginas reales.

## Pasos

- [x] Navegación del admin: `AdminLayout.tsx` con sidebar (Dashboard, Categorías, Colecciones, Productos) + rutas anidadas; el "me" (email/rol/org) vive en el layout y baja por Outlet context. **Decisión de CSS: archivo propio simple (`admin.css`), sin framework** — Tailwind se evalúa cuando la UI crezca.
- [x] `CategoriesPage.tsx` y `CollectionsPage.tsx` — ambas sobre un `TaxonomyManager` compartido (estructuralmente idénticas): crear (slug autogenerado del nombre, editable), editar inline, toggle activa, borrar con confirm y error visible (ej. categoría con productos)
- [x] `ProductsPage.tsx` — tabla (thumb, nombre→editor, categoría, precio, estado, visible, variantes, colecciones) + alta rápida (nombre+categoría+precio → navega al editor)
- [x] `ProductEditPage.tsx` — campos base + select categoría + estado + checkboxes de colecciones + `VariantEditor` (tabla editable por fila con guardar-si-cambió, alta y baja) + `ImageDropzone` (drag & drop + click, reorder con ↑/↓, delete)
- [x] Errores de `ApiError` visibles en cada página; precios en pesos en la UI (`lib/money.ts`), centavos en la API; el reload tras editar variantes/imágenes **no pisa** lo que estás tipeando en el form del producto

## Bug encontrado en la verificación en navegador (2026-07-08)

- **CORS bloqueaba PATCH/PUT/DELETE**: el default de `@fastify/cors` solo permite GET/HEAD/POST en el preflight. Los tests de Node nunca lo detectaron (no hacen preflight) — apareció recién cuando el usuario intentó borrar una colección desde el navegador. Fix: `methods` explícito en el registro de cors. Lección: **los tests HTTP server-to-server no cubren CORS; siempre validar mutaciones desde el navegador**.

## Definition of Done

Verificado por terminal (2026-07-08): typecheck limpio; Vite compila y sirve los 6 módulos nuevos desde el contenedor.

Verificado en navegador por el usuario (2026-07-08):
- [x] Categorías, colecciones, producto con precio, variantes con stock online/local distinto, colecciones asignadas (badges en la lista), imágenes subidas y reordenadas
- [x] Errores visibles y claros: slug duplicado confirmado; variante duplicada y bloqueo de categoría con productos verificados sin errores
- [x] Consola del navegador sin errores
- [x] `tsc --noEmit` limpio
