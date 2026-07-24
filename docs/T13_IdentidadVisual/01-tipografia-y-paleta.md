# Tarea 1 — Tipografía y paleta real del logo

**Estado:** ✅ Completada (2026-07-24) — verificada en navegador por el usuario, sin defectos
**Depende de:** —

## Objetivo

Reemplazar el `system-ui` genérico de la tienda pública por algo con más carácter, y aplicar la paleta **real** extraída del logo de Eliathi Modas a toda la tienda (hoy solo la usa el header, vía `accentColor`).

## Paleta real (del SVG del logo, no una aproximación)

- Fondo: `#F7F3EC` (crema)
- Texto/trazo principal: `#16213E` (azul marino)
- Acento: `#FF6B4A` (naranja/coral) — los puntos del logo

## Pasos

- [x] **Dato**: `accentColor` de la org demo → `#FF6B4A`, vía `PATCH /admin/catalog-config` real contra el backend en Docker. Confirmado en `/public/demo/config`.
- [x] Tipografía elegida: **Poppins** (400/500/600/700) — geométrica y cálida, encaja con el posicionamiento "popular, no boutique" de `docs/analisis-negocio.md`. Una sola familia, sin combinarla con la cursiva del logo (que es un asset fijo aparte).
- [x] `frontend/index.html`: `<link>` de Google Fonts (con `preconnect`).
- [x] `catalog.css`: `.store` y `.store-message` (el segundo se renderiza fuera de `.store` en los estados de carga/error de `StoreLayout`, necesitaba su propia declaración) pasan a `font-family: "Poppins", system-ui, ...`.
- [x] `.store` y `.store-topbar`: `background: #fff` → `#F7F3EC`. `.store-topbar` tenía su propio `background: #fff` hardcodeado por separado, no heredaba de `.store` — corregido también.
- [x] Contraste revisado: `.pcard`/`.pdv` no tienen background propio (heredan el de `.store`), así que el texto navy se ve directo sobre el crema — buen contraste. Los elementos que sí son blancos explícitos (botones, drawer del carrito, resumen de checkout) se mantienen así a propósito, para que se lean como paneles flotando sobre el fondo — no es un bug de contraste, es la jerarquía visual correcta.
- [x] `admin.css` confirmado sin diff (`git diff --stat`) — no se tocó.

## Definition of Done

- [x] `tsc --noEmit` limpio; `vite build` compila sin errores.
- [x] `accentColor` de la org demo confirmado en `#FF6B4A` vía `GET /public/demo/config` real.
- [x] Verificación visual en navegador → confirmado por el usuario: logo, tipografía y acento naranja se ven bien, consola limpia.
