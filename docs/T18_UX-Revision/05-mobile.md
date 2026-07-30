# 05 — Mobile

> Todos los hallazgos de este archivo están **inferidos leyendo el CSS** (`admin.css`, `catalog.css`) — no se observaron en un dispositivo real ni en un emulador, porque no hay herramienta de browser automation disponible en este entorno (ver Método en `README.md`). Son señales de riesgo a confirmar visualmente antes de darlas por definitivas.

## Objetivo del usuario

Que tanto el admin (iPhone) como el comprador (iPhone) puedan usar el panel y la tienda respectivamente sin que el layout se rompa en una pantalla de ~390px de ancho.

## Mapa del flujo actual (pantallas revisadas)

- **Panel admin completo** (todas las pantallas listadas en `02-panel-admin.md`): comparten el mismo layout base, `AdminLayout.tsx` + `admin.css`.
- **Tienda pública** (`03-catalogo-publico.md`, `04-checkout.md`): comparten `StoreLayout.tsx` + `catalog.css`.

## Puntos de fricción

### 🔴 [ALTO] El panel admin entero usa un sidebar fijo de 220px, sin colapsar en mobile — *inferido del CSS, no observado*
**Dónde:** `admin.css` — `.admin { display: grid; grid-template-columns: 220px 1fr; }`. En todo el archivo hay un único `@media` (a 1100px), y solo afecta `.editor-split`/`.preview-pane` (el editor de producto) — no existe ningún breakpoint que colapse o convierta el sidebar en un menú hamburguesa.
**Qué pasa:** el grid reserva 220px fijos para el sidebar sin importar el ancho de pantalla. En un iPhone de ~390px de ancho, eso deja aproximadamente 170px para todo el contenido — inferido de la regla CSS, no confirmado visualmente en un dispositivo.
**Por qué importa:** el contexto de negocio de este análisis dice explícitamente que el admin usa iPhone como dispositivo principal — si la inferencia es correcta, el panel completo (Dashboard, Productos, Stock, Pedidos, todo) sería prácticamente inutilizable en el dispositivo que el usuario objetivo realmente usa.
**Solución propuesta:** agregar un breakpoint (~768px o menos) que convierta el sidebar en un menú colapsable/hamburguesa, liberando el ancho completo para el contenido. Es, potencialmente, el hallazgo de mayor impacto de todo T18 si se confirma — priorizar su verificación visual cuanto antes.

### 🔴 [ALTO] Las tablas del admin no tienen scroll horizontal ni alternativa de tarjetas — *inferido del CSS, no observado*
**Dónde:** `admin.css` — `table.grid { width: 100%; ...; overflow: hidden; }`, usado en al menos 12 lugares distintos entre `ProductsPage`, `StockPage`, `OrdersPage`, `FinanzasPage`, `CustomersPage`, etc. No hay ningún contenedor con `overflow-x: auto` alrededor de ninguna tabla, ni una versión alternativa en tarjetas para pantallas chicas.
**Qué pasa:** tablas de 6 a 8 columnas (Stock: Producto/Variante/Online/Local/Total/crítico/acciones; Pedidos: #/Fecha/Cliente/Tipo/Ítems/Total/Estado) se renderizan a ancho completo sin ninguna adaptación — combinado con el hallazgo anterior (contenido a ~170px de ancho), el resultado esperado es una tabla completamente apretada o con `overflow: hidden` recortando contenido en vez de permitir scroll.
**Por qué importa:** son las pantallas de uso diario más frecuente del admin (Stock y Pedidos, sobre todo) — si están rotas en mobile, el negocio depende de que Edgar use una compu para tareas que en teoría podría resolver desde el celular en cualquier momento.
**Solución propuesta:** envolver cada tabla en un contenedor con `overflow-x: auto` como mínimo (arreglo rápido, sin rediseño); a mediano plazo, evaluar una vista de tarjetas para las tablas más usadas en mobile.

### 🟡 [MEDIO] El topbar de la tienda pública podría desbordar con un cliente logueado — *inferido del CSS, no observado*
**Dónde:** `catalog.css` — `.store-topbar { display: flex; align-items: center; ... }`, sin `flex-wrap` ni ningún `@media` propio.
**Qué pasa:** el topbar acomoda marca + spacer + botón Compartir + botón Carrito + (si hay sesión) "Hola, Nombre" + "Mis pedidos" + "Salir" — hasta 5-6 elementos en una sola fila sin ajuste. En 390px, sin `flex-wrap`, el riesgo inferido es que esos elementos se aprieten o desborden horizontalmente en vez de acomodarse en una segunda línea.
**Por qué importa:** es la franja superior de la tienda, visible en cada pantalla — un desborde ahí es lo primero que vería cualquier comprador que llega desde Instagram ya logueado (compra recurrente).
**Solución propuesta:** agregar `flex-wrap: wrap` con un `gap` razonable como arreglo mínimo; confirmar visualmente si además hace falta ocultar el nombre completo del cliente en pantallas chicas (solo ícono/inicial).

### 🟢 [BAJO] Grillas de catálogo con `auto-fit`/`auto-fill` — riesgo bajo pero no confirmado
**Dónde:** `catalog.css` — `.hsr-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }`, `.pdv { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }`.
**Qué pasa:** a diferencia del admin, estas grillas SÍ usan patrones responsive nativos de CSS Grid (sin necesidad de media queries explícitas) — en 390px, `.hsr-grid` caería previsiblemente a 2 columnas y `.pdv` a 1 columna (galería sobre info). Es una inferencia razonable a partir del cálculo de `minmax()`, no una observación real.
**Por qué importa:** es el escenario de menor riesgo de todo este archivo — el patrón elegido ya es mobile-friendly por diseño — pero conviene confirmarlo con un caso real (producto con varias imágenes, nombre largo) antes de darlo por bueno del todo.
**Solución propuesta:** ninguna acción urgente; incluir en la verificación visual pendiente (ver `README.md`) como confirmación, no como corrección.

## Quick wins

- Envolver las tablas del admin (`table.grid`) en un contenedor con `overflow-x: auto` — cambio de una línea de CSS, sin rediseño, mitiga el hallazgo 🔴 de las tablas mientras se evalúa algo más de fondo.
- Agregar `flex-wrap: wrap` a `.store-topbar`.

## Mejoras estructurales

- Sidebar del admin colapsable/hamburguesa por debajo de un breakpoint mobile — el cambio de mayor impacto potencial de todo T18 si la inferencia se confirma, dado que contradice directamente el contexto de negocio ("admin usa iPhone").
- Vista de tarjetas (en vez de tabla) para Stock y Pedidos en mobile, las dos pantallas de uso más frecuente del día a día.
- **Antes de priorizar cualquiera de estos dos puntos en un sprint, confirmarlos abriendo el panel real en un iPhone** — este archivo entero es una hipótesis fundada en el CSS, no un hallazgo verificado.
