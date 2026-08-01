# Análisis — de los mockups al sistema de diseño

Extraído leyendo los 5 archivos de `mockups/` completos (no solo mirando capturas) y cruzado contra el código real de `frontend/src/features/store/`, `frontend/src/features/catalog/` y el schema del backend (`backend/src/db/schema.ts`) — no contra suposiciones.

## 1. Sistema de diseño

### Paleta de colores

Los 5 mockups usan exactamente la misma paleta (hex idénticos en los 5 `:root`):

| Variable | Hex | Rol |
|---|---|---|
| `--navy` | `#1E2A4A` | Color estructural: texto de marca, header, footer, botones primarios ("Agregar al carrito"), overlays de imagen |
| `--coral` | `#F07058` | Color de acento: CTAs principales, precios en oferta, badges, hover states, elementos activos |
| `--coral-light` | `#FDF1EE` | Fondo suave para estados activos de acento (chips de filtro activo) — solo aparece en `home` y `categoria` |
| `--white` | `#FFFFFF` | Fondos de card, header |
| `--off` | `#F8F7F5` | Fondo neutro (placeholders de imagen, secciones alternadas) |
| `--gray` | `#E8E4DF` | Bordes, separadores |
| `--text` | `#2C2C2C` | Texto de cuerpo |
| `--muted` | `#8A8278` | Texto secundario (marca, precios tachados, ayuda) |
| `--green` | `#16A34A` | Estados positivos (stock disponible, ahorro, envío gratis) — solo en `producto` y `checkout` |
| `--green-bg` | `#F0FDF4` | Fondo del badge de ahorro / ícono de confirmación |

**No hay un segundo color de marca configurable en el mockup** — `--navy` funciona como color "de sistema" (aparece igual en los 5 archivos, nunca cambia de rol) y `--coral` es el único color que se comporta como "acento de marca". Ver sección 5 para cómo esto se traduce a variables por tenant.

### Tipografías y roles

```
--display: 'Cormorant Garamond', Georgia, serif   (weights 300, 400, 600 + itálica 300, 400)
--body:    'DM Sans', system-ui, sans-serif        (weights 300, 400, 500)
```

Google Fonts (idéntico en los 5 mockups):
```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap
```

- **`--display`** (serif, itálica disponible): todos los títulos grandes — hero, títulos de sección, nombre de producto, título de confirmación. Siempre `font-weight: 300` (nunca bold), a veces con una palabra en itálica para énfasis (`<em>tu manera</em>` en el hero).
- **`--body`** (sans, sin itálica): todo lo demás — nav, botones, precios, formularios, párrafos. `font-weight: 400` por default, `500` para elementos con más peso (botones, precios actuales), `300` para texto secundario largo (subtítulos).

### Escala tipográfica (tamaños reales usados, no una escala inventada)

| Uso | Tamaño | Font | Weight |
|---|---|---|---|
| Hero title (home) | `clamp(52px, 7vw, 88px)` | display | 300 |
| Confirm title (checkout) | 44px | display | 300 |
| Category banner title | `clamp(40px, 6vw, 64px)` | display | 300 |
| Page title (categorías índice) | `clamp(36px, 5vw, 56px)` | display | 300 |
| Mid-banner title (home) | `clamp(36px, 5vw, 60px)` | display | 300 |
| Section title | 36px | display | 300 |
| Product name (detalle) | 40px | display | 300 |
| Related/Insta title | 32px | display | 300 |
| Cat-hero-name (wide) | 44px | display | 400 |
| Cat-hero-name (normal) | 32px | display | 400 |
| Mid-banner stat number | 72px | display | 300 |
| Price current (detalle) | 36px | display | 400 |
| Col-name / cart-title | 22-24px | display | 300-400 |
| Body base | 14px | body | 400, line-height 1.6 |
| Product name (card) | 14px | body | 400 |
| Price current (card) | 15px | body | 500 |
| Nav / labels / eyebrows | 10-12.5px | body | 500-600, uppercase, letter-spacing 0.06-0.18em |

**Patrón consistente**: todo lo grande y emocional (títulos) usa `--display` en weight 300 (nunca bold — la elegancia viene del tamaño + serif, no del peso). Todo lo funcional (precios, botones, nav, labels) usa `--body`, con mayúsculas + letter-spacing amplio para los textos pequeños de navegación/acento (patrón "editorial").

### Espaciados y breakpoints

- Contenedor máximo: `1200px` (casi todas las páginas), `1100px` (checkout), `600px` (confirmación).
- Padding lateral estándar: `32px`.
- Header: `72px` de alto, `sticky top: 0`, `z-index: 100`.
- Toolbars/tabs secundarios (categoría, categorías-índice): `sticky top: 72px` (debajo del header), `z-index: 90`.
- Secciones de home: `padding: 80px 32px`.
- Gaps de grillas: `16-20px` (grillas de producto/categoría), `40-64px` (layouts de dos columnas: producto, checkout).

**⚠️ Ningún mockup tiene una sola media query.** Los 5 archivos son vistas de escritorio puras — no hay ninguna definición de qué pasa en mobile (colapso del grid de 4 a 2 columnas, header, filtros, etc.). Esto es un vacío real que el CLAUDE.md de esta carpeta pide resolver con criterio "mobile first" pero **el mockup no lo especifica** — cada tarea de implementación va a tener que definir el comportamiento mobile por su cuenta, documentado como decisión propia, no como algo que "dice el mockup".

### Border radius, sombras, transiciones

- **Border radius: prácticamente 0 en todo el sistema** (estética editorial, esquinas rectas) — las únicas excepciones son elementos circulares (`border-radius: 50%`: badges, dots de color, botón de WhatsApp, `step-num`) y un par de botones sueltos con `border-radius: 2px` (chip de filtro, banner inferior de categorías).
- **Sombras: mínimas**, el sistema se apoya en bordes (`1px solid var(--gray)`) para separar, no en sombras. Las únicas sombras reales: `cart-drawer` (`-4px 0 24px rgba(0,0,0,0.12)`) y `whatsapp-float` (`0 4px 16px rgba(37,211,102,0.4)`).
- **Transiciones**: `0.15s-0.6s ease`, casi siempre sobre `color`, `background`, `transform` u `opacity`. Patrón recurrente: elementos que aparecen al hover (wishlist, quick-add, botón "ver todo" de categoría) usan `opacity` u `transform: translateY(...)` con transición, no `display`.

## 2. Componentes nuevos a crear

Ninguno de estos existe hoy en `frontend/src/features/store/` ni `frontend/src/features/catalog/`:

- **Announcement bar** — franja superior fija con mensaje promocional.
- **Header v2** — nav de categorías a la izquierda, logo centrado, iconos de acción (buscar/cuenta/carrito con badge) a la derecha. El header actual (`StoreLayout.tsx`) es una fila simple sin nav de categorías.
- **Hero de home** — imagen full-bleed + eyebrow + título + CTA. No existe ninguna sección "hero" en el home actual.
- **Category card (home)** — tarjeta grande con overlay degradado, nombre, contador, CTA on-hover.
- **Mid-banner** — banner promocional intermedio con imagen de fondo + texto + estadística.
- **Instagram strip** — grilla de 5 fotos con overlay on-hover. Sin integración real a Instagram (ver sección 6).
- **WhatsApp float** — botón flotante fijo, independiente del footer.
- **Footer v2** — 4 columnas (marca+social, tienda, ayuda, contacto) + barra inferior con copyright y badges de medios de pago. El footer actual es una sola columna simple.
- **Página "Categorías" (índice)** — tabs Categorías/Colecciones/Ofertas, cards grandes tipo "hero" para categorías destacadas + grilla de colecciones + banner inferior de contacto. **Esta página no existe en absoluto hoy** — no hay ruta ni componente.
- **Toolbar de categoría** — chip de filtros, filtros activos removibles, contador de resultados, select de orden, toggle de vista grilla/lista.
- **Sidebar de filtros** — talle (chips), color (dots), precio (slider + inputs), marca (checkboxes con contador), estado (grupo colapsable).
- **Paginación con números** — hoy `CategoryPage.tsx` (T19) solo tiene "Anterior/Siguiente" sin números de página.
- **Galería de producto** — imagen principal + flechas + dots + thumbnails seleccionables. La actual es más simple (thumbnails + imagen principal, sin flechas ni dots).
- **Selector de talle con estado sin-stock tachado** (diagonal), selector de color con swatches circulares + nombre debajo (el actual usa chips/pills, no swatches redondos).
- **Indicador de stock con texto contextual** ("Quedan solo 5 unidades en talle M · Rojo") — el actual es más genérico.
- **Botón "Comprar ahora"** además de "Agregar al carrito" — no existe hoy (solo hay un botón de agregar al carrito).
- **Benefits strip** — 3 columnas con ícono/texto (envío, cambios, pago seguro) en la ficha de producto.
- **Accordion de producto** (descripción / guía de talles / envíos y cambios) — hoy la descripción es un párrafo fijo, sin acordeón ni guía de talles.
- **Sección "también te puede gustar"** (productos relacionados) — no existe hoy.
- **Cart drawer v2** — con promo code, resumen con ahorro, nota de seguridad.
- **Checkout con secciones numeradas y colapsables** (datos completados se colapsan con "Editar") — el checkout actual es un formulario plano de una sola sección.
- **Selector de método de envío como radio cards** con nombre/subtítulo/precio — hoy es un `<select>` simple.
- **Selector de método de pago como radio cards** — hoy no hay elección de método, siempre es Mercado Pago.
- **Página de confirmación de pedido** rediseñada — con caja de detalles, banner de tracking, y 3 acciones (ver pedidos / seguir comprando / WhatsApp). La actual (`CheckoutResultPage.tsx`) es un mensaje simple con dos links.
- **Step indicator del checkout** (Carrito → Datos y envío → Pago).

## 3. Componentes existentes a adaptar

| Componente actual | Qué tiene hoy | Qué le falta para el mockup |
|---|---|---|
| `StoreLayout.tsx` | Header simple (logo+share+carrito+cuenta), footer de una columna, banner opcional | Todo el header/footer v2 (sección 2), announcement bar, WhatsApp float |
| `ProductCard.tsx` | Imagen, marca, nombre, precio (+tachado) | Badge (oferta/nuevo), botón wishlist on-hover, botón quick-add on-hover |
| `HomeSectionsRenderer.tsx` + `CatalogHomePage.tsx` | Renderiza secciones de `home_sections` en grilla, sin hero ni banners | Hero, mid-banner, Instagram strip — contenido "marketing" que no viene de `home_sections` (ver sección 6, dónde vive esto) |
| `CategoryPage.tsx` (T19/10) | Título + grilla + paginación Anterior/Siguiente, sin filtros | Banner de categoría, toolbar, sidebar de filtros, paginación numerada (los filtros son mayormente **visuales-solamente** en v1 — ver sección 4) |
| `ProductDetailView.tsx` | Galería simple, chips de talle/color, stock, botón único | Galería con flechas/dots, selector de color con swatches, benefits strip, accordion, relacionados, botón "comprar ahora" |
| `CartDrawer.tsx` | Lista de ítems, subtotal, botón "Iniciar compra" | Promo code (visual, ver sección 4), resumen con ahorro, nota de seguridad |
| `CheckoutPage.tsx` | Formulario plano (contacto/envío/nota), resumen lateral | Secciones numeradas colapsables, radio cards de envío/pago |
| `CheckoutResultPage.tsx` | Mensaje + 2 links | Página de confirmación completa (sección 2) |

**Página nueva sin equivalente actual**: la página "Categorías" (índice) — no hay ni ruta ni componente parecido hoy.

## 4. Qué cambia vs lo que existe hoy

- **`frontend/src/features/catalog/catalog.css` → se reemplaza.** No se parchea: el sistema de diseño nuevo (tokens + componentes) es suficientemente distinto (tipografía, paleta, densidad) como para que mantener reglas viejas mezcladas sea más riesgo que beneficio. `01-design-tokens.md` arranca ese archivo de cero, portando solo lo que siga siendo necesario.
- **Componentes de `features/store/` y `features/catalog/` → se rediseñan** (sección 3), reusando la lógica de datos que ya tienen (fetch, estado, handlers) — el rediseño es de JSX/CSS, no de cómo se obtienen o mutan los datos.
- **Backend → no se toca.** Todo lo que el mockup muestra y el backend no soporta hoy queda documentado en la sección 6 como pendiente, no se agrega en T20.

## 5. Sistema de variables CSS por tenant

El mockup usa un solo color que cambia de "rol de marca" (`--coral`) — `--navy` y el resto de la paleta son neutros de sistema, iguales en los 5 archivos. Esto encaja bien con lo que el backend ya soporta hoy: `catalog_configs` tiene **un solo campo de color** (`accentColor`), no dos.

Variables propuestas (a confirmar en `01-design-tokens.md`, no una decisión cerrada acá):

```css
:root {
  /* Configurables por tenant — vienen de catalog_configs */
  --tenant-primary: var(--accent, #F07058);   /* ya existe: accentColor, reemplaza el rol de --coral */
  --tenant-font-display: 'Cormorant Garamond', Georgia, serif; /* nuevo — ver nota abajo */
  --tenant-logo: none; /* no es una var CSS real, logoUrl ya se consume como <img src> */

  /* Fijos del sistema de diseño — iguales para todos los tenants en T20 */
  --navy: #1E2A4A;
  --white: #FFFFFF;
  --off: #F8F7F5;
  --gray: #E8E4DF;
  --text: #2C2C2C;
  --muted: #8A8278;
  --green: #16A34A;
  --green-bg: #F0FDF4;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

**Nota sobre tipografía**: el README pide que "tipografía" sea configurable por tenant, pero el mockup fija una pareja específica (serif display + DM Sans body). La propuesta acá es que **solo la fuente de display sea configurable** (`--tenant-font-display`) y `DM Sans` quede fijo como fuente de cuerpo/UI (botones, formularios, precios) — cambiar la tipografía de UI completa por tenant arriesga legibilidad y consistencia de componentes que no están pensados para eso (inputs, badges). Es una recomendación, no algo que el mockup dicte — confirmar en `01`.

`--tenant-primary` ya tiene el mecanismo funcionando (`StoreLayout.tsx` ya inyecta `--accent: config.accentColor` inline) — T20 solo necesita renombrar/extender ese mecanismo, no crearlo de cero.

## 6. Lo configurable desde el admin

Campos que el diseño nuevo necesita, separados por si ya existen en el backend o no:

### Ya existen (solo falta exponerlos/usarlos en la UI nueva)
- `logoUrl`, `accentColor`, `businessDescription`, `bannerUrl`, `whatsapp`, `instagram`, `email`, `address`, `businessHours` — todos en `catalog_configs`, ya usados hoy.
- Zonas de envío (`shipping_zones`: nombre, costo, envío gratis desde) — el mockup muestra 3 métodos de envío con nombres/textos descriptivos ("Envío express — Zona Quilmes", "Andreani — Todo el país", "Retiro en local") que son más ricos que lo que el modelo actual guarda, pero el dato base (nombre + costo) ya está — la UI puede mostrar lo real, no necesita inventar texto.
- Stock por variante (`stockOnline`) — el indicador de stock del mockup ("Quedan solo 5 unidades") ya tiene su dato real disponible, es el mismo que usa `ProductDetailView.tsx` hoy con otro texto.

### No existen — requieren tocar backend (fuera de alcance de T20, quedan documentados para después)
- **Foto de categoría y de colección**: `categories` y `collections` no tienen ningún campo de imagen hoy (confirmado en el schema) — el mockup depende de esto en 3 pantallas (home, categorías-índice, categoría individual). Es el gap más grande de todo T20.
- **Menú del header**: qué categorías/links aparecen en la nav superior — hoy no hay ningún concepto de "featured en el header"; podría resolverse reusando `home_sections` (ya existe, sin backend nuevo) en vez de crear un campo dedicado — a decidir en `02-header-footer.md`.
- **Texto del announcement bar** — no hay campo para esto. Alternativa sin tocar backend: generarlo automáticamente a partir de zonas de envío reales (ej. "Envío gratis en zona X desde $Y") en vez de un texto libre configurable.
- **Banner promocional intermedio** (texto + estadística del "mid-banner") — no hay campo para contenido promocional de este tipo.
- **Reviews/calificación de producto** ("4.8 · 12 reseñas") — no existe ningún sistema de reseñas. Recomendación: **omitir del todo en T20**, no simular con datos falsos.
- **Wishlist** — no hay tabla ni endpoint. Si se implementa en T20, tendría que ser un toggle visual sin persistencia real (o local al navegador) — a decidir en la tarea correspondiente, dejando claro que no sincroniza entre dispositivos.
- **Código de descuento / cupones** — no existe ningún sistema de promociones. El campo del mockup (`cart-promo`) queda visualmente pero sin funcionalidad real, o se omite — a decidir.
- **Fotos de Instagram** (grilla "@eliathimodas") — requeriría integración con la API de Instagram, bien fuera de alcance. Alternativa sin integración externa: reemplazar por una galería de imágenes subidas a mano desde el admin (igual requiere backend nuevo — un campo/tabla de "galería"), o directamente omitir la sección.
- **Sort/orden de productos en categoría** ("Más vendidos", "Más nuevos") y **filtros funcionales** (talle/color/precio/marca) en la página de categoría — el endpoint de T19 (`GET /public/:slug/categories/:categorySlug/products`) solo pagina, no filtra ni ordena por parámetro. La UI del mockup se puede construir igual, pero **sin funcionalidad real de filtrado/orden en V1** (o filtrando únicamente sobre los productos ya cargados en la página actual, que no es lo mismo que filtrar sobre todo el catálogo) — esto se marca explícito en `05-pagina-categoria.md`, es la limitación más importante a tener clara antes de implementar esa tarea.
