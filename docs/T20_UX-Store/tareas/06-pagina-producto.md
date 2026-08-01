# 06 — Página de producto

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

El rediseño completo de la ficha de producto: galería con navegación, selector de talle/color, indicador de stock, botones de compra, benefits strip, accordion de información, y productos relacionados.

## Referencia visual

`mockup_eliathi_producto.html` completo — `.breadcrumb-bar`, `.gallery` (`.gallery-main`, `.gallery-nav`, `.gallery-dots`, `.gallery-thumbs`), `.product-info` (`.product-prices`, `.talle-options`, `.color-options`, `.stock-indicator`, `.cta-group`, `.benefits-strip`, `.accordion`), `.related-section`.

## Componentes a crear o modificar

- Galería con flechas + dots + thumbnails (adaptar — la actual solo tiene thumbnails).
- Selector de talle con estado sin-stock tachado en diagonal (adaptar).
- Selector de color con swatches circulares + nombre (adaptar — el actual no tiene esta variante).
- Stock indicator contextual (adaptar — lógica de umbral ya existe, cambia el texto/estilo).
- CTA group: cantidad + agregar al carrito + comprar ahora (nuevo el botón "comprar ahora" y el selector de cantidad).
- Benefits strip (nuevo).
- Accordion (nuevo).
- Sección de relacionados (nuevo, usa `ProductCard`).
- `ProductDetailView.tsx` (adaptar, es el componente central de esta tarea).
- `StoreProductPage.tsx` (adaptar — fetch y wiring quedan iguales).

## Variables CSS que usa o define

Consume tokens de `01` y header/footer de `02`.

## Archivos a modificar

- `frontend/src/features/catalog/ProductDetailView.tsx`
- `frontend/src/features/store/pages/StoreProductPage.tsx`
- `frontend/src/features/catalog/catalog.css`
- `frontend/src/features/store/types.ts` (`PublicProductDetail`) — solo si hace falta algo que hoy no viaja (ver Notas sobre relacionados)

## Criterio de completado

- Galería funciona con múltiples imágenes reales del producto (flechas, dots y thumbnails sincronizados) — con 1 sola imagen, los controles de navegación no deberían aparecer (o quedar deshabilitados, a definir).
- Selector de talle/color sigue funcionando con los datos reales de variantes (igual lógica que hoy: elegir talle filtra colores disponibles), con el estilo nuevo.
- Precio con descuento, botón agregar al carrito y "sin stock" siguen funcionando exactamente igual que hoy (mismo estado/lógica, otro layout).
- El accordion muestra la descripción real del producto; "Guía de talles" y "Envíos y cambios" — ver Notas, son contenido sin dato real detrás.
- `tsc --noEmit` limpio; verificado en navegador con un producto real con múltiples variantes e imágenes.

## Notas y dependencias

- **Depende de `01` y `02`.** Independiente de `03`, `04`, `05`, `07`.
- **Rating/reseñas** ("★★★★★ 4.8 · 12 reseñas"): sin sistema de reseñas (`analisis.md` sección 6), **se omite** — no se simula con datos falsos bajo ningún concepto (aplicar el principio de "no inventar datos" de este proyecto).
- **Cuotas sin interés** ("3 cuotas sin interés de $X"): texto informativo genérico sobre cómo funciona Mercado Pago Checkout Pro (que sí ofrece cuotas reales una vez que el comprador entra a pagar) — puede mostrarse como mensaje estático no específico de un monto exacto, o calculado como `precio / 3` si se quiere ser preciso; no depende de ningún dato nuevo del backend, es texto/cálculo simple. Confirmar el criterio exacto al implementar.
- **Accordion "Guía de talles"**: no hay ninguna tabla de medidas real por producto/categoría en el backend — si se implementa, es contenido genérico no específico del producto (ej. una tabla estándar de talles de indumentaria), a diferenciar claramente de la "Descripción" (que sí es dato real del producto).
- **Productos relacionados**: el mockup los muestra sin dejar claro el criterio (¿misma categoría? ¿misma colección?) — resolver reusando datos ya disponibles (ej. otros productos de la misma categoría, ya alcanzable vía el endpoint de `05`) sin necesidad de un endpoint nuevo.
- **Comprar ahora**: se implementa como agregar al carrito + navegar directo al checkout, reusando lógica existente — sin lógica de negocio nueva.

## Resultado

**Decisiones del usuario (antes de implementar)**:
1. Cuotas: `precio / 3`, mostrado siempre que hay precio (que es siempre).
2. Accordion: solo **Descripción** (real) y **Envíos y cambios** (genérico, armado con `config.address`/`config.businessHours`/zonas de envío reales) — "Guía de talles" omitida.
3. Relacionados: misma categoría vía `/c/:categorySlug?page=1`, excluyendo el producto actual, máximo 4.
4. Rating/reseñas: omitido.
5. Galería con 1 imagen: sin flechas/dots/thumbnails.

**Cambio de backend aprobado antes de escribir código** (mínimo, aditivo, sin migración): `GET /public/:slug/products/:id` ahora también devuelve `categorySlug`/`categoryName` (join con `categories`, dos campos nuevos en el SELECT) — necesario para que "relacionados" sepa qué categoría consultar. Mismo criterio que el `totalCount` agregado en la tarea `04`.

**Decisiones propias tomadas durante la implementación** (documentadas, no consultadas una por una para no frenar el flujo en detalles menores):
- **Benefits strip**: el mockup muestra "Envío express" / "Cambios gratis 30 días" / "Pago seguro". "Cambios gratis 30 días" es una política de devoluciones que no existe como dato real en ningún lado del backend — inventarla sería una promesa falsa a un comprador real. Se reemplazó por 3 beneficios respaldados en datos/integraciones reales: **envío** (resumen armado con la zona de envío más barata real, mismo patrón que el announcement bar), **pago seguro** (Mercado Pago, la integración real de T16), y **WhatsApp** (si `config.whatsapp` existe, linkea de verdad en vez de prometer una política). El panel "Envíos y cambios" del accordion sigue el mismo criterio: en vez de prometer "cambios gratis", dirige a WhatsApp para consultas.
- **Color swatches**: los colores de variante son texto libre (`productVariants.color`, sin campo de color/hex en el schema) — se agregó un diccionario chico de nombres de color en español → hex (rojo, negro, blanco, azul, etc., ~25 entradas) para el swatch circular. El **nombre de color en texto siempre se muestra al lado** (es el dato real y autoritativo); un nombre no reconocido cae a un swatch neutro con borde punteado en vez de adivinar mal un color — no se pierde ni se falsea información, el swatch es solo una ayuda visual.
- **Talle sin stock**: se agregó el tachado diagonal del mockup (`.pdv-talle-chip.no-stock`) calculado como "ningún color de este talle tiene `stockOnline > 0`" — no existía esta verificación agregada antes de T20, solo se mostraba el stock de la combinación ya elegida.
- **Wishlist / compartir a Instagram**: omitidos — mismo criterio que el resto de T20 (sin persistencia real de wishlist; "compartir a Instagram" no tiene una acción web real detrás, a diferencia del share nativo/clipboard que sí funciona).
- **Accordion**: implementado con `<details>`/`<summary>` nativo en vez de JS manual — mismo comportamiento visual, sin JS extra, accesible por default.

**Compatibilidad con el preview del admin** (`ProductEditPage.tsx`, T2 — fuera de alcance de T20): `ProductDetailView.tsx` sigue siendo el mismo componente presentacional puro compartido. Las props nuevas (`whatsappHref`, `shippingSummary`, `address`, `businessHours`, `related`) son todas opcionales — el preview del admin no las pasa, así que benefits de envío/WhatsApp, el panel "Envíos y cambios" y la sección de relacionados simplemente no aparecen ahí; el resto (galería, talle/color, stock, cuotas, descripción) sí se ve con el estilo nuevo, que es lo esperado ("así se ve en la tienda").

**Bug propio encontrado y corregido antes de verificar**: en el primer borrador, la sección de relacionados quedó anidada *dentro* de `.pdv` (el grid de 2 columnas galería/info) en vez de como hermano debajo — se habría encogido a una columna angosta del mismo grid. Corregido envolviendo el return en un Fragment con `.pdv` y `.pdv-related` como hermanos.

**Verificado con datos reales** (curl a `/public/eliathi-modas/products/:id` sobre "Jeans holgados": 2 imágenes, 3 variantes, `categorySlug`/`categoryName` presentes) — confirma que el endpoint extendido funciona y hay un producto real con suficiente variedad (múltiples imágenes y variantes) para probar la galería y los selectores en el navegador.

**Bugs encontrados al verificar en el admin** (`ProductEditPage.tsx`, preview compartido):
1. `.pdv-qty-row` (selector de cantidad + botón "Agregar al carrito") era un flex row sin wrap — en el preview del admin, más angosto que la tienda real, el texto largo del botón deshabilitado ("ELEGÍ TALLE Y COLOR") se cortaba en el borde del panel en vez de acomodarse. Corregido con `flex-wrap` + `min-width` en `.pdv-btn-cart` (`catalog.css`), para que el botón baje de línea en vez de desbordar.
2. Más serio: `.pdv-gallery` usa `position: sticky; top: 88px` — necesario en la tienda real (layout de 2 columnas, la galería queda fija al lado de la columna de info larga mientras se scrollea). En el preview del admin, `.preview-pane .pdv { grid-template-columns: 1fr }` apila galería e info en una sola columna — ahí el mismo sticky hacía que la galería quedara flotando fija mientras el talle/cantidad/carrito scrolleaban por detrás, superpuestos. Corregido agregando `.preview-pane .pdv-gallery { position: static; }` en `admin.css`, junto al override existente de `.preview-pane .pdv` (mismo archivo, mismo criterio de scoping ya usado ahí) — no es un rediseño del panel admin, es desactivar puntualmente un comportamiento (sticky) que solo tiene sentido en el layout de 2 columnas de la tienda real.

`tsc --noEmit` limpio en `frontend/` y `backend/`; `vite build` limpio en cada ronda. **Verificado por el usuario en navegador**: tienda pública (`/store/eliathi-modas/p/...`) y preview del admin, ambos confirmados sin problemas tras los dos fixes de arriba.
