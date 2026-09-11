# Fase 3 — Identidad visual real (navy + coral + Cormorant Garamond + DM Sans + Alex Brush)

**Estado:** ✅ Hecha — las 4 tareas completas y verificadas con Playwright.

## Objetivo (según `plan.md`, Fase C)

Resolver el Hallazgo 3 de `analisis.md`: reemplazar la paleta y tipografía ad-hoc de `pwa/` (8 grises sueltos sin relación, tipografía sin fijar en 6 de 7 pantallas) por la identidad **real** que ya usa la tienda online (`frontend/src/features/catalog/catalog.css`), calcada en `docs/T27_UX-PWA/mockups/mockups_v5.html`: navy `#1E2A4A` + coral `#FF6B4A`, `Cormorant Garamond` para títulos/nombres/montos, `DM Sans` para texto, `Alex Brush` para el logotipo "Eliathi".

## Por qué está subdividida

Es la fase de mayor superficie — toca las 7 pantallas de la app. Se separa en un primer paso mecánico y de bajo riesgo (tokens + fuentes, sin tocar ninguna pantalla todavía) y tres tandas de migración pantalla por pantalla, en el mismo orden de menor a mayor superficie que ya proponía `plan.md`, para poder revisar en el navegador entre tanda y tanda en vez de cambiar las 7 pantallas de una sola vez.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-tokens-y-fuentes](01-tokens-y-fuentes/01-tokens-y-fuentes.md) — archivo de tokens + carga de Google Fonts | Fases 1 y 2 completas (evita reabrir archivos que esas fases ya tocaron) | ✅ Hecha |
| 2 | [02-login-y-bottomnav](02-login-y-bottomnav/02-login-y-bottomnav.md) — rediseño del login (hero navy) y la barra inferior | 1 | ✅ Hecha |
| 3 | [03-escanear-ficha-alta](03-escanear-ficha-alta/03-escanear-ficha-alta.md) — las tres pantallas de estado del flujo de escaneo | 1 | ✅ Hecha |
| 4 | [04-carrito-y-confirmaciones](04-carrito-y-confirmaciones/04-carrito-y-confirmaciones.md) — carrito, confirmar venta y las confirmaciones de la Fase 1 | 1, 3 (usa las pantallas de confirmación creadas en la Fase 1 de este plan) | ✅ Hecha |

## Criterios de aceptación de la fase completa

- [x] Existe un único archivo de tokens de color/tipografía/radios (`pwa/src/lib/theme.ts`), y ninguna pantalla de `pwa/` tiene un hex de color hardcodeado fuera de ese archivo — confirmado con un `grep` final sobre todo `pwa/src/`, incluido `App.tsx` (encontrado y migrado recién en la Tarea 4, no estaba asignado a ninguna tarea original).
- [x] Las 7 pantallas usan la misma tipografía base (`DM Sans`) de forma explícita — ninguna depende del default del navegador.
- [x] Nombres de producto, títulos y montos usan `Cormorant Garamond`; el logotipo "Eliathi" usa `Alex Brush`.
- [x] Las pantallas futuras (carga masiva, proveedores) pueden consumir los mismos tokens sin necesitar valores nuevos — `theme.ts` ya está listo para eso.
- [x] El campo "Cantidad recibida" del mockup **no** se implementó (requiere decisión de backend aparte — `alta-rapida` hoy fija `stockLocal: 1`, ver Hallazgo 2.3 de `analisis.md`).

## Dependencias

- **La bloquean:** Fases 1 y 2 de este mismo plan (conviene resolver primero la confirmación/balance y el toggle de modo, para no aplicar tokens sobre pantallas que todavía van a cambiar de estructura).
- **Bloquea:** nada fuera de T27.
