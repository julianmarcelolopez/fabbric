# Tarea 3 — Verificación en navegador

**Estado:** ✅ Hecha y verificada. Verificación visual automatizada con
Playwright: **25/25 checks OK** — ver `frontend/t44-login-eliathi.mjs` y las
capturas en [`test/`](test/). `vite build` limpio. `tsc --noEmit` en
`frontend/` falla solo en `StoreProductPage.tsx` (trabajo en curso de T43, no
de T44; ver `status.md`).

**Depende de:** Tarea 2.

## Objetivo

Confirmar en un navegador real (criterio constante del proyecto, no solo
tipos) que el login nuevo se ve como el mockup y no rompe nada.

## Qué hace el script

`frontend/t44-login-eliathi.mjs` crea una org y un usuario `owner`
descartables en la base real, abre `http://localhost:5173/admin/login`
(Docker) y comprueba:

| # | Escenario | Checks |
|---|---|---|
| 1 | Escritorio 1440x900 | "Bienvenida" visible, panel de marca visible, 2 columnas de igual ancho, logotipo en Alex Brush, sin Google / Recordarme / Registrate / Olvidaste (v1) |
| 2 | Foco | El input enfocado tiene borde coral `rgb(240,112,88)` |
| 3 | Ojito | Arranca oculta, al tocar muestra el texto, el `aria-label` pasa a "Ocultar contraseña", vuelve a ocultar |
| 4 | Cargando | Con el login demorado 1,5 s: botón deshabilitado y texto "Ingresando..." |
| 5 | Error | Banner "Email o contraseña incorrectos" con `role=alert`, sigue en `/admin/login`, botón habilitado de nuevo |
| 6 | Móvil 375x740 | Panel de marca oculto, formulario visible, sin scroll horizontal |
| 7 | Login correcto | Enter envía el formulario y lleva a `/admin` |
| 8 | Regresión | El admin muestra su sidebar de siempre, no queda ningún `.login`, la tipografía del body no cambió |
| 9 | Con sesión | `/admin/login` redirige a `/admin` |

Al final borra todos los datos de prueba (el script lo confirma con un check
más). Correr con:
```
cd frontend && node t44-login-eliathi.mjs
```
Resultado de la última corrida: **25 PASS, 0 FAIL**.

## Capturas

En [`test/`](test/):
- `01-desktop-normal.png` — layout de 2 columnas
- `02-desktop-foco.png` — input enfocado
- `03-desktop-ojito-visible.png` — contraseña visible
- `04-desktop-cargando.png` — botón con spinner
- `05-desktop-error.png` — banner de error
- `06-movil-normal.png` — versión celular
- `07-admin-despues-del-login.png` — el admin sin cambios

## Hallazgo durante el test

Un primer intento del check de foco falló porque el borde del input tiene una
transición de 150 ms y se leía antes de que terminara. Era un tema de timing
del test, no del diseño; se agregó una espera de 400 ms.

## Qué no cubre

- Una pasada a ojo de las capturas por el usuario (que se vea "lindo" no lo
  decide un script).
- Navegadores distintos de Chromium.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** ninguna.
