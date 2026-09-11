# Tarea 3 — Escanear, Ficha y Alta

**Estado:** ✅ Hecha — verificada con Playwright (14/14 PASS, `pwa/t27-03-03-escanear-ficha-alta.mjs`).

**Depende de:** Tarea 1 (tokens y fuentes) de esta misma fase. Conviene hacerse después de la Fase 2 del plan general (toggle de modo), para no aplicar tokens sobre una versión de estas pantallas que todavía va a cambiar de estructura.

## Objetivo

Migrar las tres pantallas centrales del flujo de escaneo a los tokens de color/tipografía, sin cambiar el layout ni la lógica ya resuelta en las Fases 1 y 2 del plan general.

## Pasos

### EscanearScreen

- [x] Reemplazados todos los hex sueltos por los tokens equivalentes (`accent`, `muted`, `gray`, `danger`, `navy`, `white`).
- [x] **Decisión de alcance (caja de cámara navy):** el mockup dibuja una caja navy con "CÁMARA LISTA" y scanline animado, simulando una cámara en vivo — esta app real **no tiene eso** (no hay viewfinder; se toma una foto y se decodifica aparte, ver el comentario histórico de `EscanearScreen.tsx` sobre por qué se abandonó el enfoque de cámara en vivo). Agregar esa caja hubiese mostrado una funcionalidad inexistente. En su lugar, el tratamiento navy se aplicó donde sí hay un paralelo funcional real: el botón "Buscar" del código manual.
- [x] Encabezado de Escanear muestra el logotipo en `Alex Brush` chico, mismo tratamiento que el login a menor escala.
- [x] Extra no listado originalmente: el título dinámico ("Escanear para vender" / "...recibir mercadería") también pasó a `Cormorant Garamond` — el mockup lo trata como título (`e-display`) igual que "Producto nuevo", así que se aplicó el mismo criterio por consistencia.

### FichaScreen

- [x] Reemplazados `#eeece6`, `#888780`, `#5f5e5a`, `#eaf3de`/`#3b6d11` por los tokens (`gray`, `muted`, `greenBg`/`green`).
- [x] Nombre de producto pasa a `Cormorant Garamond`.
- [x] **Ajuste de layout menor (no solo color):** el precio vivía embebido en la misma línea que "Talle · Color" (`Talle M · Blanco · $100,00`), sin un nodo propio — no se podía aplicar Cormorant Garamond + accent solo al precio sin separarlo. Se extrajo a su propia línea junto al badge de stock, calcado de la agrupación real del mockup (nombre → talle/color → precio+stock en una fila). No cambia ningún dato mostrado, solo cómo se agrupa el texto.
- [x] Los botones de acción mantienen navy/coral de la Fase 1 del plan general — solo se migró el hex al token, sin cambiar el color en sí.

### AltaScreen

- [x] Reemplazados `#FF6B4A`, `#cac7ba`, `#888780`, `#5f5e5a`, `#a32d2d` por los tokens equivalentes.
- [x] Título "Producto nuevo" pasa a `Cormorant Garamond`. Extra no listado originalmente: "Foto del producto" (paso 2 del alta) recibió el mismo tratamiento, por consistencia entre los dos pasos del mismo flujo.
- [x] **No** se agregó el campo "Cantidad recibida" del mockup — sigue fuera de alcance (ver Hallazgo 2.3 de `analisis.md`, requiere que el backend deje de fijar `stockLocal: 1`).

## Definition of Done

- [x] Las tres pantallas no tienen ningún hex hardcodeado fuera de `pwa/src/lib/theme.ts` — confirmado por `grep -E "#[0-9a-fA-F]{3,6}"` sobre los tres archivos (0 resultados).
- [x] Nombre de producto, precio y títulos usan `Cormorant Garamond`; el resto del texto usa `DM Sans` (heredado del `body` desde la Tarea 1).
- [x] Probado el circuito completo (código nuevo → Alta, código existente → Ficha) en ambos modos, con Playwright.
- [x] Botones de acción de las tres pantallas miden ≥44px de alto — confirmado por `boundingBox()`.

## Cómo se verificó

**Playwright** (`pwa/t27-03-03-escanear-ficha-alta.mjs`, viewport 390×844, org/usuario descartables): login → confirma logotipo Alex Brush y título Cormorant Garamond en Escanear, y que "Buscar" es navy → busca un código existente en modo Vender → confirma en la Ficha que el nombre y el precio usan Cormorant Garamond, que el precio es coral, y que "Agregar a la venta" sigue coral y mide ≥44px → cambia a modo Recibir mercadería, re-busca el mismo código → confirma que "Registrar entrada" sigue navy y mide ≥44px → busca un código nuevo en ese modo → confirma que llega a Alta con el título en Cormorant Garamond y que "Guardar producto" es coral y mide ≥44px. **14/14 PASS.** Complementado con capturas de las tres pantallas para chequeo visual (no versionadas) — coherentes con la identidad real de la tienda.

## Dependencias

- **La bloquean:** Tarea 1 de esta fase; conviene además tener resuelta la Fase 2 del plan general (toggle de modo) antes de esta tarea.
- **Bloquea:** nada de la Tarea 4 (son independientes).
