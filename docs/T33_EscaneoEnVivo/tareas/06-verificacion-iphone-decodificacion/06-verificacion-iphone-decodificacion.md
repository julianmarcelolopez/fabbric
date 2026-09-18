# Tarea 6 — Verificar el loop completo en el iPhone real

**Estado:** ✅ Hecha (2026-09-18) — confirmada de punta a punta después del fix de CORS (ver abajo): decodifica, busca contra el backend y navega correctamente; apagado de cámara confirmado explícitamente ("el apagado de la camara funciona bien").

**Depende de:** Tarea 5.

## Objetivo (según `plan.md`, T33/Fase 2)

Confirmar que lo que funcionó en la PC con webcam (Tarea 5) funciona igual
en el dispositivo real — el motor de decodificación es el mismo en
cualquier navegador, pero vale la pena confirmar con un código de barras
físico real, cámara real, condiciones de luz reales.

## Cómo probar

- Commit/push del código de la Tarea 5 a `develop`, "Implementar" manual en
  EasyPanel (recordar: no redeploya solo, confirmado en la Tarea 3).
- En el iPhone, como PWA instalada: apuntar la cámara a un código de barras
  físico real y confirmar que decodifica solo, sin tocar "Sacar foto".
- Confirmar que el stream de cámara se corta al encontrar un match (no
  sigue la cámara prendida después de navegar a Ficha/Alta).
- Confirmar que el stream también se corta si se sale de la pantalla Escanear
  sin encontrar nada (navegando a Carrito, por ejemplo) — no debe quedar el
  indicador de cámara prendido en segundo plano.

## Primer intento (2026-09-17): "Load failed", en PC y en iPhone por igual

El usuario probó tanto en la webcam de la PC (siguiendo la nota de la Tarea
5) como en el iPhone: ningún código se detectaba, con el mismo error
("Load failed") en los dos dispositivos. Dos códigos con imagen pixelada
que no dieron resultado eran esperables (foco/luz), pero el error
consistente en ambos dispositivos no lo era.

**Causa real encontrada — no es un bug de la cámara ni del loop de la
Tarea 5**: `zxing-wasm` 3.1.3, por default, no trae su `.wasm` empaquetado
localmente — lo pide a un CDN externo
(`https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm`,
confirmado leyendo `share.js` de la librería instalada). Esa request fallaba
en la red del usuario (PC e iPhone, aparentemente en la misma red — el CDN
en sí respondía bien probado desde otra red/ubicación, así que es un
bloqueo/inalcanzabilidad puntual de esa red hacia ese dominio, no una caída
general del CDN). Esto afecta por igual a **la foto** (`handlePhoto`) y al
**escaneo en vivo** (Tarea 5) — los dos llaman al mismo `readBarcodes`
compartido, así que es probable que el botón "Sacar foto" tampoco hubiera
funcionado ahí, con el mismo error — no es algo nuevo de esta tarea, ya
existía antes de T33 (nadie lo había notado porque nunca falló en esa
combinación de red + intento de escaneo real hasta ahora).

**Fix aplicado** en `pwa/src/screens/EscanearScreen.tsx`: se saca la
dependencia del CDN por completo. `import zxingWasmUrl from
"zxing-wasm/reader/zxing_reader.wasm?url"` (Vite empaqueta el binario real
como asset propio, con hash) + `prepareZXingModule({ overrides: {
locateFile: ... } })` a nivel de módulo, apuntando al asset propio en vez
del CDN. Verificado con un build de producción real dentro del contenedor
(`npx vite build`): `dist/assets/zxing_reader-BxB2YfIY.wasm` — 1093.29 KB,
exactamente el mismo tamaño que el binario real bajado del CDN, confirma
que es el archivo correcto, no un placeholder. `npx tsc --noEmit` limpio.

Como beneficio colateral (no era el objetivo de esta tarea, pero corrige el
mismo problema): esto también arregla el flujo de foto existente, que tenía
la misma dependencia silenciosa del CDN — en cualquier ambiente, no solo el
de prueba.

## Segundo intento: "Load failed" persistía, incluso en Safari (no era el `.wasm`)

Con el fix de arriba deployado (confirmado por curl: el `.wasm` propio se
servía bien, 200, `Content-Type: application/wasm`), el error seguía
apareciendo — igual en Chrome incógnito y en Safari. Se descartó caché de
service worker (incógnito ya lo hacía irrelevante) y se descartó que fuera
el archivo `.wasm` en sí (el usuario lo pudo descargar directo desde el
navegador del iPhone, 1.1 MB, sin problema).

**Causa real**: CORS en el **backend**, no la descarga del `.wasm`.
`backend/src/index.ts:100` solo permite orígenes `[FRONTEND_URL, PWA_URL,
*.trycloudflare.com]` — `fabbric-test.aivance.cloud` no estaba en esa
lista, así que el navegador bloqueaba la respuesta de
`/admin/variants/by-barcode/:code` (la búsqueda del código ya decodificado
contra el backend), y eso es lo que se veía como "Load failed" — nada que
ver con la cámara ni con el `.wasm`, que ya andaban bien.

**Fix**: sin tocar código — `PWA_URL` ya existe en el schema de env del
backend (`backend/src/config/env.ts:21`, pensada justo para "un segundo
cliente autenticado, mismo backend, otro origen") pero no estaba seteada
(default `http://localhost:5174`). Se agregó
`PWA_URL=https://fabbric-test.aivance.cloud` en las variables de entorno de
EasyPanel (servicio `fabbric-backend`) + restart (no rebuild — variable de
runtime). Verificado con un preflight OPTIONS real: `Access-Control-Allow-Origin:
https://fabbric-test.aivance.cloud` en la respuesta, y confirmado que
`fabbric.aivance.cloud` (producción) seguía funcionando igual después del
restart.

**Con los dos fixes (wasm propio + CORS), el escaneo en vivo funcionó de
punta a punta en el iPhone real** — decodificó una serie de códigos reales,
buscó contra el backend y navegó bien. Un caso puntual (`0333242180304`,
etiqueta de Zara) no se reconoció — investigado y resuelto por separado en
la Tarea 7 (es un formato ITF real, no un bug).

## Criterio de aceptación

✅ Cumplido. Apuntar la cámara a un código de barras físico real en el
iPhone lo decodifica en menos de ~1-2 segundos, navega correctamente a
Ficha (código existente) o Alta (código nuevo, modo Recibir mercadería), y
no deja el indicador de cámara prendido en ningún caso (confirmado
explícitamente por el usuario).

## Dependencias

- **La bloquean:** Tarea 5.
- **Bloquea:** el desglose de la Fase 3 (decidir fallback de foto).
