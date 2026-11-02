# T40 — Prioridad visual: buscador antes que "Nuevo producto"

## Pedido original

Revisando `/admin/products` (mismo lugar donde se agregó la columna de
código de barras en T39 y se encontraron varios casos de B001): "analiza
como quedaría mejor para agregar un producto ahí mismo o aparte... como
diseñador... porque para buscar un producto no está tan visible y
necesito que el cliente busque productos con más facilidad."

## Estado actual (verificado contra el código real)

`frontend/src/features/admin/pages/ProductsPage.tsx:181-256`:

- **"Nuevo producto"** (líneas 183-211): una `<div className="card">`
  completa, con su propio `<h2>`, siempre renderizada arriba de todo —
  nombre + categoría + precio + botón "Crear y editar". Máxima prioridad
  visual posible (primera cosa que se ve al entrar a la página).
  - Ese formulario rápido ni siquiera crea variantes — solo arranca un
    producto borrador (`POST /admin/products`, línea 77) que redirige a la
    ficha (`navigate(\`/admin/products/${row.id}\`)`, línea 81) para
    terminarlo. No es un alta completa, es el primer paso de una.
- **Buscador** (línea 222-227): un `<input>` suelto, sin label ni ícono,
  dentro de la misma fila `className="row"` que otros 4 `<select>` de
  filtro (categoría/marca/estado/visible) más el selector de orden — seis
  controles en una sola fila, sin jerarquía entre ellos. Recién aparece
  **después** de toda la tarjeta de "Nuevo producto".

## Diagnóstico (como diseño, no como bug)

La prioridad visual de la página está invertida respecto a la frecuencia
de uso real:

- **Cargar un producto nuevo** es una acción poco frecuente, y además
  incompleta en sí misma (es solo el arranque de un borrador).
- **Buscar** es lo que se hace constantemente — cada vez que hay que
  encontrar o editar algo ya cargado (y más ahora, con cientos de
  productos reales, varios de ellos con nombres genéricos tipo "Liso" o
  "1428" — ver `docs/bugs/B001_ProductosDuplicadosPorModelo/`).

Hoy la página le da máxima prioridad (tarjeta propia, arriba de todo, con
título) a lo que se usa poco, y ninguna jerarquía visual (input suelto,
mezclado con filtros) a lo que se usa todo el tiempo.

## Propuesta de diseño

1. **"Nuevo producto" deja de estar siempre abierto.** Pasa a ser un botón
   `+ Nuevo producto` chico, al lado del título "Productos" — mismo lugar
   y tamaño que el patrón ya usado en Pedidos (`+ Nuevo pedido`, por
   consistencia con el resto del admin). Al tocarlo, se abre el formulario
   (modal o panel desplegable) — visible solo cuando hace falta, no
   siempre.
2. **El buscador pasa a ser lo primero que se ve** en el cuerpo de la
   página, con más ancho y jerarquía propia (ícono de lupa, placeholder
   claro), en su propia fila — no mezclado con los `<select>` de filtro.
3. **Los filtros quedan debajo**, agrupados, con menos peso visual que el
   buscador — siguen estando todos, pero dejan de competir por atención
   con lo principal.

Mismo criterio de diseño que usan herramientas de catálogo tipo Shopify:
buscar arriba y prominente, "agregar" como botón chico en el header de la
página, filtros secundarios debajo.

## Qué NO cambia

- La lógica de creación del producto (`POST /admin/products`, sigue
  siendo solo nombre/categoría/precio, sigue redirigiendo a la ficha para
  completar variantes/imagen/marca) — no se rediseña el formulario en sí,
  solo dónde y cómo se muestra.
- La lógica de búsqueda/filtrado client-side (`visibleProducts`
  `useMemo`) — no cambia, solo el layout que la contiene.
- Paginación, columnas de la tabla (incluida la de código de barras de
  T39) — intactas.

## Fuera de alcance

- Rediseñar el formulario de alta en sí (agregar más campos, variantes,
  imagen) — ya existe un flujo completo para eso (el alta por escaneo de
  la PWA, T36/T37); este formulario rápido del admin es deliberadamente
  mínimo.
- Tocar `OrdersPage.tsx` u otras páginas del admin — se usa como
  referencia de patrón, no se modifica.

## Criterios de aceptación

- Al entrar a `/admin/products`, lo primero visible en el cuerpo de la
  página es el buscador, no el formulario de alta.
- "Nuevo producto" sigue siendo accesible en un clic, pero no ocupa
  espacio permanente en la pantalla.
- Buscar y filtrar siguen funcionando exactamente igual que hoy.
- `tsc --noEmit` limpio en `frontend/`.
- Verificado en el navegador, no solo por tipos.
