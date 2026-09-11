# Tarea 1 — Archivo de tokens + carga de fuentes

**Estado:** ✅ Hecha — verificada con Playwright (4/4 PASS, `pwa/t27-03-01-tokens-y-fuentes.mjs`).

**Depende de:** Fases 1 y 2 del plan general (quick wins y toggle de modo) resueltas.

## Objetivo

Crear el punto único de verdad para colores, tipografía y radios de la PWA, antes de tocar ninguna pantalla — para que las tandas de migración (Tareas 2 a 4) y las pantallas futuras (carga masiva, proveedores) consuman los mismos valores en vez de hardcodear hex sueltos otra vez.

## Pasos

- [x] Creado `pwa/src/lib/theme.ts` (objeto TS, no CSS — se consume como valores directos en los estilos inline existentes de cada pantalla) con los 13 colores, `radius = 8`, y las 3 familias tipográficas.
- [x] **Decisión tomada:** se duplicaron los valores en `pwa/src/lib/theme.ts` con nombres propios, en vez de mover a un paquete compartido — alcanza para un solo tenant usando la PWA; revisar de nuevo si aparece un segundo tenant.
- [x] Agregado a [pwa/index.html](../../../../../pwa/index.html) el `<link>` de Google Fonts (mismos pesos que ya usa `frontend/index.html:16`: `Alex+Brush`, `Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400`, `DM+Sans:wght@300;400;500`), más los `preconnect` correspondientes.
- [x] Creado `pwa/src/index.css` (primer CSS global de `pwa/`, importado una sola vez en `main.tsx`) con `body { font-family: "DM Sans", system-ui, sans-serif; }` — el resto de los estilos sigue resolviéndose inline por componente, migrando pantalla por pantalla en las Tareas 2 a 4.

## Definition of Done

- [x] `pwa/src/lib/theme.ts` existe y exporta los 13 colores (`colors`), el radio (`radius`) y las 3 familias tipográficas (`fonts`).
- [x] Las 3 fuentes cargan correctamente — verificado forzando la descarga real de cada `@font-face` con `document.fonts.load()` (no alcanzaba con confirmar que el `<link>` está en el HTML: sin texto visible usándolas todavía, el navegador no las descarga solo).
- [x] Ninguna pantalla migró a los tokens en esta tarea (`theme.ts` no se importa desde ningún componente todavía) — eso es trabajo de las Tareas 2 a 4. El único efecto visible de esta tarea es que las pantallas sin `fontFamily` propio pasan del serif por defecto del navegador a DM Sans.

## Cómo se verificó

**Playwright** (`pwa/t27-03-01-tokens-y-fuentes.mjs`, sin necesidad de login ni datos de prueba — el `<link>` y el CSS global se aplican antes de cualquier autenticación): `document.fonts.load('16px "DM Sans"')` (y lo mismo para Cormorant Garamond y Alex Brush) resuelve con al menos una `FontFace` cargada para las 3; `getComputedStyle(document.body).fontFamily` confirma que el body ya usa DM Sans como base. **4/4 PASS.**

## Dependencias

- **La bloquean:** Fases 1 y 2 del plan general.
- **Bloquea:** Tareas 2, 3 y 4 de esta fase (todas consumen este archivo).
