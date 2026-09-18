# Tarea 11 — Carrito: "Productos" y "Forma de pago" como tabs separados

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 10.

## Origen

El usuario aclaró que la Tarea 10 no capturaba lo que pedía: no era el
estilo visual de "Medio de pago" en sí, sino que `CarritoScreen` entero
—lista de productos + medio de pago + facturación + total— estaba apilado
en una sola pantalla que scrolleaba de una sección a la siguiente. Quería
dos tabs: "Productos" arriba y "Forma de pago" aparte, para no tener que
scrollear de una sección a la otra.

## Alcance implementado

`pwa/src/screens/CarritoScreen.tsx`:
- Estado local `tab: "productos" | "pago"` (default `"productos"`).
- Switcher de tabs (mismo patrón segmentado de siempre) debajo de "Venta en
  curso": **"Productos (N)"** (con la cantidad de ítems si hay alguno) y
  **"Forma de pago"**.
- Tab **Productos**: la lista de ítems del carrito (sin cambios de lógica,
  solo envuelta en `{tab === "productos" && (...)}`), con `flex: 1,
  overflow: "auto"` — scrollea sola si hay muchos ítems, sin empujar nada
  más.
- Tab **Forma de pago**: el selector de medio de pago (Tarea 10),
  "Facturar esta venta" y su formulario — envuelto igual, mismo
  `flex: 1, overflow: "auto"`.
- **Total y "Confirmar venta" quedan afuera de las tabs**, siempre
  visibles abajo, sin importar cuál esté activa — decisión deliberada: la
  mayoría de las ventas usan los valores por default (efectivo, sin
  facturar) y no necesitan entrar nunca a la tab "Forma de pago" para
  confirmar.
- Se sacó el `useEffect` que hacía `window.scrollTo` para destapar
  "Confirmar venta" cuando se abría el formulario de facturación — quedó
  obsoleto con este layout (el formulario ya no puede empujar el botón
  fuera de vista, vive contenido dentro del `overflow:auto` de su propia
  tab).

## Cómo se verificó

`npx tsc --noEmit` y `npx vite build --mode production` limpios dentro del
contenedor Docker. Verificación visual pendiente de confirmación explícita
del usuario.

## Dependencias

- **La bloquean:** Tarea 10.
- **Bloquea:** nada formalmente — cierra el pulido de diseño de esta
  sesión; queda pendiente la Fase 4 original del plan (verificación final
  + merge a producción).
