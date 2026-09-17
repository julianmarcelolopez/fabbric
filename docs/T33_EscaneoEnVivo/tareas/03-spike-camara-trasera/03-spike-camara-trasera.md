# Tarea 3 — Implementar el spike de `getUserMedia` en `develop`

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

El código está en `develop` y desplegado en la instancia de prueba, listo
para que la Tarea 4 lo pruebe en el iPhone real. No es criterio de esta
tarea que la cámara abra bien — eso se confirma recién en la Tarea 4.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** Tarea 4.
