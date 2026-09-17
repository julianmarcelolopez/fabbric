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
| 0 | Infra de prueba aislada (rama + instancia EasyPanel) | nada | ⬜ |
| 1 | Spike: ¿abre la cámara trasera? (go/no-go) | 0 | ⬜ |
| 2 | Loop de decodificación en vivo (solo si Fase 1 = go) | 1 | ⬜ |
| 3 | Decidir fallback de foto | 2 | ⬜ |
| 4 | Verificación final + merge a producción | 2, 3 | ⬜ |

## Desglose en tareas (Fases 0 y 1)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-instancia-easypanel-develop](tareas/01-instancia-easypanel-develop/01-instancia-easypanel-develop.md) — servicio nuevo en EasyPanel apuntando a `develop` | nada | ⬜ |
| 2 | [02-verificacion-instancia-prueba](tareas/02-verificacion-instancia-prueba/02-verificacion-instancia-prueba.md) — smoke test: la instancia nueva funciona igual que producción | 1 | ⬜ |
| 3 | [03-spike-camara-trasera](tareas/03-spike-camara-trasera/03-spike-camara-trasera.md) — implementar el spike de `getUserMedia` en `develop` | 2 | ⬜ |
| 4 | [04-verificacion-iphone](tareas/04-verificacion-iphone/04-verificacion-iphone.md) — probar en el iPhone real, decisión go/no-go | 3 | ⬜ |

Las Fases 2-4 del plan (loop de decodificación, fallback, merge final) se
desglosan en tareas más adelante, una vez que la Tarea 4 confirme el go.

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
- Subdominio propio para esta instancia de prueba (ej. `scan-test.aivance.cloud`
  o el que prefiera el usuario) — EasyPanel da HTTPS automático, lo que
  además resuelve gratis el requisito de contexto seguro para
  `getUserMedia` (no hace falta `cloudflared` como en T23).

**Criterio de aceptación**: la PWA de la rama nueva carga en
`https://<subdominio-de-prueba>` y funciona igual que producción (login,
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
acá): el usuario agrega la PWA de `scan-test.aivance.cloud` (o el
subdominio que se haya elegido) a la pantalla de inicio, como van a usarla
los vendedores en producción, y confirma si el video muestra la cámara
trasera.

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

## Fase 3 — Decidir fallback de foto

Pendiente de decidir según cómo salga la Fase 2 (no se prescribe acá, ver
`analisis.md` sección 7):
- Mantener "Sacar foto" como respaldo visible junto al escaneo en vivo, o
- Reemplazarlo del todo (el escaneo en vivo pasa a ser el único camino
  además de la entrada manual).

## Fase 4 — Verificación final + merge a producción

**Checklist**
- [ ] Escaneo en vivo verificado con un código de barras físico real en el
      iPhone de pruebas (no simulador), como PWA instalada.
- [ ] Entrada manual sigue funcionando sin cambios.
- [ ] Modo venta (404 → warning) y modo entrada (404 → Alta) sin cambios de
      comportamiento respecto a hoy.
- [ ] Stream de cámara se corta correctamente al salir de la pantalla
      (confirmar que no queda el indicador de cámara prendido).
- [ ] `npx tsc --noEmit` limpio en `pwa/`.
- [ ] Merge de la rama a `main`, deploy a la instancia real de producción.
- [ ] Decidir qué hacer con la instancia de prueba de EasyPanel (dar de baja
      o dejarla para el próximo experimento).
