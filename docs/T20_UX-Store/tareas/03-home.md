# 03 — Home

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

La portada de la tienda: hero full-bleed, grilla de categorías destacadas, secciones de productos (reusando `home_sections`), banner promocional intermedio, y la franja de Instagram.

## Referencia visual

`mockup_eliathi_home.html` completo — `.hero`, `.categories-grid`/`.cat-card`, `.products-grid`/`.product-card` (secciones "Lo más vendido" y "Verano 2027"), `.mid-banner`, `.insta-strip`.

## Componentes a crear o modificar

- Hero (nuevo).
- Category card de home (nuevo).
- `ProductCard.tsx` (adaptar): agregar badge, wishlist on-hover, quick-add on-hover — ver Notas sobre wishlist.
- Mid-banner (nuevo).
- Instagram strip (nuevo, contenido — ver Notas).
- `HomeSectionsRenderer.tsx` / `CatalogHomePage.tsx` (adaptar): sigue renderizando las secciones reales de `home_sections`, ahora con el estilo de card nuevo.

## Variables CSS que usa o define

Consume los tokens de `01` y el header/footer de `02`. Define clases propias de sección (`.hero`, `.mid-banner`, `.insta-strip`, etc. — nombres exactos a definir en la implementación, sin necesidad de nuevas variables CSS).

## Archivos a modificar

- `frontend/src/features/store/pages/CatalogHomePage.tsx`
- `frontend/src/features/catalog/HomeSectionsRenderer.tsx`
- `frontend/src/features/catalog/ProductCard.tsx`
- `frontend/src/features/catalog/catalog.css`
- Componente nuevo para el hero/mid-banner/insta-strip (archivo a definir, ej. `frontend/src/features/store/pages/CatalogHomePage.tsx` mismo, o subcomponentes en `frontend/src/features/store/components/` — evaluar en la implementación si conviene separarlos)

## Criterio de completado

- El hero se ve con imagen, eyebrow, título y CTA — con contenido real de la org donde exista (ver Notas), no hardcodeado a Eliathi Modas.
- Las secciones de `home_sections` siguen mostrando los productos reales de cada categoría/colección, con el nuevo `ProductCard`.
- El link "Ver todos" de cada sección (ya construido en T19/10) se sigue viendo y funcionando con el nuevo estilo.
- `tsc --noEmit` limpio; verificado en navegador en `/store/eliathi-modas` con datos reales.

## Notas y dependencias

- **Depende de `01` y `02`.**
- **Hero y mid-banner son contenido sin dato real detrás** (`analisis.md` sección 6: no hay campo de "imagen de hero" ni "texto promocional" en `catalog_configs`) — para esta tarea, la opción sin tocar backend es reusar lo que ya existe (`bannerUrl`, `businessDescription`) de forma aproximada, dejando claro en el código/PR que es una reutilización, no el campo ideal — o mostrar el hero con contenido genérico no específico de marca hasta que exista el campo real. Confirmar el criterio antes de implementar.
- **Instagram strip**: sin integración a la API de Instagram (fuera de alcance total), la sección o se omite en V1, o se deja con un estado vacío/oculto cuando no hay contenido — no inventar fotos. Confirmar con el usuario si se implementa la estructura vacía (lista para cuando haya backend) o se omite directamente de esta tarea.
- **Wishlist** (botón ♡ del `ProductCard`): sin backend, es un toggle puramente visual (sin persistencia) si se implementa — confirmar si entra en el alcance de esta tarea o se pospone a una futura, dado que un corazón que "no guarda nada" puede ser más confuso que no tenerlo.
- **Quick-add** (agregar al carrito directo desde la card, sin pasar por la ficha): technically posible reusando la lógica de `CartContext` ya existente, pero un producto con variantes (talle/color) no tiene forma de elegir cuál agregar desde la card — el mockup no aclara qué pasa en ese caso. Confirmar comportamiento (¿agrega la primera variante disponible? ¿lleva a la ficha si hay más de una variante?) antes de implementar.

## Resultado

Decisiones del usuario antes de implementar: hero reusa `bannerUrl` (fondo) + `businessDescription` (subtítulo) + `storeName` (título); mid-banner con el mismo criterio (reusa `bannerUrl`); Instagram strip y wishlist **omitidos por completo en V1**; quick-add navega a la ficha del producto (`/store/:slug/p/:id`), nunca agrega al carrito directo.

- **`CatalogHomePage.tsx`** reescrito con 3 sub-componentes: `Hero`, `CategoriesGrid` (deriva categorías reales de `home_sections` filtrando `refType === "category"`, sin tocar el endpoint), `MidBanner`. Orden final: Hero → Categorías → todas las secciones de `home_sections` (vía `HomeSectionsRenderer`, sin cambios de datos) → Mid-banner — simplificado respecto al mockup (que intercala el mid-banner entre dos secciones de producto fijas) porque acá la cantidad de secciones es dinámica, documentado como extrapolación en el propio código.
- **`ProductCard.tsx`** adaptado: nuevo wrapper `.pcard-img-wrap` (para poder posicionar overlays), badge de descuento (`−N%`) cuando hay `compareAtPrice`, botón "Ver producto" como quick-add. **Desviación deliberada del mockup**: el quick-add del mockup aparece solo al hover (`.product-card:hover .product-quick-add`), pero se decidió dejarlo siempre visible — en mobile no existe estado hover y el catálogo se consume mayormente desde el celular (principio "mobile first" de `CLAUDE.md`). Wishlist (♡) no se agregó, alineado con la decisión de omitirlo en V1.
- **`catalog.css`**: nuevas clases `.home-hero`(+`-content`/`-title`/`-sub`/`-cta`/`-cta-arrow`), `.home-section`, `.home-categories-grid`/`.home-cat-card`(+`-ph`/`-overlay`/`-name`/`-count`), `.home-mid-banner`(+`-inner`/`-title`/`-btn`), `.pcard-img-wrap`, `.pcard-badge`, `.pcard-quick-add`. Hero y mid-banner son full-bleed (rompen el `max-width:1000px`/padding de `.store-main` con el truco `calc(50% - 50vw)`, igual criterio visual que el mockup). Grillas de categorías con `repeat(auto-fill, minmax(150px, 1fr))` — mismo patrón ya usado en `.hsr-grid` (T19), responsive sin necesitar media queries.
- **Bug de `02` encontrado y corregido de paso**: `StoreLayout.tsx` inyectaba `--tenant-primary` inline en vez de `--accent`, contradiciendo la decisión de `01` (Opción A: `--accent` sigue siendo la variable real inyectada, `--tenant-primary: var(--accent, #F07058)` es solo un alias en CSS). Con eso, `--accent` nunca se seteaba en la tienda pública y varias reglas que dependen de ella (`.pdv-buy`, `.store-topbar`, `.store-brand-badge`, `.portal-order:hover`, `.store-back a`, `.hsr-viewall`) caían silenciosamente a su color hardcodeado en vez del color real de la org. Corregido en `StoreLayout.tsx` para volver a inyectar `--accent`.

**Ajuste post-verificación (bannerUrl real de Eliathi Modas)**: al verificar en navegador, `bannerUrl` resultó ser un banner promocional real con texto propio "horneado" en la imagen ("10% OFF" + gráfica de billetera), no una foto ambiente como asume el mockup — usado en el hero (full-bleed, `background-size:cover`) quedaba gigante/recortado y su texto se superponía de forma confusa con el título "Eliathi Modas!"; además se duplicaba al reusarse también en el mid-banner. El usuario decidió: **hero sin imagen** (fondo `--navy` sólido + título + CTA, `bannerUrl` ya no se usa ahí) y **mid-banner como único lugar que muestra `bannerUrl`**, ahora como imagen sola sin texto superpuesto (todo el banner es un `<Link>` clickeable a `/categorias`, sin `eyebrow`/título hardcodeado que compitiera con el texto que ya trae la imagen); si la org no tiene `bannerUrl`, el mid-banner cae a un fallback con fondo navy + texto genérico "Descubrí la colección completa" + botón.

`tsc --noEmit` y `vite build` limpios en cada ronda. **Verificado por el usuario en navegador** en `/store/eliathi-modas`: nav de categorías funciona (link a cada categoría), grilla "Explorá por categoría" con nombres/cantidades reales, secciones de producto con el nuevo card. El 404 en `/store/eliathi-modas/categorias` al clickear "Ver catálogo" es esperado (ruta de la tarea `04`, todavía no construida, wireada a propósito desde `02`).

**Hueco entre el mid-banner y el footer**: en tiendas con poco contenido (esta org de prueba tiene 5 productos), `.store-main{flex:1}` (patrón sticky-footer preexistente, previo a T20) deja un espacio vacío color `--off` antes del footer. Se intentó resolver con `.home-page{min-height:100%}` — no funcionó de forma confiable (los porcentajes de altura no se resuelven bien a través de una cadena de flex anidados). Se cambió el enfoque: `.store-main` pasó a `display:flex; flex-direction:column` y `.home-page` usa `flex:1` directo (sin porcentajes) para que `.home-mid-banner` (también `flex:1`) absorba el sobrante. **Pendiente confirmar si esto ya resolvió el hueco** — quedó sin verificar en el ida y vuelta siguiente, que se desvió a otros ajustes (logo del header, íconos, hero). Retomar en la próxima verificación.

**Ajustes de header (fuera del alcance original de esta tarea, resueltos acá por surgir en la misma verificación)**:
- Logo reposicionado al extremo izquierdo (antes del nav), no centrado — con el grid `1fr auto 1fr` original, el nav (6 categorías) pesaba más que los íconos y corría el logo del centro real. Se cambió `.store-header-inner` a flex simple: logo → nav → íconos empujados a la derecha con `margin-left:auto`.
- Íconos del header (`🔍`/`🔗`/`✓`/`👤`/`🛒`) reemplazados por SVG de línea propios (`frontend/src/features/store/icons.tsx`, sin librería nueva) — el usuario los encontró "muy básicos". El WhatsApp flotante y los íconos sociales del footer quedaron sin tocar (no se pidió).

**Hero sin imagen (ajuste final)**: se probó agregar una foto de stock de Unsplash como placeholder temporal del hero (igual a la del mockup) — se descartó: contradice la decisión ya tomada de sacar toda imagen del hero, y usar fotos de gente/ropa que no es de la org es el tipo de contenido inventado que T20 viene evitando (`analisis.md` sección 6). En su lugar, **Opción A** (de tres alternativas de diseño puro presentadas al usuario: tipografía protagonista / gradiente sutil / patrón geométrico): título en `--tenant-font-display` a `clamp(48px, 9vw, 100px)`, hero con `min-height:60vh`, subtítulo (`businessDescription`) en itálica para el acento editorial — en vez de italizar una palabra suelta del título (como hace el mockup), ya que `config.storeName` es texto libre por tenant y no se puede asumir qué palabra italizar sin hardcodear algo específico de un tenant.
