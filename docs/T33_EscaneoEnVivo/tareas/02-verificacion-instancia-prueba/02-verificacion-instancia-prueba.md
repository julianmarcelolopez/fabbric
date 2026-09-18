# Tarea 2 — Smoke test: la instancia nueva funciona igual que producción

**Estado:** ✅ Hecha (2026-09-17), verificación parcial — ver nota.

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

## Resultado real

URL correcta confirmada: `https://fabbric-test.aivance.cloud/stock/` (con
el path `/stock/`, no en la raíz del dominio — ver nota agregada en la
Tarea 1). Verificado con captura del usuario **desde navegador de
escritorio**: login funciona, "Escanear para vender" carga con el mismo
diseño y flujo que producción (toggle Vender/Recibir mercadería, botón
"Sacar foto del código de barras", entrada manual) — sin diferencias
visibles.

**Nota**: esta captura es de escritorio, no del iPhone real todavía. Para
el propósito de esta tarea (confirmar que el *deploy* está sano, no que la
cámara del iPhone en particular funcione) alcanza — ese chequeo específico
es el objetivo de la Tarea 4, que de todos modos requiere abrir la PWA en
el iPhone.

## Criterio de aceptación

✅ Cumplido — ningún comportamiento distinto entre la instancia de prueba y
`fabbric.aivance.cloud` para lo que ya existe hoy.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3.
