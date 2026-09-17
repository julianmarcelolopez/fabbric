# Tarea 4 — Probar en el iPhone real: decisión go/no-go

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 3.

## Objetivo (según `plan.md`, T33/Fase 1)

Esta es la verificación que ninguna herramienta automática ni la PC pueden
reemplazar (ver `plan.md`, nota sobre por qué el bug de T23 es específico
de WebKit + iOS) — hay que confirmarla a mano, en el dispositivo real.

## Cómo probar

- Agregar la PWA de la instancia de prueba (`https://<subdominio-de-prueba>`)
  a la pantalla de inicio del iPhone — el mismo contexto en el que la van a
  usar los vendedores en producción (PWA instalada, no una pestaña suelta
  de Safari/Chrome).
- Entrar a Escanear, tocar el botón nuevo del spike (Tarea 3), aceptar el
  permiso de cámara si lo pide.
- Confirmar qué cámara abre: ¿la trasera (la que apunta "para afuera", la
  que sirve para escanear un código de barras) o la frontal?

## Decisión go/no-go

- **Abre la trasera** → se confirma que el problema de T23 (enfoque 1) no
  se repite con esta versión simplificada del pedido de cámara. Se pasa a
  desglosar la Fase 2 del plan (loop de decodificación con `zxing-wasm`) en
  tareas nuevas.
- **Abre la frontal, o falla directamente** → mismo resultado que T23. Se
  cierra T33 acá:
  - Documentar el resultado en esta tarea (qué exactamente pasó — error en
    consola, cámara equivocada, permiso denegado, etc., por si en el futuro
    aparece una pista nueva para reintentar).
  - El flujo de foto en producción queda intacto, sin ningún cambio — nada
    de esto tocó `main`.
  - A criterio del usuario: borrar la rama `develop` y la instancia de
    EasyPanel de prueba, o dejarlas para el próximo experimento (`develop`
    no tiene por qué ser exclusiva de esta tarea).

## Dependencias

- **La bloquean:** Tarea 3.
- **Bloquea:** el desglose de la Fase 2 (si el resultado es "go") — nada si
  el resultado es "no-go", ahí termina T33.
