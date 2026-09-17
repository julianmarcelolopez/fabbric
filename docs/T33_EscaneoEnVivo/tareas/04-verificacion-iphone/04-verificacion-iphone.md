# Tarea 4 — Probar en el iPhone real: decisión go/no-go

**Estado:** ✅ Hecha (2026-09-17) — **resultado: GO.**

**Depende de:** Tarea 3.

## Objetivo (según `plan.md`, T33/Fase 1)

Esta es la verificación que ninguna herramienta automática ni la PC pueden
reemplazar (ver `plan.md`, nota sobre por qué el bug de T23 es específico
de WebKit + iOS) — hay que confirmarla a mano, en el dispositivo real.

## Cómo probar

- Agregar la PWA de la instancia de prueba (`https://fabbric-test.aivance.cloud/stock/`)
  a la pantalla de inicio del iPhone — el mismo contexto en el que la van a
  usar los vendedores en producción (PWA instalada, no una pestaña suelta
  de Safari/Chrome).
- Entrar a Escanear, tocar el botón nuevo del spike (Tarea 3), aceptar el
  permiso de cámara si lo pide.
- Confirmar qué cámara abre: ¿la trasera (la que apunta "para afuera", la
  que sirve para escanear un código de barras) o la frontal?

## Resultado real

Probado en el iPhone real, PWA instalada en pantalla de inicio: permiso de
cámara concedido, video mostró la **cámara trasera** — el usuario vio el
código de barras real en la pantalla, no su propia cara.

Antes de llegar a este resultado hubo dos vueltas: (1) EasyPanel no
redeploya solo con el push a `develop`, hace falta apretar "Implementar" a
mano cada vez (confirmado comparando el hash del bundle antes/después); (2)
un primer intento dio pantalla en negro — no era el bug de T23, era un bug
de timing de React en este código (`videoRef.current` era `null` en el
momento de `toggleCamera()` porque el `<video>` recién se monta cuando
`cameraOn` pasa a `true` — el fix movió la asignación del stream a un
`useEffect([cameraOn])`, ver Tarea 3). Con eso corregido, el resultado real
del spike es limpio: **la cámara trasera abre bien**.

## Decisión go/no-go: **GO**

El problema de T23 (enfoque 1: `getUserMedia` armado a mano nunca abría la
trasera) **no se repite** con esta versión simplificada del pedido de
cámara (sin `enumerateDevices()`/`deviceId` a mano). Se desglosa la Fase 2
del plan (loop de decodificación con `zxing-wasm`) en tareas nuevas — ver
`plan.md`.

## Dependencias

- **La bloquean:** Tarea 3.
- **Bloquea:** el desglose de la Fase 2 (si el resultado es "go") — nada si
  el resultado es "no-go", ahí termina T33.
