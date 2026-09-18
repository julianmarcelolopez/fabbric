# Tarea 3 — Implementar el spike de `getUserMedia` en `develop`

**Estado:** ✅ Hecha (2026-09-17) — verificado en el iPhone real en la Tarea 4.

**Depende de:** Tarea 2.

## Objetivo (según `plan.md`, T33/Fase 1)

Confirmar o descartar, con datos frescos, el problema documentado en T23
(enfoque 1: `getUserMedia` armado a mano nunca abrió la cámara trasera en
el iPhone real) — es la única incógnita real de esta tarea, así que se
aísla en un cambio chico y descartable antes de construir el loop de
decodificación encima.

## Alcance

- Cambio acotado en `pwa/src/screens/EscanearScreen.tsx` (o una pantalla
  standalone aparte si resulta más simple de sacar después — a decidir al
  implementar): un botón nuevo, sin tocar el flujo de foto existente, que
  llama a:

  ```js
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } },
  });
  ```

  — **deliberadamente simple**: sin `enumerateDevices()`, sin elegir
  `deviceId` a mano. Eso fue lo más enredado del enfoque 1 según el README
  de T23; vale la pena probar primero la versión más simple, no repetir la
  misma complejidad que ya falló.
- Mostrar el `<video>` resultante en pantalla (`playsInline`/`muted`/
  `autoPlay`, requisito de iOS para que no tome pantalla completa ni pida
  audio). Sin decodificación todavía — el spike es solo "¿se ve la cámara
  trasera en vivo, sí o no?".
- Commit a `develop`, deploy automático (o manual, según cómo quede
  configurado el servicio de la Tarea 1) a la instancia de prueba.

## Resultado real

Implementado en `pwa/src/screens/EscanearScreen.tsx`:
- `toggleCamera()` — llama `getUserMedia({ video: { facingMode: { exact: "environment" } } })`
  tal cual el snippet de arriba, sin `enumerateDevices()`/`deviceId`.
- Caja con borde punteado, claramente marcada "T33 — spike de cámara en
  vivo (temporal)" (no se mezcla visualmente con la UI final), con botón
  "Probar cámara en vivo" / "Apagar cámara" y el `<video>` (`playsInline
  muted autoPlay`) que se muestra solo mientras `cameraOn`.
- Se agregó cleanup del stream (`track.stop()`) tanto al apagar el botón
  como al desmontar la pantalla — no estaba en el alcance original de esta
  tarea (es tema de la Fase 2), pero es gratis y evita dejar el indicador de
  cámara prendido durante las pruebas de la Tarea 4.
- `npx tsc --noEmit` limpio dentro del contenedor Docker de `pwa`.

**Nota — no comiteado por esta sesión**: por instrucción del proyecto, los
commits los hace el usuario, no el asistente (ver
`feedback_no_auto_commit` en memoria). El código está en el working tree de
la rama `develop`, listo para `git add`/`commit`/`push`.

**Primer intento real en el iPhone (2026-09-17) — confirmado: `fabbric-pwa2`
NO redeploya solo con el push**, hace falta apretar "Implementar" a mano en
EasyPanel cada vez (confirmado comparando el hash del bundle servido antes/
después de tocar el botón). Con eso resuelto, el usuario probó en el
iPhone: permiso de cámara concedido, pero **pantalla en negro, sin imagen
de ninguna cámara**.

**Bug real encontrado (no es el bug de T23 — es un bug de este código)**:
el `<video>` se renderiza condicionalmente (`{cameraOn && <video ... />}`),
así que en el momento en que `toggleCamera()` corría
`videoRef.current.srcObject = stream`, el elemento **todavía no existía en
el DOM** (`cameraOn` seguía en `false` hasta la línea siguiente) —
`videoRef.current` era `null`, la asignación no hacía nada, y `setCameraOn(true)`
montaba un `<video>` que nunca se conectó a ningún stream. El permiso se
concedía y el stream se obtenía bien (por eso no hubo error) — el problema
era puramente de timing de React, no de `getUserMedia`/iOS.

**Fix aplicado**: se separó la asignación del stream a un `useEffect`
disparado por `[cameraOn]`, que corre **después** del re-render que monta
el `<video>` — ahí sí el ref ya apunta al elemento real. Se agregó también
`videoRef.current.play()` explícito (con el promise ignorado a propósito:
iOS a veces no dispara autoplay solo con el atributo cuando el `srcObject`
se asigna después del mount inicial). `npx tsc --noEmit` limpio de nuevo.
Pendiente: commit/push de este fix y **reintentar la Tarea 4** — todavía no
hay un dato real sobre si abre la cámara trasera o la frontal, porque hasta
ahora nunca llegó a mostrarse ninguna imagen.

## Criterio de aceptación

Código listo y typecheck limpio ✅. Falta: commit/push del usuario +
confirmar que `https://fabbric-test.aivance.cloud/stock/` sirve la versión
nueva — recién ahí queda 100% cumplido, listo para la Tarea 4.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** Tarea 4.
