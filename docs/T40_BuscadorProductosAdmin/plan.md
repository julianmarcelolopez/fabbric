# Plan — Buscador antes que "Nuevo producto" (T40)

Basado en `specs/T40_BuscadorProductosAdmin.md` (diagnóstico completo y
la propuesta de diseño ya aprobada). Este plan solo ordena la
implementación; no repite el análisis.

## Mockup visual

Comparación interactiva Antes/Después, con el mismo shell del admin real
(sidebar + contenido) y datos reales del catálogo (Liso, Energy, Remera
Básica R) para que se sienta como la pantalla de verdad — incluye el
modal de "+ Nuevo producto" funcionando (clic para abrirlo/cerrarlo):

**[Rediseño Productos T40](https://claude.ai/artifact/FkSd5qMH9paT1scoYJm9RD)**

## Rediseño — qué cambia concretamente

`frontend/src/features/admin/pages/ProductsPage.tsx`:

1. **"Nuevo producto" pasa de tarjeta siempre abierta a modal.**
   - Hoy (líneas 183-211): `<div className="card"><h2>Nuevo producto</h2>…</div>`
     con el formulario completo, renderizado siempre, arriba de todo.
   - Nuevo: un botón `+ Nuevo producto` (mismo estilo `btn primary` que ya
     usa el resto del admin) ubicado junto al `<h1>Productos</h1>` que
     maneja `ProductsPage` (el componente padre, no `ProductsList`) —
     mismo lugar que el patrón ya usado en Pedidos.
   - Nuevo estado `const [showNewProduct, setShowNewProduct] = useState(false)`
     en `ProductsList`. El formulario (mismo JSX de hoy, misma lógica de
     `create()`, sin tocarla) se mueve dentro de un modal que se muestra
     condicionalmente (`{showNewProduct && (...)}`), con overlay +
     botón "Cancelar" que cierra sin crear nada.
   - El caso `categories.length === 0` (hoy un mensaje dentro de la
     tarjeta, línea 185-188) se mantiene igual dentro del modal.

2. **El buscador pasa a ser lo primero del cuerpo de la página.**
   - Hoy (línea 220-256): un `<div className="row">` con el `<input>` de
     búsqueda mezclado entre 5 `<select>`.
   - Nuevo: el `<input>` de búsqueda sale a su propia fila, primero,
     con más ancho/padding y un ícono de lupa (SVG inline, sin librería
     nueva) — visualmente la pieza central de la página.

3. **Los filtros quedan en una fila propia, debajo**, con menos peso
   visual (tamaño de fuente más chico, mismo criterio que el mockup) —
   misma lógica de `filterCategory`/`filterBrand`/`filterStatus`/
   `filterVisible`/`sortBy`, sin tocar ninguna.

Sin cambios en: `create()`, el `useMemo` de `visibleProducts`, paginación,
columnas de la tabla (incluida "Código de barras" de T39).

## Verificación

- `tsc --noEmit` limpio en `frontend/`.
- En el navegador (Docker): "+ Nuevo producto" abre el modal, crea un
  producto y redirige a su ficha igual que hoy; "Cancelar"/click afuera
  cierra sin crear nada; buscar y filtrar siguen funcionando idéntico;
  nada se rompió en paginación ni en las columnas de T39.

## Criterios de aceptación

Ver `specs/T40_BuscadorProductosAdmin.md` — no se repiten acá.
