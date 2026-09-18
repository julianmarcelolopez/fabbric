# Tarea 9 — Header y footer globales, fijos, sin scroll de sobra

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 8.

## Origen

Tres observaciones encadenadas del usuario sobre la app completa (no solo
Escanear):
1. El logo "Eliathi" y la barra inferior (Escanear/Carrito) no estaban en
   todas las pantallas — ¿deberían estarlo?
2. Al hacerlos globales, el header se iba con el scroll (no quedaba fijo,
   a diferencia del footer).
3. Después de fijarlos, seguía apareciendo scroll en la pantalla principal
   aunque el contenido real no llenaba el viewport.

## Estado real encontrado antes de tocar nada

- El logo "Eliathi" vivía **solo** dentro de `EscanearScreen.tsx` — no
  existía en `Alta`, `Ficha`, `Carrito`, `Confirmar`, `EntradaOk`,
  `VentaAgregadaOk`. La barra de "Cerrar sesión" sí era global (vivía en
  `App.tsx`, afuera del switch de pantallas).
- `BottomNav` estaba restringido a propósito a `escanear`/`carrito`
  (`App.tsx`, comentario de T23/T27: "Alta y Ficha son estados a los que
  se llega por una acción concreta, no lugares a los que se navega
  libremente") — no fue un descuido, fue una decisión deliberada de esa
  fase.

## Decisiones (acordadas con el usuario antes de tocar código)

1. **Logo**: se saca de `EscanearScreen.tsx` y se mueve a `App.tsx`, junto
   a "Cerrar sesión" — sin riesgo, es puramente de marca.
2. **Footer**: se muestra en **todas** las pantallas por consistencia
   visual (el layout no "salta" al entrar a un estado intermedio), pero
   **sin agregar navegación nueva** — en pantallas que no son destinos
   reales (Alta/Ficha/Confirmar/EntradaOk/VentaAgregadaOk) queda atenuada
   y no clickeable. La restricción de T23/T27 se respeta tal cual a nivel
   de comportamiento, solo cambia que ahora se ve (apagada) en vez de no
   existir.
3. **Ambos fijos** (`position: fixed`), con el contenido reservando su
   alto exacto (`paddingTop`/`paddingBottom`) para no quedar tapado.

## Alcance implementado

- `pwa/src/App.tsx`: `HEADER_HEIGHT = 40` (constante, antes el alto era
  implícito). Header (logo + Cerrar sesión) pasa a `position: fixed; top:
  0`. `navActive`/`navDisabled` calculados a partir de `screen.kind` y
  pasados a `BottomNav`, que ahora se monta siempre (antes:
  `{(screen.kind === "escanear" || screen.kind === "carrito") && <BottomNav .../>}`).
  Root div: `paddingTop: HEADER_HEIGHT` sumado al `paddingBottom: 56` que
  ya existía para el footer.
- `pwa/src/BottomNav.tsx`: nuevo prop `disabled?: boolean` — atenúa
  (`opacity: 0.55`) y desactiva (`pointerEvents: "none"`, `disabled` en
  los `<button>`) la barra sin sacarla del DOM.
- `pwa/src/screens/EscanearScreen.tsx`: se saca el `<p>` del logo (ya
  vive en `App.tsx`, no debía quedar duplicado).

## El bug de scroll — dos causas reales, no una

Primer fix (insuficiente): `pwa/src/index.css` no reseteaba el margen por
default del `<body>` (8px del navegador) — se agregó `margin: 0`. No
alcanzó.

**Causa real**: `box-sizing` default del navegador es `content-box` — el
`div` raíz de `App.tsx` tiene `min-height: 100vh` **más**
`paddingTop`/`paddingBottom` (96px entre los dos, para header+footer
fijos). Sin `border-box`, el padding se **suma** al `min-height` en vez de
quedar incluido adentro — el resultado es una página de `100vh + 96px` de
alto siempre, sin importar cuánto contenido real tenga la pantalla (de ahí
el espacio en blanco enorme visible en la captura del usuario antes de
llegar al footer).

**Fix**: reset global en `pwa/src/index.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
```
Es un cambio de alcance amplio (toda la PWA, no solo Escanear) — se avisó
al usuario que valía la pena revisar el resto de las pantallas, aunque no
debería romper nada porque casi todo ya está armado con `width:"100%"` +
padding, justo el caso que `border-box` corrige en vez de romper.

## Cómo se verificó

`npx tsc --noEmit` y `npx vite build --mode production` limpios en cada
paso. Confirmado por el usuario en vivo: "solucionado en la pantalla
principal" (después del fix de `box-sizing`).

## Dependencias

- **La bloquean:** Tarea 8.
- **Bloquea:** nada formalmente.
