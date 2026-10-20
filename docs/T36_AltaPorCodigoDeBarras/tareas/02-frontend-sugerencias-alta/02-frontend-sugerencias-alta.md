# Tarea 2 — Frontend: precarga de sugerencias en `AltaScreen.tsx`

**Estado:** ✅ Hecha y verificada en vivo (2026-10-20) — deployada a
producción (`fabbric.aivance.cloud/stock`) y probada por el usuario en una
demo real con un cliente, no solo en Docker local.

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

- **Completado luego de este borrador:**
  - Aviso visual: texto "Modelo ya cargado — se completó automáticamente"
    debajo del input de "Modelo", visible solo si `modeloExistente` es
    `true` — se oculta de nuevo si el usuario edita el campo a mano
    (`onChange` del input de modelo hace `setModeloExistente(false)`, para
    no dejar un aviso mintiendo si el usuario lo corrigió).
  - Verificación: no se hizo en Docker local sino directamente en
    producción, en vivo con un cliente real de Eliathi Modas escaneando
    prendas reales — ver `docs/T37_FixesSesionDemoEnVivo/README.md` para el
    resto de lo encontrado/arreglado en esa misma sesión (bug de
    `QtyStepper`, popup de confirmación, etc., todos en el mismo archivo).
  - Mientras se probaba esta pantalla en vivo aparecieron 2 bugs no
    relacionados con las sugerencias en sí (ver T37): el stepper de
    cantidad enviaba el formulario antes de tiempo, y no había ninguna
    confirmación visual al terminar el alta. Ambos arreglados en la misma
    sesión, documentados aparte porque no son parte del objetivo de T36.

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
