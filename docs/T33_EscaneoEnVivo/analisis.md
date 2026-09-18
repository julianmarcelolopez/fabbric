# Análisis — Escaneo en vivo (sin "sacar foto")

Origen: conversación 2026-09-17, pregunta directa del usuario — ¿se puede
escanear apuntando la cámara, sin el paso manual de "Sacar foto del código
de barras" que tiene hoy `EscanearScreen.tsx`?

## 1. Estado actual (confirmado contra el código)

`pwa/src/screens/EscanearScreen.tsx` resuelve el escaneo así:

- `<input type="file" accept="image/*" capture="environment">` (línea 172-179)
  dispara la app de Cámara **nativa** del celular — no hay `<video>` embebido
  ni `getUserMedia` en el código actual.
- `zxing-wasm` (`readBarcodes`, línea 93-96) decodifica la foto resultante
  contra un set de formatos lineales (`EAN13`, `EAN8`, `UPCA`, `UPCE`,
  `Code128`, `Code39`, `Codabar`, `DataBar`) — deliberadamente sin `ITF`
  (comentario línea 84-92: un EAN-13 borroso se leyó una vez como ITF de 14
  dígitos con total confianza).
- Entrada manual como respaldo (línea 205-236).
- `html5-qrcode` y `@ericblade/quagga2` **no están en el código** —
  confirmado (`pwa/package.json` no las lista): se sacaron por completo, no
  quedaron mezcladas con el enfoque final.

## 2. Historia real de por qué se llegó a este enfoque (no es una elección
arbitraria)

Documentada en `docs/T23-App_ingreso_egreso_productos/tareas/03-escaneo-alta-ficha/02-escaneo/README.md`,
sección "Historia de esta tarea" — verificada en un iPhone 13 real, no en
simulador:

1. **`Html5Qrcode` (API de bajo nivel), cámara armada a mano** — la
   selección de cámara **nunca abrió la trasera**, pese a agotar todas las
   variantes de `facingMode`/`deviceId` que probaron.
2. **`Html5QrcodeScanner` (API de alto nivel de la misma librería)** — con
   esta sí abrió la trasera correctamente (dropdown propio, la elegía sola).
   Pero el decoder interno (`zxing-js`, motor JS puro) nunca leyó un código
   real, ni con foto nítida y bien enfocada — débil para EAN/UPC.
3. **Enfoque final**: la captura nativa (`<input capture>`) YA abría bien la
   trasera desde el principio → se descartó la cámara en vivo por completo y
   se reemplazó solo el decoder por `zxing-wasm` (motor ZXing en C++/WASM).

**Corrección a lo que se planteó en la conversación previa:** ahí se sugirió
"`getUserMedia` directo, sin pasar por `html5-qrcode`" como la forma más
simple de reabrir esto. Pero según el punto 1 de arriba, **eso ya se probó**
— es exactamente el enfoque 1 — y fue el que falló en abrir la cámara
trasera en el dispositivo real, no el 2. El dato de que el enfoque 2 (API de
alto nivel) sí abrió bien la cámara, mientras que armar `getUserMedia` a
mano no, es la pieza que faltaba y cambia el análisis.

## 3. Lo que sí es nuevo en esta conversación: el decoder no es el problema

Se confirmó (docs de `zxing-wasm`, ver más abajo) que `readBarcodes` acepta
`ImageData` como entrada, no solo `Blob`/`File`. La firma real es "an image
Blob, image File, ArrayBuffer, Uint8Array, o ImageData". Eso significa que
el motor fuerte que ya está validado en producción (el mismo que decodifica
las fotos hoy) puede alimentarse con frames de video en vivo
(`canvas.drawImage(video, ...)` → `getImageData()` → `readBarcodes()`), sin
reintroducir el decoder débil de `html5-qrcode`.

O sea: el problema de decodificación (motivo real del punto 2 de la
historia) está resuelto de por sí con lo que ya tienen. El problema
pendiente y **no resuelto** es específicamente el del punto 1: cómo abrir la
cámara trasera en vivo de forma confiable en iOS/Safari.

## 4. Opciones para la apertura de cámara (esto es lo que hay que decidir)

a) **Reintentar `getUserMedia` a mano, de nuevo.** El README dice que se
   "agotaron todas las variantes" en su momento, así que repetir sin una
   hipótesis nueva de qué cambiar probablemente reproduce el mismo fallo.
   No se recomienda sin antes acotar qué se va a probar distinto.

b) **Reusar el mecanismo de apertura de `Html5QrcodeScanner`** (el que sí
   funcionó) pero ignorando su decoder interno — interceptar el `<video>`
   que monta y correr un loop propio de captura + `zxing-wasm`. Riesgo
   doble: (1) te acoplás a internals no públicos de una librería (el
   `<video>` interno no es parte de su API documentada, puede cambiar entre
   versiones), y (2) reintroduce una librería que se sacó **por completo**
   del proyecto, incluyendo el bug ya documentado de que su contenedor no
   puede tener hijos de React (README punto 4 de bugs).

c) **`Html5Qrcode` en modo "solo cámara, sin decodificar"** — esta librería
   expone `start()` con un callback de frame que se podría usar solo para
   alimentar a `zxing-wasm`, descartando su propio resultado. Habría que
   confirmar si con la API de bajo nivel (que sí falló en el punto 1) el
   problema era el `facingMode` en sí, o algo específico de cómo pedían el
   stream — no quedó claro en el README cuál de las dos cosas exactamente
   causaba el fallo.

d) **Spike acotado antes de comprometerse a una arquitectura**: probar en el
   iPhone real de pruebas un `getUserMedia({ video: { facingMode: { exact:
   "environment" } } })` mínimo, sin selección manual de `deviceId` (que fue
   la parte más enredada del enfoque 1 según el README), y ver si abre la
   trasera. Barato de probar, y si funciona evita las opciones (b)/(c) por
   completo. Si vuelve a fallar, confirma que hay que ir por (b) o (c).

**Recomendación**: empezar por (d) — es la única opción que no compromete
arquitectura de antemano, y la historia sugiere que el problema real nunca
fue el decoder (ya resuelto) sino específicamente cómo se pedía el stream de
cámara.

## 5. Qué preservar sí o sí (ya validado, no tocar)

- El motor de decodificación (`zxing-wasm`) y el set de formatos configurado
  — incluye la exclusión deliberada de `ITF` (línea 84-92), fruto de un bug
  real en producción.
- La entrada manual como respaldo (línea 205-236) — se mantiene pase lo que
  pase con la cámara.
- La lógica de negocio en `handleCode` (línea 53-72) — modo venta/entrada,
  warning en 404 durante venta — no cambia, es independiente de cómo se
  obtiene el código.

## 6. Riesgos nuevos que no estaban cubiertos por decisiones previas

- **Batería/CPU**: un loop de decodificación en vivo corriendo WASM en cada
  frame es innecesario y calienta el teléfono — hay que throttlear (cada
  200-300ms, no cada frame) y cortar el stream (`track.stop()`) al salir de
  la pantalla o pasar a background.
- **Gesto del usuario**: iOS Safari exige un gesto explícito para arrancar
  cámara — no se puede autoarrancar al entrar a la pantalla.
- El viewfinder "CÁMARA LISTA" del mockup v5, que se dejó deliberadamente
  afuera por ser decorativo (comentario línea 32-38, T27 Fase 3: "esta app
  NO tiene eso... mostraría una funcionalidad que no existe"), pasaría a ser
  funcionalidad real si esto avanza — esa decisión de T27 quedaría obsoleta,
  no hay que tratarla como una restricción vigente.

## 7. Fuera de alcance de este análisis (a decidir después del spike)

- Si el botón "Sacar foto" se mantiene como respaldo alternativo al escaneo
  en vivo, o se reemplaza del todo.
- Diseño del viewfinder/UI si el spike de cámara funciona.

## Fuentes

- `pwa/src/screens/EscanearScreen.tsx` (código actual).
- `docs/T23-App_ingreso_egreso_productos/tareas/03-escaneo-alta-ficha/02-escaneo/README.md`
  (historia de los 3 enfoques, verificado en iPhone 13 real).
- `docs/T27_UX-PWA/` (decisión de no agregar viewfinder decorativo).
- Documentación de `zxing-wasm` (`readBarcodes` acepta `ImageData` además de
  `Blob`/`File`/`ArrayBuffer`/`Uint8Array`).
