# Tarea 5 — Reemplazar el spike por el loop real de decodificación

**Estado:** ✅ Hecha (2026-09-18) — verificada directo en el iPhone real (ver Tarea 6), no hizo falta la vuelta intermedia por webcam de PC.

**Depende de:** Tarea 4 (GO confirmado).

## Objetivo (según `plan.md`, T33/Fase 2)

Convertir el spike de la Tarea 3 (que solo mostraba el video) en el
escaneo en vivo real: alimentar `zxing-wasm` con los frames del video,
detectar el código automáticamente y seguir el mismo camino que ya usa el
flujo de foto (`handleCode`) — sin tocar la lógica de negocio existente
(modo venta/entrada, warning en 404, navegación a Ficha/Alta).

## Alcance

- En `pwa/src/screens/EscanearScreen.tsx`:
  - Loop con `setInterval` (~200-300ms — **no cada frame**, para no saturar
    CPU/batería con llamadas a WASM innecesarias) mientras `cameraOn`:
    `canvas.drawImage(videoRef.current, 0, 0, w, h)` → `ctx.getImageData(...)`
    → `readBarcodes(imageData, { formats: [...], tryHarder: true })` — el
    canvas puede ser oculto (`display:none` o fuera de pantalla), no hace
    falta mostrarlo.
  - **Mismo array de formatos que ya usa el flujo de foto** (línea ~94:
    `EAN13, EAN8, UPCA, UPCE, Code128, Code39, Codabar, DataBar`, sin
    `ITF`) — no reinventar la config, reusarla tal cual (capturarla en una
    constante compartida si conviene, para que un cambio futuro de formatos
    no tenga que hacerse en dos lugares).
  - Al primer resultado: **cortar el `setInterval`** (evitar seguir
    decodificando mientras se procesa un match), cortar el stream
    (`track.stop()`) y llamar a `handleCode(result.text)` — el mismo
    camino que ya usa `handlePhoto`.
  - Sacar la caja punteada "T33 — spike" de la Tarea 3 — el botón "Probar
    cámara en vivo" pasa a ser la UI real (renombrar a algo como "Escanear
    con la cámara", a definir el texto exacto al implementar).
  - Viewfinder simple: alguna indicación visual de que está buscando un
    código (el mockup v5 tenía una caja navy con scanline — no hace falta
    calcarlo exacto, pero si conviene reusar ese lenguaje visual ya
    pensado, ver `docs/T27_UX-PWA/mockups/mockups_v5.html:70-78`).

## Cómo verificar (antes de gastar una vuelta en el iPhone)

Esta parte **sí se puede iterar en la PC** (ver nota en `plan.md`, Fase 2):
`docker compose up -d pwa` y probar con la webcam de la PC apuntando a un
código de barras impreso o a la pantalla de otro celular con un código
mostrado. Confirmar que decodifica, que el throttle no traba la UI, y que
al encontrar un match corta el loop y navega a Ficha/Alta como corresponde.

## Resultado real

Implementado en `pwa/src/screens/EscanearScreen.tsx`:
- `BARCODE_FORMATS` extraído como constante compartida a nivel de módulo —
  usada tal cual por `handlePhoto` (foto) y `decodeFrame` (loop en vivo), un
  solo lugar para cambiar formatos en el futuro.
- `decodeFrame()`: `canvas.drawImage(video,...)` → `getImageData()` →
  `readBarcodes(imageData, {...})`, con un guard `decodeBusyRef` para no
  solapar decodificaciones si una llamada a WASM tarda más que el intervalo
  (`DECODE_INTERVAL_MS = 250`). Al primer match: corta el stream y llama a
  `handleCode` — mismo camino que la foto.
- Reemplazada la caja "spike" de la Tarea 3 por la UI real: botón
  "Escanear con la cámara" / "Apagar cámara", video con un viewfinder simple
  (marco naranja + texto "Apuntá al código de barras") y un `<canvas>`
  oculto donde se dibuja cada frame.
- **Bug de closure corregido de paso**: `handleCode` usaba `modo` por
  closure — como el loop en vivo arranca un `setInterval` una sola vez (al
  prender la cámara) y no se reinicia con cada render, si el vendedor
  cambiaba Vender/Recibir mercadería mientras la cámara seguía prendida,
  `handleCode` iba a seguir usando el modo viejo. Se agregó `modoRef`
  (actualizado en un `useEffect([modo])`) y `handleCode` ahora lee
  `modoRef.current` — corrige el problema para los tres caminos (foto,
  manual, en vivo), no solo el nuevo.
- **Fallback agregado para poder probar en la PC**: `facingMode: { exact:
  "environment" }` casi seguro falla con `OverconstrainedError` en una
  notebook sin cámara trasera declarada — se agregó un catch específico que
  reintenta con `{ video: true }` (cualquier cámara disponible) **solo**
  cuando el error es `OverconstrainedError`. En el iPhone real esto no
  debería activarse nunca (`exact` ya resolvió limpio en T33/04) — es
  puramente para habilitar el desarrollo local, no cambia el comportamiento
  ya verificado.
- `npx tsc --noEmit` limpio dentro del contenedor Docker de `pwa`.

**Pendiente**: el usuario prueba en `http://localhost:5174` (dev server ya
corriendo vía `docker compose`, puerto mapeado) con la webcam de la PC —
apuntar a un código de barras real (impreso, o mostrado en la pantalla de
otro celular) y confirmar que decodifica solo. Recién después de esa
confirmación (y de eventuales ajustes) se commitea/pushea para la Tarea 6.

## Criterio de aceptación

En la PC (webcam), apuntar a un código de barras real lo decodifica solo,
sin tocar "Sacar foto", y dispara `handleCode` una sola vez (no un loop
infinito de requests al backend). `npx tsc --noEmit` limpio.

## Dependencias

- **La bloquean:** Tarea 4.
- **Bloquea:** Tarea 6.
