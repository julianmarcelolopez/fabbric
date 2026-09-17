# Tarea 7 — Reactivar ITF/ITF14 en vivo, con confirmación de varias lecturas

**Estado:** 🟡 Código listo (working tree, `develop`), pendiente de que el usuario lo pruebe.

**Depende de:** Tarea 6 (loop de decodificación funcionando de punta a punta, confirmado en la sesión real).

## Origen

Probando la Tarea 6 con una etiqueta real de Zara (`0333242180304`), el
escaneo en vivo no la reconocía — a diferencia de todos los demás códigos
probados, que sí funcionaron. Investigado en la conversación: ese código
**no pasa el checksum de EAN-13** (se verificó el cálculo a mano), así que
no es una confusión de lectura — es genuinamente otro formato, casi seguro
`ITF`/`ITF14`, el mismo par de formatos que `EscanearScreen.tsx:39-49`
excluye deliberadamente desde T23 (caso real documentado ahí: ese mismo
número, "0333242180304", leído erróneamente como ITF de 14 dígitos en una
foto borrosa).

## Decisión (acordada con el usuario antes de tocar código)

No se toca el set de formatos de la **foto** (`BARCODE_FORMATS`,
`handlePhoto`) — una sola captura no tiene margen para confirmar una
lectura ambigua, así que ahí ITF sigue afuera, sin cambios.

El **escaneo en vivo sí reactiva ITF/ITF14**, pero con una traba nueva:
antes de aceptar un resultado de esos dos formatos, hay que verlo repetirse
**idéntico** durante ~2 segundos (8 lecturas seguidas al ritmo actual de
250ms) — el resto de los formatos se siguen aceptando al instante, sin este
freno. La idea: el bug original era que una lectura de un solo frame podía
"inventar" un ITF fantasma — exigir que la misma lectura se repita 8 veces
seguidas hace eso estadísticamente muy improbable, mientras que un ITF real
sí va a leer lo mismo una y otra vez.

## Alcance implementado

En `pwa/src/screens/EscanearScreen.tsx`:
- `ITF_FORMATS = ["ITF", "ITF14"]` y `LIVE_BARCODE_FORMATS = [...BARCODE_FORMATS, ...ITF_FORMATS]`
  — el loop en vivo (`decodeFrame`) usa `LIVE_BARCODE_FORMATS`; `handlePhoto`
  sigue usando `BARCODE_FORMATS` sin cambios.
- `ITF_CONFIRM_MS = 2000` / `ITF_CONFIRM_READS = Math.ceil(2000 / DECODE_INTERVAL_MS)`
  (8 lecturas al intervalo actual).
- `itfPendingRef` — cuenta lecturas idénticas consecutivas. Un frame sin
  resultado (`results.length === 0`) **no** resetea la cuenta (una mano
  temblando un instante no rompe la racha); solo una lectura **distinta**
  la resetea. Se limpia también al prender la cámara de nuevo (sesión
  nueva, sin arrastrar estado de una vez anterior).
- Formatos que no son ITF/ITF14 siguen aceptándose en la primera lectura,
  sin ningún cambio de comportamiento ni de velocidad.
- `npx tsc --noEmit` y `npx vite build --mode production` limpios dentro
  del contenedor Docker.

## Cómo probar

- En la PC o el iPhone: apuntar al código de Zara del ejemplo (o cualquier
  otro código ITF real) y confirmar que tarda ~2 segundos en reconocerlo
  (no es instantáneo, a propósito) pero termina navegando a Ficha/Alta
  igual que cualquier otro código.
- Confirmar que los códigos EAN13/Code128/etc. de siempre siguen siendo
  instantáneos — no se les agregó ningún retraso.
- Si el usuario decide que el resultado no convence (falsos positivos, tarda
  demasiado, etc.), la decisión fue explícita: "lo probamos y cualquier
  cosa volvemos atrás" — revertir es tan simple como sacar `ITF_FORMATS` de
  `LIVE_BARCODE_FORMATS` y borrar la lógica de `itfPendingRef`.

## Dependencias

- **La bloquean:** Tarea 6.
- **Bloquea:** nada formalmente — es una mejora puntual encontrada durante
  la verificación, no una fase planeada desde el inicio.
