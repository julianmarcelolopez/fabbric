# Plan — Escaneo en vivo (sin "sacar foto")

Basado en `analisis.md`. A diferencia de otros planes de este repo, acá el
resultado de la Fase 1 es **incierto** (depende de si `getUserMedia` abre la
cámara trasera en el iPhone real — ya falló una vez en T23) — por eso el plan
no asume que todas las fases se hacen, tiene un punto explícito de
"go/no-go" y arranca aislado de producción, tal como decidió el usuario:
rama aparte + una instancia de EasyPanel de prueba separada, en vez de tocar
`fabbric.aivance.cloud` mientras se experimenta.

**Confirmado por el usuario**: `pwa/` ya está desplegada en EasyPanel (no
había evidencia de esto en `docs/` ni en la memoria del proyecto — solo
`frontend/`/`backend/` estaban documentadas como "DEPLOYED" en T16 — pero es
un hecho de infraestructura, no algo que se pueda confirmar leyendo el
repo). La Fase 0 crea una instancia **adicional**, no la primera.

**El iPhone real solo hace falta en dos momentos puntuales** (Fase 1 y Fase
4), no en cada iteración de desarrollo del medio — ver nota en la Fase 2.
El bug de T23 es específico de WebKit + iOS (cómo ese motor abre
`facingMode: "environment"` en ese hardware); no hay forma de reproducirlo
ni descartarlo probando en la PC — un navegador de escritorio usa otro
motor (Blink/V8) y típicamente ni tiene una cámara trasera que elegir, así
que un resultado ahí no predice nada sobre el iPhone. La alternativa de no
usar el propio teléfono sería un servicio de dispositivos reales en la nube
(BrowserStack/LambdaTest, un iPhone físico remoto accesible desde la PC) —
descartado por ahora: ya tienen su propio iPhone y ya lo usaron para esto
mismo en T23, agregar un servicio pago no suma nada.

## Desglose en fases

| # | Fase | Depende de | Estado |
|---|---|---|---|
| 0 | Infra de prueba aislada (rama + instancia EasyPanel) | nada | ✅ |
| 1 | Spike: ¿abre la cámara trasera? (go/no-go) | 0 | ✅ GO |
| 2 | Loop de decodificación en vivo (solo si Fase 1 = go) | 1 | ✅ |
| 3 | Decidir fallback de foto + pulido de diseño | 2 | ✅ |
| 4 | Verificación final + merge a producción | 2, 3 | ⬜ |

## Desglose en tareas (Fases 0 y 1)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-instancia-easypanel-develop](tareas/01-instancia-easypanel-develop/01-instancia-easypanel-develop.md) — servicio nuevo en EasyPanel apuntando a `develop` | nada | ✅ |
| 2 | [02-verificacion-instancia-prueba](tareas/02-verificacion-instancia-prueba/02-verificacion-instancia-prueba.md) — smoke test: la instancia nueva funciona igual que producción | 1 | ✅ |
| 3 | [03-spike-camara-trasera](tareas/03-spike-camara-trasera/03-spike-camara-trasera.md) — implementar el spike de `getUserMedia` en `develop` | 2 | ✅ |
| 4 | [04-verificacion-iphone](tareas/04-verificacion-iphone/04-verificacion-iphone.md) — probar en el iPhone real, decisión go/no-go | 3 | ✅ GO |

**Resultado de la Fase 1: GO** — la cámara trasera abre bien en el iPhone
real (PWA instalada). El problema de T23 no se repitió con el pedido de
cámara simplificado. Detalle de las dos vueltas que hizo falta dar
(EasyPanel no redeploya solo con el push; un bug de timing de React en el
`<video>`) en las Tareas 3 y 4.

**Gotcha nuevo, no documentado antes en la memoria del proyecto**: a
diferencia de lo que se podía asumir por cómo está armado `frontend`/
`backend` en EasyPanel, el servicio `fabbric-pwa2` **no redeploya solo al
pushear** a `develop` — hace falta apretar "Implementar" a mano en el panel
cada vez. Confirmado comparando el hash del bundle servido antes/después de
tocar el botón, dos veces en esta sesión.

## Desglose en tareas (Fase 2)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 5 | [05-loop-decodificacion](tareas/05-loop-decodificacion/05-loop-decodificacion.md) — reemplazar el spike por el loop real (`zxing-wasm` + `ImageData`) | 4 | ✅ |
| 6 | [06-verificacion-iphone-decodificacion](tareas/06-verificacion-iphone-decodificacion/06-verificacion-iphone-decodificacion.md) — verificar el loop completo en el iPhone real | 5 | ✅ |
| 7 | [07-confirmacion-itf](tareas/07-confirmacion-itf/07-confirmacion-itf.md) — reactivar ITF/ITF14 en vivo con confirmación de varias lecturas | 6 | ✅ |

**Dos bugs reales encontrados en la Tarea 6, ninguno de la cámara/loop en
sí**: (1) `zxing-wasm` pedía su `.wasm` a un CDN externo por default,
bloqueado en la red del usuario — se pasó a self-host vía Vite; (2) CORS
del backend no tenía `fabbric-test.aivance.cloud` en la lista de orígenes
permitidos (`PWA_URL` no estaba seteada) — se agregó esa variable de
entorno en EasyPanel, sin tocar código. Detalle completo en la Tarea 6.

## Desglose en tareas (Fase 3 — fallback de foto + pulido de diseño)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 8 | [08-diseno-escanear](tareas/08-diseno-escanear/08-diseno-escanear.md) — orden (vivo/foto/manual), colores, tamaño de cámara | 7 | ✅ |
| 9 | [09-header-footer-globales](tareas/09-header-footer-globales/09-header-footer-globales.md) — header/footer globales, fijos, fix de scroll | 8 | ✅ |
| 10 | [10-medio-pago-tab](tareas/10-medio-pago-tab/10-medio-pago-tab.md) — "Medio de pago" como pestaña segmentada | 9 | ✅ |
| 11 | [11-carrito-tabs](tareas/11-carrito-tabs/11-carrito-tabs.md) — Carrito: tabs "Productos" / "Forma de pago" | 10 | ✅ |

**Decisión de la Fase 3**: no se saca "Sacar foto" — se mantiene como
respaldo, pasa a ser la opción secundaria (Tarea 8). Las Tareas 9-11 son
pulido de diseño que surgió en el camino (no estaban en el plan original),
abarcando toda la PWA, no solo Escanear.

Falta desglosar la Fase 4 (verificación final + merge a `main`) — pendiente
de que el usuario confirme que está conforme con el diseño actual.

## Fase 0 — Infra de prueba aislada

**Objetivo**: poder probar en el iPhone real sin arriesgar
`fabbric.aivance.cloud` ni depender de un túnel `cloudflared` que se cae
entre sesiones (como en T23).

- Rama `develop` (ya creada por el usuario) — primera rama distinta de
  `main` en este repo (hasta ahora todo el trabajo fue directo sobre
  `main`, ver memoria del proyecto); los commits de esta tarea van ahí, sin
  impactar producción hasta el merge de la Fase 4.
- Servicio nuevo en EasyPanel para `pwa/`, apuntando a `develop` — mismo
  patrón ya documentado y verificado para `frontend`/`backend` (T16
  "DEPLOYED"): "Ruta de compilación" → `/` (raíz del repo, no `/pwa` — el
  build necesita `packages/shared`), "Archivo" → `pwa/Dockerfile` (toma
  `prod` sola, es el último stage). Variables de build (`ARG`, se hornean en
  el bundle): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
  — este último apunta al **backend que ya está en producción**
  (`https://frontend-fabbric-backend.ka3c6z.easypanel.host`), no se crea un
  backend nuevo, porque esta tarea no toca lógica de backend en absoluto.
- Subdominio propio para esta instancia de prueba — EasyPanel da HTTPS
  automático, lo que además resuelve gratis el requisito de contexto
  seguro para `getUserMedia` (no hace falta `cloudflared` como en T23).
  **Resultado real (Tarea 1)**: `https://fabbric-test.aivance.cloud/stock/`
  — mismo patrón de path `/stock/` que producción, no un subdominio "limpio"
  sin path.

**Criterio de aceptación**: la PWA de la rama nueva carga y funciona igual
que producción (login,
Escanear con el flujo de foto actual) — confirma que la infra de prueba
está bien armada antes de tocar código nuevo.

## Fase 1 — Spike: ¿abre la cámara trasera? (go/no-go)

**Objetivo**: confirmar o descartar, con datos frescos, el problema
documentado en T23 (enfoque 1: `getUserMedia` armado a mano nunca abrió la
trasera) — es la única incógnita real de esta tarea, así que se aísla antes
de construir nada más encima.

**Alcance**
- Cambio chico y descartable en `EscanearScreen.tsx` (o una pantalla
  standalone aparte, lo que sea más simple de sacar después): un botón que
  llama a `getUserMedia({ video: { facingMode: { exact: "environment" } } })`
  — **simple, sin enumerar dispositivos ni elegir `deviceId` a mano** (eso
  fue lo más enredado del enfoque 1 según el README de T23; vale la pena
  probar la versión más simple primero) — y muestra el `<video>` resultante
  en pantalla.
- Sin decodificación todavía — el spike es solo "¿se ve la cámara trasera en
  vivo, sí o no?".

**Verificación** (manual, en el iPhone real — no lo puedo probar yo desde
acá): el usuario agrega la PWA de `https://fabbric-test.aivance.cloud/stock/`
a la pantalla de inicio, como van a usarla los vendedores en producción, y
confirma si el video muestra la cámara trasera.

**Decisión go/no-go**
- **Abre bien** → Fase 2.
- **Falla** (igual que en T23) → se cierra la tarea acá. El flujo de foto en
  producción queda intacto, sin ningún cambio — no hay nada que revertir
  porque nada de esto tocó `main`. La rama/instancia de prueba se puede
  borrar o dejar como evidencia documentada, a criterio del usuario.

## Fase 2 — Loop de decodificación en vivo (solo si Fase 1 = go)

**Objetivo**: alimentar `zxing-wasm` (el mismo motor que ya decodifica las
fotos, sin cambios de formatos/config) con frames del video en vivo en vez
de una foto capturada a mano.

**A diferencia de la Fase 1, esta sí se puede desarrollar e iterar en la
PC**: `canvas.drawImage` + `getImageData` + `readBarcodes` no depende de
iOS/WebKit — es la misma lógica de JS/WASM en cualquier navegador. Se puede
correr `pwa` local (`docker compose up -d pwa`, como siempre) y probar con
la webcam de la PC apuntando a un código de barras impreso o en la pantalla
del celular, afinando throttle/viewfinder/manejo de resultado sin gastar
ciclos de prueba en el iPhone real — ese queda reservado para la
verificación final (Fase 4).

**Alcance**
- Loop con `setInterval` (~200-300ms, no cada frame — evitar saturar CPU/
  batería con llamadas a WASM innecesarias): `canvas.drawImage(video, ...)`
  → `getImageData()` → `readBarcodes(imageData, { formats: [...], tryHarder: true })`
  (mismo array de formatos que hoy, línea 94 de `EscanearScreen.tsx` —
  incluida la exclusión deliberada de `ITF`).
- Al primer match: cortar el stream (`track.stop()`) y seguir el mismo
  camino que hoy (`handleCode`) — sin tocar la lógica de negocio existente.
- Gesto de usuario explícito para arrancar la cámara (requisito de iOS
  Safari/WebKit, aplica igual a la PWA instalada).
- Cortar el stream al salir de la pantalla o pasar a background (evitar que
  quede el indicador de cámara prendido y gastando batería).
- Viewfinder simple (recién ahora es funcionalidad real, no decorativa —
  ver `analisis.md` sección 6 sobre por qué T27 lo había descartado).

**Criterio de aceptación**: apuntar la cámara a un código de barras físico
real lo decodifica sin tocar "sacar foto", en menos de ~1-2 segundos, en el
iPhone real (no solo en desktop).

**Resultado real**: cumplido, después de los dos bugs de infraestructura
descritos arriba (CDN del `.wasm` y CORS) — ninguno de los dos era del
loop de decodificación en sí. De paso se encontró y resolvió un caso real
de formato ITF no soportado (Tarea 7).

## Fase 3 — Decidir fallback de foto

Pendiente de decidir según cómo salga la Fase 2 (no se prescribe acá, ver
`analisis.md` sección 7):
- Mantener "Sacar foto" como respaldo visible junto al escaneo en vivo, o
- Reemplazarlo del todo (el escaneo en vivo pasa a ser el único camino
  además de la entrada manual).

**Resultado real**: se mantiene "Sacar foto", como opción secundaria
(Tarea 8). Esta fase terminó abarcando mucho más que la decisión original
— pulido de diseño de toda la PWA (header/footer globales y fijos, fix de
scroll, rediseño de `CarritoScreen` en tabs) — ver Tareas 8-11.

## Fase 4 — Verificación final + merge a producción

**Checklist**
- [x] Escaneo en vivo verificado con un código de barras físico real en el
      iPhone de pruebas (no simulador), como PWA instalada.
- [x] Entrada manual sigue funcionando sin cambios (confirmado por el
      usuario: "esta todo bien confirmo").
- [x] Modo venta (404 → warning) y modo entrada (404 → Alta) sin cambios de
      comportamiento respecto a hoy (mismo caso — confirmado).
- [x] Stream de cámara se corta correctamente al salir de la pantalla
      (confirmado explícitamente por el usuario: "el apagado de la camara
      funciona bien").
- [x] `npx tsc --noEmit` limpio en `pwa/` (verificado después de cada
      tarea de esta sesión).
- [x] Verificación visual final de las Tareas 8-11 (diseño) por el usuario
      — confirmado ("esta todo bien confirmo").
- [ ] Merge de la rama a `main`, deploy a la instancia real de producción.
- [ ] Decidir qué hacer con la instancia de prueba de EasyPanel (dar de baja
      o dejarla para el próximo experimento).
