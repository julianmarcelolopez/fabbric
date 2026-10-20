# Tarea 2 — Frontend: precarga de sugerencias en `AltaScreen.tsx`

**Estado:** 🔶 En progreso — fetch y precarga de estado ya hechos, falta el
aviso visual en el JSX y la verificación en navegador.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T36/Fase 2)

Que al escanear un código nuevo, si su `modeloCode`/`colorCode`/`talleCode`
ya se usaron antes, el formulario de alta aparezca precargado en vez de en
blanco — sin bloquear ningún campo, todo sigue editable.

## Alcance

- `pwa/src/screens/AltaScreen.tsx`:
  - Tipo local `SuggestByBarcodeResult` (líneas 15-29) — mismo patrón que ya
    usa el archivo para `Category`/`Brand`/`AltaRapidaResult` (tipos ad-hoc,
    no se agregan a `@fabbric/shared` porque este archivo nunca reusó
    schemas compartidos para sus tipos locales).
  - Nuevo estado `modeloExistente` (línea 57) para poder avisarle al usuario
    que el modelo ya existía.
  - Nuevo `useEffect([barcode])` (líneas 89-103 aprox.) que llama a
    `GET /admin/products/suggest-by-barcode/:barcode` al montar la pantalla
    y precarga `categoryId`, `modelo`, `brandSelectValue`/`marca` (si hay
    producto) y `color`/`talle` (si hay sugerencia). Sin `catch` propio más
    allá de tragarse el error — igual criterio que ya usa el fetch de
    `brands` (línea 82): si falla, el formulario sigue en blanco, no bloquea
    el alta.

- **Pendiente en esta tarea:**
  - Agregar en el JSX del paso 1 (formulario) un texto corto visible cuando
    `modeloExistente` es `true`, cerca del input de "Modelo" (línea ~294 en
    el JSX original) — ej. "Modelo ya cargado, se completó
    automáticamente" — para que el usuario entienda por qué el campo ya
    tiene texto.
  - Verificación manual en Docker (`docker compose up -d backend frontend`)
    con los tres barcodes reales de `analisis.md`
    (`01800640.034`, `018005053.034`, `00476535.034`): cargar primero una
    variante con uno de esos códigos, después simular el escaneo de otro
    barcode que comparta `modeloCode`/`colorCode`/`talleCode` con el
    primero y confirmar la precarga en pantalla.
  - Confirmar que un barcode sin ninguna coincidencia dim deja el
    formulario vacío, sin errores ni pantallas rotas.

## Criterio de aceptación

- Al abrir `AltaScreen` con un barcode cuyo modelo ya existe, el formulario
  aparece con marca/modelo/categoría precargados y editables.
- Al abrir con un barcode cuyo color o talle ya se usaron antes (de
  cualquier modelo), esos campos aparecen precargados y editables.
- Hay un indicio visible en pantalla cuando el modelo se precargó (no solo
  en el estado interno).
- `tsc --noEmit` limpio en `pwa/`.
- Verificado a ojo en el navegador (Docker), no solo por tipos — criterio
  constante del proyecto, ver `feedback_fabbric_confirm_before_coding`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** ninguna.
