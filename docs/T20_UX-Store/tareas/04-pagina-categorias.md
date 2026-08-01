# 04 — Página "Categorías" (índice)

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

Una página nueva que no existe hoy: el índice de todas las categorías y colecciones de la tienda, con tabs (Categorías / Colecciones / Ofertas), cards grandes tipo "hero" para categorías, grilla de colecciones, y un banner inferior de contacto.

## Referencia visual

`mockup_eliathi_categorias.html` completo — `.page-hero`, `.tabs-bar`, `.categories-hero`/`.cat-hero-card` (incluida la variante `.wide`), `.collections-grid`/`.col-card`, `.bottom-banner`.

## Componentes a crear o modificar

- Página nueva completa (no hay equivalente actual — ver `analisis.md` sección 3).
- Page hero compacto con breadcrumb (nuevo, reutilizable — también aparece en `05`).
- Tabs bar (nuevo).
- Cat-hero-card, incluida variante ancha (nuevo).
- Col-card (nuevo).
- Bottom banner de contacto (nuevo).

## Variables CSS que usa o define

Consume tokens de `01` y header/footer de `02`. No define variables nuevas.

## Archivos a modificar

- Nueva página, ej. `frontend/src/features/store/pages/CategoriesIndexPage.tsx` (nombre a definir).
- `frontend/src/router.tsx` — nueva ruta pública, ej. `/store/:slug/categorias` (a definir; no confundir con `/store/:slug/c/:categorySlug`, que ya existe desde T19/10 y es la página de **una** categoría, tarea `05`).
- `frontend/src/features/catalog/catalog.css`.
- Backend: **no se toca**, pero esta página necesita listar categorías y colecciones con su conteo de productos — evaluar si los endpoints existentes alcanzan (`GET /public/:slug/home` no sirve para esto, es solo lo que está en el home) o si hace falta un endpoint público nuevo de "todas las categorías/colecciones con conteo" — si hiciera falta un endpoint nuevo, **no está en el alcance de T20** tal como está definido (sin backend); documentar el bloqueo y confirmar con el usuario antes de avanzar con esta tarea puntual.

## Criterio de completado

- La página lista las categorías y colecciones reales de la org (no las 5 categorías hardcodeadas del mockup).
- El tab "Categorías" muestra las cards con foto — **sujeto al gap de `analisis.md` sección 6** (categorías no tienen campo de imagen hoy): definir un placeholder consistente para categorías sin foto, no dejarlo roto.
- El tab "Colecciones" ídem.
- El tab "Ofertas" — sin un concepto de "oferta" curado en el backend (más allá de qué productos tienen `compareAtPrice`), definir qué muestra este tab antes de darlo por completo (podría ser: productos con descuento activo, calculado en el cliente sobre datos ya públicos — a confirmar).
- `tsc --noEmit` limpio; verificado en navegador con la org real.

## Notas y dependencias

- **Depende de `01` y `02`.** Independiente de `05`, `06`, `07`.
- **El mayor bloqueo de esta tarea es de datos, no de UI**: sin foto de categoría/colección (backend-touching, `analisis.md` sección 6) y sin claridad sobre qué endpoint alimenta "todas las categorías con conteo", esta tarea puede terminar construyendo la UI completa pero con placeholders en vez de fotos reales, y con un tab "Ofertas" definido de forma más simple que lo que el mockup sugiere. Documentar cada decisión tomada, no dejarla implícita en el código.

## Resultado

**Endpoint**: no existe un endpoint dedicado a "todas las categorías/colecciones con conteo" — se confirmó antes de implementar que no hace falta crear uno nuevo, con matices distintos por tab:
- **Categorías**: `GET /public/:slug/home` (existente) sirve casi completo — gracias a T19/06 (auto-creación de `home_section` al crear una categoría, `visible:true` por default), este endpoint devuelve prácticamente todas las categorías activas de la org. Única excepción: una categoría oculta a mano por el admin en la gestión de home sections no aparece acá. **Documentado como limitación aceptada**, no bloqueante.
- **Colecciones**: sin auto-creación equivalente (`ensureCategoryHomeSection` solo corre para categorías) — una colección solo aparece si un admin la agregó manualmente al home. Puede haber colecciones reales en la org que no se listen acá. **Decisión del usuario**: si `home_sections` no tiene ninguna colección, mostrar estado vacío ("Próximamente nuevas colecciones") en vez de una lista parcial que podría hacer pensar que esas son *todas* las colecciones de la org.

**Decisiones de diseño (usuario)**:
1. Placeholder de categoría/colección sin foto: `--tenant-primary` al 20% de opacidad sobre `--navy` (vía `::before`, ya que `--tenant-primary` es un hex arbitrario por tenant y no se puede aplicar `rgba()` directo sobre él) con nombre + conteo centrados/al pie.
2. Tab "Ofertas": omitido en V1 — solo "Categorías" y "Colecciones".
3. Colecciones sin curar en home: estado vacío explícito, no lista parcial.

**Implementación**:
- `frontend/src/features/store/pages/CategoriesIndexPage.tsx` (nuevo) — reusa `GET /public/:slug/home`, filtra por `refType`. Tabs con estado local (`useState`), sin URL param (no hacía falta persistir el tab en la URL para esta versión).
- Ruta nueva `/store/:slug/categorias` en `router.tsx`, antes de `c/:categorySlug` (sin conflicto de matching, son paths literales distintos).
- **Card de categoría** (`.cat-hero-card`): clickeable → `/store/:slug/c/:categorySlug` (ruta real, ya existe desde T19/10). Primera categoría de la lista usa la variante `.wide` (ocupa 2 columnas) solo si hay más de una categoría — evita que quede achicada sin una fila para estirarse contra ella.
- **Card de colección** (`.col-card`): **no clickeable** — a diferencia de categorías, no existe ninguna página de detalle de colección en toda la tienda (ninguna tarea de T20 la cubre, confirmado contra el `README.md`). Se muestra como card informativa (nombre + conteo), sin el link "Ver colección →" del mockup, para no simular una navegación que no existe.
- Sin campo de imagen real (`analisis.md` sección 6), se omitieron los "eyebrow" (`"Lo más vendido"`, `"Clásicos"`, etc.) del mockup — son copy editorial inventado por categoría, sin dato real detrás.
- Banner inferior ("¿No encontrás lo que buscás?"): usa `config.whatsapp` real (mismo patrón `wa.me/` que footer/WhatsApp flotante); no se muestra si la org no cargó WhatsApp.
- `.cat-hero-btn` ("Ver todo →") queda siempre visible, no oculto hasta hover — mismo criterio mobile-first ya aplicado en `03` al quick-add de producto.
- Grid de 3/4 columnas del mockup colapsa a 2 en `max-width:768px` — primer uso real de un `@media` en T20 (antes alcanzaba con `auto-fill`, pero la variante `.wide` de `cat-hero-card` no funciona bien con columnas variables).

**Encontrado al verificar en navegador**: `StoreLayout.tsx` tenía un `<img className="store-banner">` que mostraba `config.bannerUrl` arriba de **todas** las páginas de la tienda (header→banner→contenido), un elemento de layout de la época T13/T5, previo a T20. Esto contradecía la decisión de `03` de sacar `bannerUrl` del hero y dejarlo solo en el mid-banner del home — la imagen seguía apareciendo igual en `/categorias` (y en cualquier otra página) por este elemento separado. Se eliminó de `StoreLayout.tsx`; la clase CSS `.store-banner` se dejó intacta porque `MyStorePage.tsx` (preview del admin, T19/07, fuera de alcance de T20) todavía la usa.

**Verificado con datos reales** (curl a `/public/eliathi-modas/home` en el backend de desarrollo): la org tiene 5 categorías activas (Jeans, Remeras, Camperas, Remeras Nuevas, Zapatillas) y 0 colecciones — confirma que el tab "Colecciones" va a mostrar el estado vacío tal como se diseñó, sin necesidad de datos de prueba temporales.

`tsc --noEmit` y `vite build` limpios. **Verificado por el usuario en navegador** en `/store/eliathi-modas/categorias`: header, page-hero, tabs, cards de categoría con placeholder de color, y confirmado tras el fix que la franja de `bannerUrl` ya no aparece arriba de las páginas.
