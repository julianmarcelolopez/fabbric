# 08 — Lo que el admin puede configurar del diseño nuevo

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

Ajustes en el panel admin (`/admin/store`, `MyStorePage.tsx` — T19/07) para que Edgar pueda configurar lo que el diseño nuevo expone **con los campos que ya existen hoy**. Esta tarea NO agrega campos nuevos al backend — separa explícitamente lo que se puede hacer ya de lo que queda documentado como pendiente.

## Referencia visual

No hay un mockup de admin en `mockups/` (los 5 mockups son todos de la tienda pública) — esta tarea se guía por `analisis.md` sección 6 ("Lo configurable desde el admin"), no por una pantalla mockeada. Cualquier decisión de UI acá es una extrapolación del equipo, no algo que "dice el mockup" — dejarlo dicho así en el código/PR.

## Componentes a crear o modificar

- `MyStorePage.tsx` (T19/07) — sin agregar secciones nuevas de campos que no existen en el backend; como mucho, ajustar textos de ayuda para que reflejen el nuevo sistema de diseño (ej. aclarar que el "Color de acento" ahora es `--tenant-primary`, el color de los CTAs de toda la tienda nueva).

## Variables CSS que usa o define

No define variables nuevas — es la fuente de datos (`catalog_configs.accentColor`, `logoUrl`) para `--tenant-primary` y el logo que `01` ya conecta.

## Archivos a modificar

- `frontend/src/features/admin/pages/MyStorePage.tsx` — únicamente si hace falta ajustar copy/ayuda visual, no estructura nueva de campos.

**Todo lo demás de esta tarea es backend** (fuera del alcance real de T20, documentado acá para que quede como punto de partida de una fase futura — no se implementa en T20):

- `backend/src/db/schema.ts` — agregar campo de imagen a `categories` y `collections` (`imageUrl` o similar), + migración.
- Endpoint de upload de imagen de categoría/colección (mismo patrón que ya existe para logo/banner en `catalogConfig/routes.ts`).
- Campo(s) nuevos en `catalog_configs` para: texto del announcement bar (si no se resuelve auto-generándolo desde zonas de envío, ver `02`), contenido del banner promocional intermedio, selección de fuente de display (`--tenant-font-display`).
- Si el nav del header (`02`) no termina reusando `home_sections`: un campo/tabla nueva de "categorías destacadas en el header".
- Si se decide implementar una galería tipo Instagram sin integración externa (`03`): una tabla/campo nuevo de "imágenes destacadas".

## Criterio de completado

- Confirmado que `logoUrl` y `accentColor`, editados desde `/admin/store` hoy, se reflejan correctamente como `--tenant-logo` (uso directo, sin variable CSS) y `--tenant-primary` en las páginas nuevas de `03` a `07` — sin necesidad de releer código, alcanza con cambiar el color en el admin y ver el cambio propagado en la tienda real.
- Ningún campo nuevo se agregó al backend en esta tarea — si en algún momento de la implementación de `08` parece "más fácil" agregar una columna nueva, eso es una señal de que ese trabajo no es de T20, es de una fase siguiente (a proponer, no a ejecutar acá).
- La lista de "backend pendiente" de esta tarea queda consolidada y clara para retomarla después (mismo formato que el resto de `analisis.md` sección 6).

## Notas y dependencias

- Puede hacerse en paralelo con `03` a `07` — no depende de ellas ni ellas de esta (los campos que sí expone ya se consumen desde `01`).
- Depende de `01` en el sentido de que `--tenant-primary`/logo son los mismos mecanismos que `01` conecta — no hay trabajo nuevo de "conexión", solo de verificación.
- Esta tarea es, en la práctica, más un **checklist de verificación + documento de lo pendiente** que una tarea de código grande — la mayoría de lo que el diseño nuevo "necesitaría" configurable es backend que T20 explícitamente no toca (ver README).

## Resultado

**1. Verificación de `accentColor`/`logoUrl` en tiempo real** (`backend/t20-08-accent-propagation.mjs`, queda en el repo sin trackear, mismo criterio que los scripts anteriores): con un admin *staff* temporal en la org real, se leyó el `accentColor` real, se lo cambió por `PATCH /admin/catalog-config`, y se confirmó que `GET /public/eliathi-modas/config` refleja el valor nuevo **sin delay ni caché de por medio** — y que `logoUrl` no se pisa al tocar solo el color. Se revirtió al valor original al final. 8/8 checks en verde. El cableado CSS en sí (`--accent` inyectado en `StoreLayout.tsx` → `--tenant-primary: var(--accent, #F07058)` en `01`) ya se había verificado visualmente en el navegador en tareas anteriores (el bug de `02` donde `--accent` no se seteaba fue justamente encontrado y corregido en `03`; los botones/tabs coral de las capturas de `03` a `07` son ese mismo color real de la org, no un hardcode). `logoUrl` se usa de forma directa (`<img src={config.logoUrl}>`), no como variable CSS — coincide con el criterio de completado de esta tarea.

**2. Copy de ayuda en `MyStorePage.tsx`**: se agregó una línea debajo del campo "Color de acento" — *"El color de acento se usa en los botones de compra, links activos y detalles de toda la tienda — cambialo y vas a ver el resultado reflejado ahí mismo."* — antes el campo no tenía ninguna aclaración de su alcance real (que antes de T20 era mínimo, y ahora controla CTAs, tabs, links activos, badges y acentos en las 5 páginas rediseñadas). No se agregó ninguna sección ni campo nuevo — es solo texto.

**3. Backend pendiente — lista consolidada** (punto de partida de la fase siguiente, nada de esto se implementó en T20):

| Gap | De dónde sale | Qué requeriría | Estado en T20 |
|---|---|---|---|
| Foto de categoría/colección | `analisis.md` §6 | Campo `imageUrl` en `categories`/`collections` + endpoint de upload (mismo patrón que logo/banner) | Placeholder de color (`--tenant-primary` @ 20% sobre navy) en `04`/`05` |
| Menú del header ("featured") | `analisis.md` §6 | Campo/tabla nueva | **Resuelto sin backend** — reusa `home_sections` (`02`) |
| Texto del announcement bar | `analisis.md` §6 | Campo de texto libre en `catalog_configs` | **Resuelto sin backend** — autogenerado desde zonas de envío reales (`02`); el usuario pidió hacerlo configurable y decidió posponerlo |
| Banner promocional intermedio (texto propio) | `analisis.md` §6 | Campo de contenido promocional | Sorteado, no resuelto — el mid-banner de `03` muestra `bannerUrl` tal cual, sin campo de texto propio (se descartó agregarle texto inventado encima) |
| Reviews/calificación | `analisis.md` §6 | Sistema de reseñas completo | Omitido (`06`) |
| Wishlist | `analisis.md` §6 | Tabla + endpoint (o mínimo, persistencia local) | Omitido por completo, ni siquiera toggle visual sin persistencia (`03`) |
| Código de descuento / cupones | `analisis.md` §6 | Sistema de promociones | Omitido (`07`) |
| Fotos de Instagram / galería | `analisis.md` §6 | Integración externa o tabla de "galería" | Omitido (`03`) |
| Sort/filtros funcionales en categoría | `analisis.md` §6 | Parámetros de filtro/orden en `GET /categories/:categorySlug/products` | Sidebar omitida, sort visual-only deshabilitado (`05`) |
| Talles disponibles en la card de categoría | Encontrado en `05` | El endpoint de categoría traería variantes por producto | Omitido — mismo bloqueo que filtros |
| "Guía de talles" | `06` | Tabla de medidas real (genérica o por producto) | Omitida |
| Política de cambios/devoluciones | Encontrado en `06` | Campo de texto en `catalog_configs` (o reusar lo que exista) | El benefit "cambios gratis" del mockup se reemplazó por un link a WhatsApp — no se inventó una política |
| Dirección de envío granular (calle/CP/ciudad/provincia) | Encontrado en `07` | Split de `customers.address` en campos estructurados | Se mantuvo un solo campo de texto libre (dato real actual), el mockup pedía más campos de los que existen |
| Tracking de envío en tiempo real | `analisis.md` §6 | Integración con transportista | **Parcialmente soportado**: `orders.trackingNumber` ya existe y se muestra en "Mis pedidos" (carga manual, sin link de tracking en vivo) — la confirmación de `07` usa mensaje genérico en vez de asumir tracking en tiempo real |
| Listado completo de colecciones | Encontrado en `04` | Colecciones no tienen auto-creación de `home_section` como las categorías (`ensureCategoryHomeSection` solo corre para categorías) | El tab "Colecciones" de `04` solo muestra las curadas manualmente en el home; si no hay ninguna, estado vacío en vez de lista parcial |
| Página de detalle de colección | Encontrado en `04` | Página + ruta nueva (no es backend, pero no existe en ninguna tarea de T20) | Las cards de colección en `04` no son clickeables — no hay a dónde llevar |

`tsc --noEmit` y `vite build` limpios. Con esto, **T20 — Rediseño visual de la tienda pública queda completo** (tareas `01` a `08`, todas con Resultado documentado). Pendiente fuera de T20: la pasada manual del usuario completando un pago real de punta a punta en `07` (verificación de `external_reference` en el redirect de Mercado Pago), y la lista de backend consolidada arriba como punto de partida de una fase futura.
