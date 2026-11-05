# Tarea 2 — `LoginPage.tsx`: layout nuevo, lógica intacta

**Estado:** ✅ Hecha. `LoginPage.tsx` no tiene errores de tipos y `vite build` pasa. Ver nota de `tsc` en `status.md`.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T44 v1)

Reemplazar el JSX del login por el layout de 2 columnas del mockup, sin
cambiar cómo se autentica.

## Alcance

- `frontend/src/features/admin/pages/LoginPage.tsx`:
  - Importar `./login.css`.
  - JSX: `<main className="login">` con `<section className="login-form">`
    (logotipo Eliathi + MODAS, "Bienvenida / Ingresá al panel de tu tienda",
    inputs con ícono SVG, banner de error, botón, texto de ayuda "¿Problemas
    para entrar? Pedile acceso a quien administra la tienda.") y
    `<aside className="login-brand" aria-hidden="true">` (ondas SVG,
    destello, tarjeta de vidrio con frase y chips Stock / Pedidos / Finanzas /
    App de escaneo).
  - Nuevo estado `showPassword` + botón ojito con SVG inline y `aria-label`
    que alterna "Mostrar contraseña" / "Ocultar contraseña".
  - Error con `role="alert"`; botón "Ingresar" / "Ingresando..." con spinner
    mientras `submitting`.
  - Inputs con `aria-label`, `autoComplete="email"` y
    `"current-password"`.
- **No se toca**: `signInWithPassword`, mensaje genérico "Email o contraseña
  incorrectos", `<Navigate to="/admin">` si ya hay sesión, redirect tras
  login, `AuthContext`, ruta `/admin/login`, nada del backend.
- Sin "Recordarme", "¿Olvidaste tu contraseña?", Google ni "Registrate"
  (decisión del usuario: v1 solo visual).

## Criterio de aceptación

- `tsc --noEmit` limpio en `frontend/`.
- El formulario sigue siendo un `<form onSubmit>`: Enter envía.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3.
