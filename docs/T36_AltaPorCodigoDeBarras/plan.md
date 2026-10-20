# Plan — Sugerencias de alta por código de barras (T36)

Basado en `analisis.md` (diagnóstico, regla real del código confirmada con
tres ejemplos del usuario, y el diseño de backend/frontend ya resuelto ahí).
Este plan solo ordena el trabajo en dos fases por dependencia; no repite el
análisis.

| # | Fase | Depende de |
|---|---|---|
| 1 | Backend: `parseBarcode` + `GET /admin/products/suggest-by-barcode/:barcode` | nada |
| 2 | Frontend: precarga de sugerencias en `AltaScreen.tsx` | 1 |

## Desglose en tareas

Mismo formato que `docs/T35_FinanzasVistaDiaria/tareas/` (Objetivo/Alcance/Criterio de aceptación/Dependencias).

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-parseo-sugerencias](tareas/01-backend-parseo-sugerencias/01-backend-parseo-sugerencias.md) | nada | ✅ |
| 2 | [02-frontend-sugerencias-alta](tareas/02-frontend-sugerencias-alta/02-frontend-sugerencias-alta.md) | 1 | ✅ |

T36 queda cerrado (ambas tareas hechas y verificadas en producción con un
cliente real). Las correcciones y mejoras encontradas en la misma sesión de
prueba en vivo, pero fuera del objetivo puntual de T36, están en
`docs/T37_FixesSesionDemoEnVivo/`.

**Corrección importante post-cierre (T37 ítem 12):** T36, tal como quedó
descrito arriba, solo precargaba el formulario — pero `handleSubmit` en
`AltaScreen.tsx` seguía llamando siempre a `alta-rapida`, que crea un
producto nuevo sin importar la sugerencia. Esto significaba que T36 **no
cumplía su objetivo real** (evitar productos duplicados del mismo modelo),
solo evitaba el typo al tipear. Encontrado en vivo (dos "1800" separados en
la tienda) y arreglado en `docs/T37_FixesSesionDemoEnVivo/README.md#12` —
ahora si hay un modelo sugerido y no se editó, se agrega la variante al
producto existente en vez de crear uno nuevo.

## Fase 1 — Backend: `parseBarcode` + endpoint

- `backend/src/lib/barcode.ts`: función pura `parseBarcode`, tal cual el
  bloque de `analisis.md`.
- `backend/src/modules/products/routes.ts`: nuevo `GET
  /admin/products/suggest-by-barcode/:barcode` — trae las variantes con
  barcode de la org, parsea cada una, busca la coincidencia más reciente por
  `modeloCode`/`colorCode`/`talleCode` y devuelve producto + nombres
  sugeridos.

**Verificación**: `tsc --noEmit` limpio en `backend/`; `curl` contra el
backend en Docker con un barcode cuyo `modeloCode` ya tenga una variante
cargada, y confirmar que devuelve el producto correcto; con un barcode que
no matchea el formato, confirmar `{ parsed: null, product: null, ... }`.

## Fase 2 — Frontend: precarga en `AltaScreen.tsx`

- Nuevo `useEffect([barcode])` que llama a `suggest-by-barcode` al montar la
  pantalla y precarga `categoryId`/`modelo`/`brandSelectValue`/`marca` (si
  hay producto) y `color`/`talle` (si hay sugerencia), todo editable.
- Falta (no incluido en la Tarea 1 de backend, pendiente de esta fase):
  mostrar en el JSX un aviso corto cuando `modeloExistente` es `true` (ej.
  "Modelo ya cargado — se completó automáticamente"), y verificar en el
  navegador (Docker) con los tres ejemplos reales de barcode.

**Verificación**: en Docker local (`docker compose up -d backend frontend`
— la PWA corre junto al resto, ver `docker-compose.yml`), escanear/simular
los tres barcodes de ejemplo y confirmar que el formulario se precarga como
corresponde; probar también un barcode sin coincidencias (formulario vacío,
sin errores); `tsc --noEmit` limpio en `pwa/`.

## Criterios de aceptación y fuera de alcance

Ver `analisis.md` — no se repiten acá, no hay adiciones nuevas encontradas
durante este plan.
