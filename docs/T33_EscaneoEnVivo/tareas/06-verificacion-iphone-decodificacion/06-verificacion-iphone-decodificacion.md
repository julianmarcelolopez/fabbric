# Tarea 6 — Verificar el loop completo en el iPhone real

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

Apuntar la cámara a un código de barras físico real en el iPhone lo
decodifica en menos de ~1-2 segundos, navega correctamente a Ficha (código
existente) o Alta (código nuevo, modo Recibir mercadería), y no deja el
indicador de cámara prendido en ningún caso.

## Dependencias

- **La bloquean:** Tarea 5.
- **Bloquea:** el desglose de la Fase 3 (decidir fallback de foto).
