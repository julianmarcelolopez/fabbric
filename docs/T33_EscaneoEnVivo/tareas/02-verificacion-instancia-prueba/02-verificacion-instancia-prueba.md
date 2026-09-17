# Tarea 2 — Smoke test: la instancia nueva funciona igual que producción

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T33/Fase 0)

Confirmar que la infra de prueba está bien armada **antes** de tocar código
nuevo de cámara — si el flujo actual (login, Escanear con "Sacar foto") no
funciona en la instancia de prueba, cualquier resultado del spike de la
Tarea 3 sería sospechoso (¿falló la cámara, o falló el deploy?).

## Alcance

- Abrir `https://<subdominio-de-prueba>` desde el iPhone real (no hace
  falta agregarla a pantalla de inicio todavía, eso es la Tarea 4) y
  confirmar:
  - Login funciona (misma cuenta que producción, mismo backend).
  - Pantalla Escanear carga sin errores de consola.
  - El flujo actual de foto (`capture="environment"` + `zxing-wasm`) decodifica
    un código de barras real igual que en producción.
  - Modo venta/entrada y navegación a Ficha/Alta funcionan sin diferencias.

## Criterio de aceptación

Ningún comportamiento distinto entre la instancia de prueba y
`fabbric.aivance.cloud` para lo que ya existe hoy — la única diferencia
entre ambas debe ser el código nuevo que se agregue en la Tarea 3 en
adelante.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3.
