# Tarea 1 — Estilos: `login.css` con prefijo `.login-*`

**Estado:** ✅ Hecha.

**Depende de:** nada.

## Objetivo (según `plan.md`, T44 v1)

Llevar el CSS del mockup (`specs/login-mockup.html`) a un archivo propio del
login, sin tocar `admin.css` ni afectar otras pantallas del admin.

## Alcance

- Nuevo `frontend/src/features/admin/pages/login.css`.
- Todas las clases con prefijo `.login-*` (`.login`, `.login-form`,
  `.login-brand`, `.login-field`, `.login-error`, `.login-btn`, etc.) para no
  chocar con `.card`, `.field`, `.btn` globales de `admin.css`.
- Tokens como variables CSS locales en `.login` (navy `#1E2A4A`, coral
  `#F07058`/`#FF8A6E`, fondo `#F8F7F5`, campo `#F1EEEA`, danger).
- Solo el alcance v1: **no** pasar los estilos de Google, separador,
  "Recordarme" ni "Olvidé mi clave" (`.extra`, `.btn-google`, `.sep`).
- Dejar afuera la barra negra del mockup (`.mock-bar`): no es parte del diseño.
- Estados: foco (borde coral + halo), error (banner + bordes rojos),
  cargando (spinner, botón deshabilitado).
- `@media (max-width: 860px)`: una columna, se oculta `.login-brand`.
- Fuentes: ya cargadas en `frontend/index.html`, sin dependencias nuevas.

## Criterio de aceptación

- El archivo existe y no declara ningún selector sin prefijo `.login`.
- Ningún selector de `admin.css` fue modificado.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
