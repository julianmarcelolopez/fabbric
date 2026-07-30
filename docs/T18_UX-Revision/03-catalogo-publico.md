# 03 — Catálogo público

## Objetivo del usuario

Que un comprador que llega desde Instagram, desde el celular, encuentre lo que busca y llegue a la ficha del producto que le interesa lo más rápido posible.

## Mapa del flujo actual

1. Entra a `/store/:slug` (link en la bio de Instagram) → `StoreLayout` pide `/public/:slug/config` y renderiza header (logo/banner), footer y el `Outlet`.
2. `CatalogHomePage` pide `/public/:slug/home` y `HomeSectionsRenderer` dibuja una grilla por cada sección visible (categoría o colección), **hasta 8 productos por sección**, sin ningún otro modo de navegación.
3. Para encontrar algo que no está entre esos 8 productos por sección, la única opción es seguir scrolleando entre secciones — **no hay buscador, ni filtros, ni una vista "ver todos"**.
4. Click en un producto → `StoreProductPage` pide `/public/:slug/products/:id` → `ProductDetailView`: galería de imágenes, elige Talle (chips) → elige Color (chips, filtrados por el talle ya elegido) → ve stock/precio → "Agregar al carrito".
5. Sigue en `04-checkout.md`.

## Puntos de fricción

### 🔴 [ALTO] No existe buscador, ni filtros, ni forma de ver todos los productos de una categoría — solo lo que entra en 8 tarjetas
**Dónde:** `backend/src/modules/public/routes.ts` (`GET /public/:slug/home`, únicos endpoints públicos de listado) — no existe ningún endpoint de catálogo genérico ni de búsqueda; confirmado también por ausencia total de código de búsqueda/filtro en todo `frontend/src/features/store/`.
**Qué pasa:** la portada muestra como máximo 8 productos por sección (categoría o colección), sin paginación ni "ver más". Si una categoría tiene 9+ productos, el 9º en adelante no es alcanzable desde ningún lugar de la tienda pública — ni buscándolo, ni filtrando, ni navegando. La única forma de llegar a un producto es que esté entre los primeros 8 de alguna sección visible.
**Por qué importa:** para una tienda de ropa real (no la demo con pocos productos) esto es un techo estructural, no un detalle — apenas el catálogo crece un poco, hay productos que literalmente no se pueden encontrar desde la tienda, aunque estén cargados y visibles según el admin.
**Solución propuesta:** un endpoint público de catálogo con paginación (o "ver todos" por categoría/colección) es la mejora de fondo; como quick win más barato, al menos mostrar un link "Ver todos en [categoría]" cuando una sección tiene más de 8 productos, en vez de truncar en silencio.

### 🟡 [MEDIO] El estado vacío del home es un callejón sin salida
**Dónde:** `HomeSectionsRenderer.tsx` — mensaje genérico `"No hay secciones para mostrar todavía."` cuando no hay ninguna sección visible con productos.
**Qué pasa:** si el admin todavía no completó el paso de "Home" (ver hallazgo 🔴 de `01-flujo-critico.md`), cualquier visitante que llegue desde el link de Instagram ve solo esa frase — sin ningún contacto alternativo destacado (WhatsApp/Instagram están en el footer, pero no resaltados en este estado).
**Por qué importa:** es la peor primera impresión posible para un cliente que llegó con intención de compra real — una tienda aparentemente "vacía", sin ninguna salida clara (ni siquiera un link de contacto visible sin scrollear hasta el pie).
**Solución propuesta:** en este estado, destacar el WhatsApp/Instagram del footer arriba, junto al mensaje — "Todavía estamos cargando productos, escribinos por WhatsApp" en vez de dejar la página visualmente vacía.

### 🟢 [BAJO] La ficha de producto no es clickeable/accesible como un link real
**Dónde:** `ProductCard.tsx` — la tarjeta completa es un `<div onClick>`, no un `<a>`/`<Link>`.
**Qué pasa:** no se puede abrir en pestaña nueva, no responde a "compartir este enlace" desde el long-press en mobile antes de entrar, y no es navegable por teclado.
**Por qué importa:** fricción menor para el uso normal (un tap funciona igual), pero pierde comportamientos nativos del navegador que los usuarios de Instagram/mobile dan por sentado (mantener presionado para copiar/abrir en otra pestaña).
**Solución propuesta:** usar `Link` de React Router en vez de `div onClick`, manteniendo el mismo estilo visual.

### 🟢 [BAJO] La descripción del producto aparece después de elegir talle/color, no antes
**Dónde:** `ProductDetailView.tsx` — orden: precio → talle → color → stock → **descripción** → botón de compra.
**Qué pasa:** para decidir el talle a veces hace falta info que está en la descripción (corte, tela, "calza grande/chico") y esa info aparece más abajo, después de haber elegido.
**Por qué importa:** fricción menor de orden de lectura — no bloquea la compra, pero no acompaña la decisión en el momento en que más ayuda.
**Solución propuesta:** mover la descripción arriba del selector de talle, o justo debajo del nombre.

## Quick wins

- Link "Ver todos en [categoría]" cuando una sección supera los 8 productos, en vez de truncar sin aviso.
- Destacar WhatsApp/Instagram arriba del mensaje "No hay secciones para mostrar todavía." en el estado vacío del home.
- Cambiar `ProductCard` de `div onClick` a `Link`, sin tocar el estilo visual.
- Reordenar `ProductDetailView` para mostrar la descripción antes del selector de talle/color.

## Mejoras estructurales

- Endpoint público de catálogo con paginación (o al menos una vista "todos los productos de esta categoría/colección"), para que el tope de 8 por sección deje de ser un techo duro a medida que el catálogo crece.
- Evaluar un buscador simple (por nombre) para tiendas con catálogos más grandes que el de la demo actual — hoy no existe ningún mecanismo de búsqueda en la plataforma.
