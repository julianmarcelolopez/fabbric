# T44 — Login del admin: pantalla partida con la identidad de Eliathi

## Pedido original

"necesitamos agregar una nueva feature que el ux-ui de login... actualmente
es así [formulario pelado] pero quiero que tenga este estilo:
https://admin.aivance.cloud/ pero con el ux-ui de eliathimodas".

El análisis completo (qué se copia de aivance, qué no, decisiones abiertas)
está en [`../analisis.md`](../analisis.md). Este archivo define el alcance
y los criterios de aceptación.

## Mockup

[`login-mockup.html`](login-mockup.html) — HTML autocontenido, se abre
directo en el navegador. Barra negra superior = solo para revisar estados.

## Alcance v1 (recomendado)

Cambio **solo visual** de `frontend/src/features/admin/pages/LoginPage.tsx`:

- Layout de 2 columnas: formulario a la izquierda, panel de marca navy a
  la derecha (oculto en móvil).
- Logotipo "Eliathi" (Alex Brush) + "MODAS" + "Bienvenida / Ingresá al
  panel de tu tienda".
- Inputs pill con ícono (email, candado) y botón ojito SVG para mostrar /
  ocultar contraseña.
- Botón "Ingresar" con degradé coral, spinner mientras envía.
- Banner de error con ícono, sobre el botón.
- Texto de ayuda: "¿Problemas para entrar? Pedile acceso a quien
  administra la tienda."
- Estilos en un archivo nuevo `login.css` con prefijo `.login-*`.

**No cambia**: `supabase.auth.signInWithPassword`, el mensaje genérico
"Email o contraseña incorrectos", el redirect a `/admin`, la ruta
`/admin/login`, `AuthContext`, nada del backend.

## Fuera de alcance de v1 (decisiones abiertas, ver análisis)

- "Recordarme" (requiere cambiar el storage del cliente Supabase).
- "¿Olvidaste tu contraseña?" (página de reset + Redirect URLs).
- "Continuar con Google" en el admin (hay que verificar el vínculo con
  `admin_users`).
- "Registrate" — descartado: no hay auto-registro en fabbric.
- Login de la PWA (`pwa/src/LoginScreen.tsx`).
- Foto de marca en el panel derecho (no hay material; el diseño la admite
  más adelante).

## Criterios de aceptación

- `/admin/login` muestra el diseño de 2 columnas en escritorio y solo el
  formulario en ≤860px, sin scroll horizontal.
- Login correcto lleva a `/admin`; credenciales malas muestran el banner
  "Email o contraseña incorrectos" sin recargar.
- Mientras se envía, el botón queda deshabilitado con spinner y texto
  "Ingresando...".
- El ojito alterna el tipo del input y tiene `aria-label` que cambia
  (Mostrar / Ocultar contraseña).
- Enter en cualquiera de los dos campos envía el formulario.
- El gestor de contraseñas del navegador sigue ofreciendo guardar/autocompletar
  (`autocomplete="email"` / `"current-password"`).
- Ningún estilo del login afecta otras pantallas del admin (clases con
  prefijo `.login-*`).
- `tsc --noEmit` limpio en `frontend/`.
- Verificado en el navegador (escritorio y ancho de celular) contra
  `docker compose up -d frontend`, no solo por tipos.
