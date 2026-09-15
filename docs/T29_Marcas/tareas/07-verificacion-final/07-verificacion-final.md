# Tarea 7 — Verificación final

**Estado:** ✅ Hecha — circuito de punta a punta verificado con Playwright real (15/15 PASS).

**Depende de:** Tareas 1-6 completas.

## Objetivo (según `plan.md`, T29/07)

Circuito completo probado a mano en el navegador (no solo tipos/build),
siguiendo la preferencia ya establecida en el proyecto de verificar en vivo
antes de dar por cerrada una tarea de UI — pero esta vez con **un solo
circuito de punta a punta** (admin → PWA → tienda, mismos datos de un
extremo al otro), no piezas sueltas como en las Tareas 3/4/6.

## Checklist

- [x] Admin → Productos → Marcas: alta, edición, logo, borrado.
- [x] Admin → ficha de producto: combo de marca, alta inline de una marca nueva desde ahí (probado en Tareas 3/4; en esta se probó seleccionar una **ya existente**, ver paso 2 abajo).
- [x] PWA: alta por QR con combo de marca + alta inline.
- [x] Storefront: tab Marcas en "Explorá la tienda", página individual de una marca, filtro de marca dentro de una categoría.
- [x] Confirmar que ningún producto quedó con marca "perdida" — verificado tanto en los datos reales de Eliathi (contra el conteo de la Tarea 1) como en el circuito descartable de esta tarea.
- [x] `products.brand` ya no existe; sin referencias muertas a `SUGGESTED_BRANDS` ni al campo viejo en ningún proyecto (`backend/`, `frontend/`, `pwa/`).

## Cómo se verificó

### 1. Búsqueda de referencias muertas

`grep` sobre los cuatro proyectos (`backend/src`, `frontend/src`, `pwa/src`,
`packages/shared/src`):

- `SUGGESTED_BRANDS` → 0 resultados de código (solo un comentario que lo menciona como contexto histórico).
- `products.brand` (columna vieja) → 0 resultados de código (solo un comentario).
- Todo uso restante de `.brand` revisado uno por uno: los de `pwa/` (`App.tsx`, `CarritoScreen.tsx`, `FichaScreen.tsx`) leen `variant.product.brand` como **string** — correcto, ese endpoint (`by-barcode`, admin-auth) nunca pasó a `{name, slug}`, solo el contrato público cambió. Los de `frontend/store` ya convierten `{name, slug} → nombre` en el borde (`.brand?.name`). Los de `catalog/`/`cart/` reciben strings ya normalizados.

### 2. Integridad de datos (producción real, Eliathi)

```
marcas en catálogo: 3
productos con brandId: 3 / total productos: 9
columna brand vieja sigue existiendo?: false
```

Coincide exactamente con lo migrado y verificado en la Tarea 1 — nada se
perdió en las tareas siguientes.

### 3. Circuito de punta a punta (Playwright real)

`frontend/t29-07-verificacion-final.mjs` — org/usuario descartables, un
browser con 3 pestañas (admin, PWA, tienda pública), **mismos datos** de un
extremo al otro:

1. **Admin → Marcas**: crea una marca, le sube un logo real (PNG embebido, mismo truco que `t21-01-image-upload.mjs`), edita otra y la borra.
2. **Admin → producto**: crea un producto nuevo y le asigna la marca creada en el paso 1 desde el combo (marca **existente**, no alta inline) — confirma que el producto queda enlazado al mismo `brandId`.
3. **PWA → alta por QR**: escanea un código nuevo, carga el producto con una marca que no existe todavía (alta inline) — confirma que la marca aparece en el catálogo compartido.
4. **Storefront**: el tab Marcas muestra **ambas** marcas (la del admin y la de la PWA); entrar a la del admin muestra su producto; dentro de la categoría, filtrar por esa marca deja ver solo ese producto, no el de la PWA.
5. Confirma que ningún producto del circuito quedó con `brandId` nulo.

**15/15 PASS.**

**Dos bugs de timing encontrados y corregidos en el propio script de
verificación durante esta tarea (no en la app)**: el filtro de marca en
categoría/colección debouncea 300ms antes de tocar la URL, y `data` **no se
vacía** durante un refetch (decisión de UX de T21/08, documentada en el
código: evita que el sidebar de filtros parpadee) — el primer intento de
verificación leía la grilla justo después del click, antes de que la
respuesta filtrada llegara, y seguía viendo la lista vieja sin filtrar. Se
corrigió esperando explícitamente la respuesta HTTP del fetch filtrado antes
de leer el DOM, en vez de solo el click o el cambio de URL.

### 4. Compilación

`npx tsc --noEmit` limpio en `backend/`, `frontend/` y `pwa/` — 0 errores en
los tres, confirmado al final de cada tarea y de nuevo acá.

## Definition of Done

- [x] Todos los ítems del checklist verificados en el navegador real, no solo en tests automatizados (Playwright real, no mocks — 4 scripts distintos entre las Tareas 3, 4, 6 y 7, todos contra la app real levantada con `docker compose`).
- [x] Sin referencias muertas al modelo viejo de marca-como-texto.

## Cierre de T29_Marcas

Con esta tarea se completan las 7 tareas del plan. Resumen de lo que cambió:

- **Modelo de datos**: `brands` como catálogo propio (antes: `products.brand` texto libre). Migración sin pérdida de datos, verificada dos veces.
- **Backend**: CRUD de marcas, alta inline (`resolveBrandId`), endpoints públicos leyendo de `brands`, endpoint nuevo por marca y endpoint de listado.
- **Admin**: tab Marcas (reusa `TaxonomyManager`), combo con alta inline en la ficha de producto.
- **PWA**: mismo combo con alta inline en el alta por QR.
- **Storefront**: tab Marcas en "Explorá la tienda", página individual de marca, filtro de marca dentro de categoría/colección — todo por slug.

## Dependencias

- **La bloquean:** Tareas 1-6.
- **Bloquea:** nada — es la última tarea de T29.
