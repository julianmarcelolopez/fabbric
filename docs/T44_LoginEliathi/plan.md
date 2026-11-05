# Plan — T44 Login del admin con la identidad de Eliathi

Basado en [`analisis.md`](analisis.md) y
[`specs/T44_LoginEliathi.md`](specs/T44_LoginEliathi.md).

**Decisiones confirmadas por el usuario (2026-11-05):**
1. **v1 solo visual.** Sin "Recordarme", "¿Olvidaste tu contraseña?" ni
   "Continuar con Google"; "Registrate" descartado. Cero cambios de
   autenticación o backend.
2. Panel derecho con la tarjeta de marca (sin foto); si el cliente aporta una
   foto después, entra en el mismo lugar.
3. Mockup aprobado. **Implementación: pendiente del OK para empezar.**

## Tareas

| # | Tarea | Depende de |
|---|---|---|
| 1 | [Estilos: `login.css` con prefijo `.login-*`](tareas/01-estilos-login/01-estilos-login.md) | — |
| 2 | [`LoginPage.tsx`: layout nuevo, lógica intacta](tareas/02-loginpage-layout/02-loginpage-layout.md) | 1 |
| 3 | [Verificación en navegador](tareas/03-verificacion/03-verificacion.md) | 2 |

## Mockup

- Archivo: [`specs/login-mockup.html`](specs/login-mockup.html)
- Link de Claude: **[Login Eliathi Modas](https://claude.ai/artifact/FawSvhaEhq733ycwX3ccew)**

## Cambios concretos

**`frontend/src/features/admin/pages/login.css`** (nuevo)
- Pasar el CSS del mockup con prefijo `.login-*`; tokens como variables
  CSS locales en `.login` (navy, coral, off, field).
- `@media (max-width: 860px)`: una columna, oculta el panel de marca.

**`frontend/src/features/admin/pages/LoginPage.tsx`**
- Reemplazar el JSX por el layout del mockup (`<main className="login">`,
  `<section className="login-form">`, `<aside className="login-brand">`).
- Agregar estado `showPassword` y el botón ojito (SVG inline, `aria-label`).
- Mantener intactos `onSubmit`, `error`, `submitting` y el `<Navigate>`.
- Importar `./login.css`.

**Fuentes**: ya cargadas en `frontend/index.html` (Alex Brush, Cormorant
Garamond, DM Sans). Sin dependencias nuevas.

## Verificación

1. `docker compose up -d frontend` y abrir `/admin/login` en escritorio.
2. Credenciales incorrectas → banner de error, el formulario sigue usable.
3. Credenciales correctas (`vendedor@eliathimodas.com`) → `/admin`.
4. Ojito alterna el campo; Enter envía; foco visible con Tab.
5. Ancho 375px (DevTools): solo formulario, sin scroll horizontal.
6. Navegar a otras pantallas del admin: sin cambios visuales (el CSS del
   login no se filtra).
7. `tsc --noEmit` en `frontend/`.

## Después (solo si el usuario lo pide más adelante)

- Fase 2 — "¿Olvidaste tu contraseña?": `resetPasswordForEmail` + página de
  nueva clave + Redirect URLs por dominio (T38).
- Fase 2 — Google en el admin: probar primero el vínculo con `admin_users`.
- "Recordarme": solo si se acepta cambiar el storage del cliente Supabase.
