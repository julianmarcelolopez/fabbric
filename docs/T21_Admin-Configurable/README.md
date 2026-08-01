# T21 — Lo que T20 dejó pendiente del lado del backend

## Qué es esto y por qué existe

`T20_UX-Store` rediseñó visualmente toda la tienda pública con una restricción dura: **sin tocar backend ni esquema de base de datos**. Donde el diseño necesitaba un dato que no existía, T20 lo resolvió de tres formas — un placeholder honesto (foto de categoría → color de marca), un dato real reutilizado de otra forma (announcement bar autogenerado desde zonas de envío), o simplemente omitiendo la funcionalidad (sidebar de filtros, código de descuento). Cada una de esas decisiones quedó documentada, no improvisada.

`docs/T20_UX-Store/tareas/08-admin-configurable.md` — específicamente su tabla "Backend pendiente — lista consolidada" en la sección Resultado — es la fuente de verdad de T21. Esa tabla es el resultado de 8 tareas de implementación real contra mockups reales, no una lista especulativa: cada fila salió de un gap concreto encontrado al construir la tienda nueva.

T21 es la fase siguiente: **cerrar esos gaps tocando backend**, ahora que T20 ya probó en producción visual qué necesita cada pantalla.

## Alcance

Hacer configurable desde el admin todo lo que T20 dejó con placeholder, autogenerado, o directamente sorteado por no tener campo de backend. Esto no es exclusivo de Eliathi Modas: **fabbric es un SaaS multi-tenant** — cada campo que se agrega acá lo puede usar cualquier organización que use la plataforma, no solo la de referencia. Los defaults (placeholder de color, texto autogenerado, etc.) siguen funcionando para los tenants que no configuren nada nuevo — nada de esto es obligatorio de completar.

Las 7 tareas de T21, en orden de la tabla de `T20/08`:

1. Imagen de categoría y colección — el gap más grande, afecta 3 pantallas.
2. Página de detalle de colección — hoy las cards de colección no llevan a ningún lado.
3. Announcement bar configurable — hoy es 100% autogenerado, sin opción de texto propio.
4. Banner intermedio del home configurable — hoy solo muestra la imagen, sin texto propio.
5. Filtros y orden reales en la página de categoría — la sidebar de T20/05 quedó visual pero desconectada.
6. Política de cambios/devoluciones — hoy el benefit de "cambios" linkea a WhatsApp por falta de texto real.
7. Auto-creación de home_section para colecciones — mismo patrón que ya existe para categorías desde T19/06.

## Lo que NO entra en T21

Estos gaps de la tabla de `T20/08` quedan **fuera** — son sistemas completos, no campos simples, y requieren su propia fase de diseño (probablemente con su propio ciclo de mockups/decisiones, no algo para resolver de paso acá):

- **Reviews/calificación de producto** — requiere un sistema de reseñas entero (moderación, quién puede reseñar, agregación de rating).
- **Wishlist** — requiere decidir si es local al dispositivo o sincronizada, tabla nueva, endpoints nuevos.
- **Código de descuento / cupones** — requiere un sistema de promociones (tipos de descuento, vigencia, límites de uso, validación en checkout).
- **Integración con Instagram** — requiere API externa de terceros, autenticación OAuth de Instagram, o una alternativa de "galería propia" que en sí misma sería otra fase.
- **Tracking de envío en tiempo real** — requiere integración con transportistas (Andreani, Correo Argentino, etc.); hoy ya existe `orders.trackingNumber` como carga manual, eso no es lo que falta — lo que falta es tracking en vivo con un proveedor externo.
- **Talles disponibles on-hover en card de categoría** y **"Guía de talles"** — ambos dependen de que el endpoint de categoría traiga variantes por producto; se evalúan junto con la tarea `05` si en la práctica conviene resolverlos ahí, pero no son tareas propias de T21 salvo que surja como extensión natural de `05`.

## Cómo se relaciona con T20

Cada tarea de `tareas/` referencia explícitamente qué fila de la tabla de `T20_UX-Store/tareas/08-admin-configurable.md` resuelve, y qué archivos de T20 hay que tocar del lado de la tienda pública para que dejen de usar el placeholder/fallback y empiecen a usar el dato real cuando exista.

## Cómo trabajamos esta carpeta

Mismo patrón que el resto del proyecto (`docs/T<N>_*/`): cada tarea se implementa una por vez, se verifica de verdad (no solo `tsc --noEmit` — con datos reales contra el backend de desarrollo), y el archivo de tarea se actualiza con una sección de Resultado al cerrarla.

**Orden y dependencias:**
- `07-colecciones-auto-home-section` es independiente y la más simple — puede hacerse primero.
- `03`, `04` y `06` son independientes entre sí y del resto — cada una agrega un campo de texto a `catalog_configs` y lo consume en un lugar puntual de la tienda.
- `05` es independiente pero la más compleja (extiende un endpoint con filtros/orden reales + conecta la sidebar ya construida en T20/05).
- `01` es prerequisito de `02` — la página de detalle de colección necesita `imageUrl` en `collections` para tener foto real, no solo el placeholder de color.

## Estado — T21 completo (2026-08-01)

| # | Tarea | Estado |
|---|---|---|
| 1 | [01-imagen-categoria-coleccion.md](tareas/01-imagen-categoria-coleccion.md) — foto real de categoría/colección | ✅ Completa |
| 2 | [02-pagina-detalle-coleccion.md](tareas/02-pagina-detalle-coleccion.md) — página de colección (reusa CategoryPage) | ✅ Completa |
| 3 | [03-announcement-bar-configurable.md](tareas/03-announcement-bar-configurable.md) — texto propio del announcement bar | ✅ Completa |
| 4 | [04-banner-intermedio-configurable.md](tareas/04-banner-intermedio-configurable.md) — título/subtítulo del mid-banner | ✅ Completa |
| 5 | [05-filtros-categoria-backend.md](tareas/05-filtros-categoria-backend.md) — filtros/orden reales + sidebar conectada | ✅ Completa |
| 6 | [06-politica-cambios-descripcion.md](tareas/06-politica-cambios-descripcion.md) — política de cambios real en la ficha de producto | ✅ Completa |
| 7 | [07-colecciones-auto-home-section.md](tareas/07-colecciones-auto-home-section.md) — auto-creación de home_section para colecciones | ✅ Completa |

Todas las 7 tareas verificadas con datos reales contra el backend de desarrollo (scripts en `backend/t21-*.mjs`, sin trackear), además de `tsc --noEmit`/`vite build` limpios. Pendiente de una pasada visual del usuario en el navegador por cada tarea.
