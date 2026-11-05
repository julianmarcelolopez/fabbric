# T44 — Análisis: nuevo login del admin con el estilo de admin.aivance.cloud

## Pedido

Hoy el login del admin (`/admin/login`) es un formulario HTML pelado
(`<h1>fabbric — Admin</h1>`, dos inputs sin estilos, botón gris). Se pidió
que tenga el estilo del login de `admin.aivance.cloud` (pantalla partida,
formulario a la izquierda, panel de marca a la derecha), **pero con la
identidad visual de Eliathi Modas**.

## Qué tiene el login de referencia (aivance) y qué hacemos con cada cosa

| Elemento de aivance | ¿Se copia? | Adaptación a Eliathi |
|---|---|---|
| Pantalla partida 50/50, panel derecho de color con esquina redondeada | ✅ | Panel derecho **navy** (`#1E2A4A`) con ondas finas y un destello coral |
| Título "Bienvenido" + subtítulo | ✅ | Logotipo "Eliathi" en Alex Brush + "MODAS" + "Bienvenida / Ingresá al panel de tu tienda" |
| Inputs redondeados (pill) con ícono a la izquierda | ✅ | Relleno `#F1EEEA`, foco con borde coral + halo |
| Ojito para mostrar/ocultar contraseña | ✅ | Ya existe en la PWA (`LoginScreen.tsx`), se pasa a SVG en vez de emoji |
| Botón principal con degradé verde | ✅ | Degradé coral (`#FF8A6E → #F07058`), mismo acento que el resto del admin |
| Foto de una persona con tablet dentro de una tarjeta de vidrio | ⚠️ Se cambia | **No hay foto de Eliathi disponible** (el repo no tiene ninguna imagen de marca/modelo). Se usa tarjeta de vidrio con el logotipo + frase + chips (Stock / Pedidos / Finanzas / App de escaneo). Si el cliente aporta una foto, entra en el mismo lugar sin rediseñar |
| "Recordarme" | ❓ Decisión | Ver abajo |
| "¿Olvidaste tu contraseña?" | ❓ Decisión | Ver abajo |
| "Continuar con Google" | ❓ Decisión | Ver abajo |
| "¿No tenés cuenta? Registrate" | ❌ No | En fabbric **no hay auto-registro**: los usuarios del admin los da de alta el dueño (`admin_users.id` = `auth.users.id`, se inserta a mano). Un link "Registrate" llevaría a ningún lado. Se reemplaza por "Pedile acceso a quien administra la tienda" |

## Estado actual verificado

- `frontend/src/features/admin/pages/LoginPage.tsx` — 62 líneas, estilos
  inline mínimos, `supabase.auth.signInWithPassword`. Ya redirige a `/admin`
  si hay sesión y muestra el error genérico "Email o contraseña incorrectos"
  (a propósito, para no revelar si el email existe). **Esa lógica no cambia.**
- Tiene un comentario `Botón "Continuar con Google": se agrega en T6` — nunca
  se hizo para el admin. Google solo existe hoy para clientes de la tienda
  (`CustomerAuthContext.signInWithGoogle`).
- `docs/T32_UX-Admin/mockups/14-login.html` ya tenía un mockup de login
  (tarjeta centrada sobre navy), nunca implementado. T44 lo reemplaza.
- La PWA tiene su propio login (`pwa/src/LoginScreen.tsx`), navy centrado,
  ya con la marca Eliathi. **Fuera de alcance**: T44 es solo el admin de
  escritorio. Si se quiere unificar, es una vuelta aparte.
- Tokens de marca ya existen: navy `#1E2A4A`, coral `#F07058`/`#FF6B4A`,
  fondo `#F8F7F5`, fuentes Cormorant Garamond / DM Sans / Alex Brush
  (`frontend/index.html` ya carga las tres).

## Decisiones abiertas (con recomendación)

### 1. "Recordarme" — recomendado: **no en v1**
Supabase guarda la sesión en `localStorage` siempre. Un checkbox real
(desmarcado = cerrar sesión al cerrar el navegador) exige cambiar el
storage del cliente de Supabase, que es compartido con el resto del admin
y con la tienda. Un checkbox decorativo que no hace nada sería peor que no
tenerlo.

### 2. "¿Olvidaste tu contraseña?" — recomendado: **fase 2**
Requiere `resetPasswordForEmail`, una página nueva para elegir la clave
nueva y configurar las *Redirect URLs* en Supabase. Con dominios propios
por tienda (T38, `eliathimodas.com`) hay que revisar que cada dominio esté
permitido. No es difícil, pero es una feature en sí misma, y con pocos
usuarios hoy el dueño puede resetear la clave desde el panel de Supabase.

### 3. "Continuar con Google" — recomendado: **no en v1**
Ojo: la sesión de Supabase de un login con Google tiene que corresponder a
una fila de `admin_users`. Si el `auth.users.id` que crea Google no coincide
con el existente (o el email no está vinculado), el usuario entraría
autenticado pero **sin organización ni rol** y el backend lo rechazaría.
Hay que probarlo contra el Supabase real antes de prometerlo. Se deja el
botón solo en la versión "Completo" del mockup para que se vea cómo queda.

> Resumen: **v1 = solo lo visual** (layout, marca, inputs, ojito, botón,
> estados de error/cargando, responsive). Cero cambios de backend, cero
> cambios de autenticación. Es lo que muestra el botón "v1 (recomendado)"
> del mockup; el botón "Completo" muestra cómo se vería con las 3 decisiones
> abiertas aprobadas.

## Propuesta UX/UI

Mockup interactivo: [`specs/login-mockup.html`](specs/login-mockup.html)
(abrir en el navegador; la barra negra de arriba cambia entre
Normal / Error / Cargando y entre v1 / Completo, no es parte del diseño).

- **Escritorio (>860px)**: 2 columnas. Izquierda formulario centrado
  (ancho máx. 380px) sobre `#F8F7F5`; derecha panel navy con esquina
  izquierda redondeada de 44px.
- **Móvil (≤860px)**: solo el formulario (el panel de marca se oculta, el
  logotipo ya está arriba). El admin se usa sobre todo en escritorio, pero
  la dueña puede entrar desde el celular.
- **Estados**: normal, foco (borde coral + halo), error (banner rojo
  suave + bordes rojos), cargando (spinner en el botón, botón deshabilitado).
- **Accesibilidad**: `aria-label` en inputs y en el ojito, `role="alert"` en
  el error, `autocomplete` correcto (gestores de contraseñas), contraste del
  texto del botón blanco sobre coral revisado ≥ 3:1 para texto grande (16px
  bold).

## Riesgos / cosas a no romper

- El formulario conserva `onSubmit`, el mensaje genérico de error y el
  redirect a `/admin` — es un cambio de piel, no de lógica.
- `admin.css` es global del admin: los estilos del login van **con prefijo
  propio** (`.login-*`) para no pisar `.card`, `.field`, `.btn` del resto.
- Las fuentes ya se cargan en `index.html`; no se agrega ninguna dependencia.
