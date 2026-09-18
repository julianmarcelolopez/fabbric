# Tarea 10 — "Medio de pago" como pestaña segmentada

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 9.

## Origen

El usuario, viendo `CarritoScreen` en vivo, preguntó si "Medio de pago"
podía tener una estética de pestaña, en vez de los botones sueltos con
borde individual que tenía hasta ahora.

## Decisión

Reusar tal cual el patrón de pestaña segmentada que ya existe en la app
(el toggle "Vender / Recibir mercadería" de `EscanearScreen`) — contenedor
gris redondeado con padding chico, opción activa recortada en blanco con
texto navy, resto transparente/muted. Mismo lenguaje visual en toda la
PWA, en vez de un tercer estilo de selector.

## Alcance implementado

`pwa/src/screens/CarritoScreen.tsx` — el grupo de botones de `MEDIOS`
(Efectivo/Transferencia/Tarjeta/Mercado Pago) pasa del estilo anterior
(`border: 1px solid colors.gray`, activo = `background: colors.navy`
sólido) al mismo patrón exacto del toggle de Escanear (`background:
colors.gray` en el contenedor + `padding: 3` + activo = `background:
colors.white, color: colors.navy`).

## Nota

Esta tarea quedó superada en parte por la Tarea 11 (Productos/Forma de
pago como tabs) — el usuario aclaró después que en realidad pedía algo más
grande (dos secciones separadas, no solo el estilo de "Medio de pago"),
pero el cambio de esta tarea se mantuvo igual dentro de la tab "Forma de
pago" de la Tarea 11, no se revirtió.

## Cómo se verificó

`npx tsc --noEmit` limpio dentro del contenedor Docker.

## Dependencias

- **La bloquean:** Tarea 9.
- **Bloquea:** nada — quedó anidada dentro de la Tarea 11.
