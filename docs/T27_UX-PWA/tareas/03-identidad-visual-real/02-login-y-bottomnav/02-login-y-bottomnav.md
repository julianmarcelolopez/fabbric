# Tarea 2 — Login (hero navy) y barra inferior

**Estado:** ✅ Hecha — verificada con Playwright (12/12 PASS, `pwa/t27-03-02-login-y-bottomnav.mjs`).

**Depende de:** Tarea 1 (tokens y fuentes) de esta misma fase.

## Objetivo

Migrar las dos piezas de menor superficie pero mayor impacto visual: el login (hoy un formulario neutro sobre fondo crema, sin relación con la marca) y la barra inferior (hoy fondo blanco/gris genérico).

## Pasos

### LoginScreen

- [x] [pwa/src/LoginScreen.tsx](../../../../../pwa/src/LoginScreen.tsx) pasa de fondo `#F7F3EC` a fondo navy (`colors.navy`) de borde a borde.
- [x] El texto "Eliathi Modas" se reemplaza por el logotipo en `Alex Brush` blanco ("Eliathi" + "MODAS" en letras espaciadas debajo).
- [x] Botón "Ingresar" pasa a `colors.accent` (mismo coral de siempre, ahora vía token).
- [x] `fontFamily` se reemplaza por `fonts.body` a nivel del contenedor; error de login usa un chip `dangerBg`/`danger` (en vez de texto rojo oscuro suelto, ilegible sobre navy).

### BottomNav

- [x] [pwa/src/BottomNav.tsx](../../../../../pwa/src/BottomNav.tsx) pasa de `background: "#fff"` a `colors.navy` sólido (sin borde superior — el mockup tampoco lo tiene sobre fondo navy).
- [x] Color activo pasa a `colors.accent`; color inactivo pasa a blanco semitransparente (`rgba(255, 255, 255, 0.55)`).
- [x] El badge del carrito mantiene el color coral, ahora vía `colors.accent`.

## Definition of Done

- [x] Login y BottomNav no tienen ningún hex hardcodeado — todo viene de `pwa/src/lib/theme.ts`.
- [x] Probado con Playwright: login legible (contraste blanco sobre navy) y barra inferior con el ítem activo claramente distinguible del inactivo — confirmado además con captura visual.
- [x] Botón "Ingresar" mide ≥44px de alto — confirmado por `boundingBox()`.

## Cómo se verificó

**Playwright** (`pwa/t27-03-02-login-y-bottomnav.mjs`, viewport 390×844): la parte de Login no requiere sesión (el `<link>` de fuentes y el fondo se aplican antes de loguearse) — verifica `background-color` navy exacto del contenedor, que "Eliathi" usa `Alex Brush`, que "MODAS" está visible, y color/alto del botón "Ingresar". La parte de BottomNav usa una org/usuario descartables: verifica el fondo navy de la barra, que el ítem activo es coral y el inactivo blanco semitransparente, y que los colores se intercambian correctamente al navegar entre Escanear y Carrito. **12/12 PASS.** Complementado con una captura de pantalla del login para chequeo visual (no versionada).

## Dependencias

- **La bloquean:** Tarea 1 de esta fase.
- **Bloquea:** nada de las Tareas 3/4 (son independientes entre sí, pueden hacerse en cualquier orden una vez lista la Tarea 1).
