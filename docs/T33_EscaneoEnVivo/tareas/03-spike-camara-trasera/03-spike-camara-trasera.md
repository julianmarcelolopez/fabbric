# Tarea 3 — Implementar el spike de `getUserMedia` en `develop`

**Estado:** 🟡 Código listo en `develop` (working tree), pendiente de commit/push del usuario — ver nota.

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
la rama `develop`, listo para `git add`/`commit`/`push` — una vez pusheado,
confirmar si el servicio `fabbric-pwa2` de EasyPanel redeploya solo o hace
falta un "Implementar" manual (según cómo haya quedado configurado en la
Tarea 1).

## Criterio de aceptación

Código listo y typecheck limpio ✅. Falta: commit/push del usuario +
confirmar que `https://fabbric-test.aivance.cloud/stock/` sirve la versión
nueva — recién ahí queda 100% cumplido, listo para la Tarea 4.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** Tarea 4.
