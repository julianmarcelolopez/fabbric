# Tarea 2 — Pantalla Escanear (cámara + lectura de código de barras)

**Estado:** ✅ Hecha (2026-08-17) — escaneo real funcionando de punta a punta, verificado en un iPhone 13 real y en desktop
**Depende de:** Fase 02 (scaffold + login) y Tarea 2 de la Fase 01 (`GET /admin/variants/by-barcode/:code`)

## Objetivo

Que la PWA lea un código de barras y decida, con una sola búsqueda, si deriva a Alta (código nuevo) o a Ficha (código existente).

## Solución final (tras probar 3 enfoques distintos)

**Captura de foto nativa + decodificación con el motor real de ZXing en WebAssembly:**

- `<input type="file" accept="image/*" capture="environment">` para la foto — dispara la app de Cámara nativa del celular (no un video embebido en la web), evita por completo los bugs de selección de cámara que tiene la API web (`getUserMedia`) en iOS/WebKit.
- `zxing-wasm` (`readBarcodes()`, formato `"AllLinear"`) para decodificar la foto — es el motor de ZXing en C++ real, compilado a WebAssembly, muy superior en precisión a la versión JS que traen otras librerías de escaneo web.
- Entrada manual del código como respaldo adicional (queda igual, ya no es la única vía real).

Verificado con un código de barras físico real, tanto desde un iPhone 13 (vía túnel `cloudflared`) como desde desktop: decodifica el código, lo busca contra el backend, y navega correctamente a Ficha o Alta según corresponda.

## Historia de esta tarea (por qué se probaron 3 enfoques)

1. **`Html5Qrcode` (API de bajo nivel, `html5-qrcode`)**, armando la UI y la selección de cámara a mano. Encontró y corrigió 4 bugs reales (ver abajo), pero la selección de cámara nunca abrió la trasera en el iPhone 13 de prueba pese a agotar todas las variantes de `facingMode`/`deviceId`.
2. **`Html5QrcodeScanner` (API de alto nivel de la misma librería)**, portado de un proyecto anterior real del usuario (`ventas-pwa`) que sí abría la trasera con este enfoque — y efectivamente la selección de cámara empezó a funcionar (dropdown propio, "Cámara trasera" elegida sola). Pero el **decoder** (el motor `zxing-js` que usa esta librería por dentro, el mismo en los dos enfoques) nunca logró leer un código de barras real, ni con una foto nítida y bien enfocada — `zxing-js` es sabidamente débil para códigos lineales (EAN/UPC), a diferencia de QR.
3. **Enfoque final** (arriba): en vez de seguir peleando con la cámara en vivo, se aprovechó que la captura de foto nativa (`<input capture>`) YA abría bien la trasera desde el principio, y se reemplazó únicamente el decoder por `zxing-wasm` (el motor C++ real). Con eso, decodificó el mismo código de barras que había fallado con los dos enfoques anteriores.

Los enfoques 1 y 2 (y las librerías `html5-qrcode`, `@ericblade/quagga2` que se probaron/descartaron en el camino) ya no están en el código — se sacaron por completo al adoptar el enfoque final, no quedaron mezclados.

## Bugs reales encontrados y corregidos en el camino

1. **`stop()` de `html5-qrcode` puede tirar una excepción síncrona que `.catch()` no atrapa.** React StrictMode (dev) monta/desmonta cada efecto dos veces; si el cleanup corre antes de que `start()` termine, `scanner.stop()` tira `"Cannot stop, scanner is not running or paused"` de forma síncrona.
2. **Agregar una dependencia nueva a `pwa/package.json` no alcanza con `--renew-anon-volumes`** — hace falta reconstruir la imagen también: `docker compose up -d --build --renew-anon-volumes pwa`. (Y para que la PWA relea variables de entorno nuevas del `.env.local`, ni siquiera alcanza con `--build`: hace falta `docker compose up -d --force-recreate`, un simple `restart` no vuelve a leer el archivo.)
3. **Video duplicado/estirado en un celular real** (dos cámaras corriendo en paralelo) — condición de carrera de StrictMode: si el `stop()` del cleanup corre mientras `start()` sigue en curso, esa instancia vieja terminaba de arrancar en segundo plano igual, insertando su propio `<video>` junto al de la instancia nueva.
4. **`NotFoundError: The object can not be found here`** — crash de React al poner un botón como hijo de React *adentro* del mismo contenedor que una librería externa maneja directamente por fuera de React (`html5-qrcode` en su momento). Lección general, vale para cualquier librería que tome un `<div>` por su cuenta: ese contenedor nunca debe tener hijos de React.
5. **CORS bloqueaba las pruebas por túnel.** Al probar desde el celular vía `cloudflared`, el backend solo permitía como origen `FRONTEND_URL`/`PWA_URL` (URLs fijas) — la URL del túnel (`https://algo.trycloudflare.com`) cambia cada vez que se reinicia. Se agregó un regex `/\.trycloudflare\.com$/` a los orígenes permitidos en `backend/src/index.ts` — solo importa en dev (en producción el dominio real ya cubre todo, nada pasa por `trycloudflare.com`).
6. **Para probar desde el celular de punta a punta (no solo la UI) hace falta tunelear también el backend**, no solo la PWA — `VITE_API_URL` apunta a `http://localhost:4000` por default, que desde el celular no significa nada (es el propio loopback del teléfono, no la PC del desarrollador). Para una sesión de prueba real desde el celular, se tuneló también el puerto 4000 y se apuntó `VITE_API_URL` a esa URL temporalmente (revertir a `http://localhost:4000` al terminar de probar — recordar que esta variable la comparte también `frontend/`).

## Cómo se verificó

- **Playwright con cámara falsa de Chromium**: confirmó la mecánica de permisos/montaje en los dos enfoques con cámara en vivo (antes de descartarlos).
- **Celular real (iPhone 13)**, vía túnel `cloudflared` (PWA + backend tuneleados), sesión de debugging extensa: confirmó los bugs #1 a #5, y finalmente el escaneo real funcionando — foto → código decodificado (`03332421803043`) → búsqueda contra el backend real → navegación correcta a Alta (código no existía todavía).
- **Desktop**, misma URL de túnel: mismo resultado, confirmando que no depende de un dispositivo en particular.
- **Entrada manual, de punta a punta, con datos reales** (Playwright + producto de prueba en org temporal): código existente → Ficha con datos correctos; código inexistente → Alta con código precargado. 6/6 PASS.

## Definition of Done

- [x] La pantalla Escanear carga sin errores de consola.
- [x] Un código detectado (por foto o a mano) dispara la búsqueda una sola vez.
- [x] 200 → navega a Ficha; 404 → navega a Alta con el código precargado.
- [x] Navegación Escanear ↔ Carrito funciona en ambos sentidos.
- [x] `tsc --noEmit` limpio dentro del contenedor Docker.
- [x] **Escaneo real por cámara verificado de punta a punta en un iPhone 13 real y en desktop** — código de barras físico, foto nativa, decodificado con `zxing-wasm`, encontrado/no encontrado correctamente contra el backend.
- [x] Entrada manual del código verificada de punta a punta con datos reales (6/6 PASS).

## Dependencias

- **La bloquean**: Fase 02 (scaffold + login) y la Tarea 2 de la Fase 01 (`by-barcode`).
- **Bloquea**: Tarea 3 (`03-alta-producto`) y Tarea 4 (`04-ficha-producto`) de esta fase — ambas parten de acá.
