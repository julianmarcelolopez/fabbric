# Tarea 1 — Google OAuth + configuración de Auth en Supabase

**Estado:** ⏭️ Diferida a T6 (decisión del usuario, 2026-07-07)
**Depende de:** — (manual, dashboards de Google Cloud y Supabase)

> **Diferida**: Google Cloud solo hace falta para el botón "Iniciar sesión con Google". El Portal Admin funciona con email/password, así que T1 se cierra sin Google. Donde Google es **obligatorio** es en el portal comprador (T6, login solo Google) — este trámite se hace ahí. Los pasos de abajo quedan como guía para ese momento.

## Objetivo

Dejar Supabase Auth listo para los dos métodos de login del Portal Admin: email/password (viene habilitado por defecto) y Google OAuth (diferido de T0). Además configurar las redirect URLs para que el flujo OAuth vuelva bien al SPA en dev.

## Pasos

### Google Cloud Console (https://console.cloud.google.com)

- [ ] Crear un proyecto (ej. `fabbric-dev`) si no existe
- [ ] **APIs & Services → OAuth consent screen**: configurar (tipo External, nombre de la app, email de soporte). En modo Testing alcanza para dev — agregar tu email como test user.
- [ ] **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
  - Application type: **Web application**
  - Authorized redirect URIs: la callback que muestra Supabase en la pantalla del provider Google (formato `https://uhnitagtprwhwpqjwdph.supabase.co/auth/v1/callback`)
- [ ] Guardar `Client ID` y `Client Secret`

### Supabase Dashboard

- [ ] **Authentication → Providers (Sign In) → Google**: habilitar y pegar `Client ID` / `Client Secret`
- [ ] **Authentication → URL Configuration**:
  - Site URL: `http://localhost:5173`
  - Redirect URLs: agregar `http://localhost:5173/**` (necesario para que `signInWithOAuth` pueda volver al SPA en dev)
- [ ] **Authentication → Providers → Email**: verificar que esté habilitado. Para dev, considerar desactivar "Confirm email" (los admins se crean desde el backend ya confirmados, pero simplifica pruebas manuales).

## Definition of Done

- [ ] El provider Google figura habilitado en el dashboard de Supabase
- [ ] `http://localhost:5173/**` está en la lista de Redirect URLs y el Site URL apunta a `http://localhost:5173`
- [ ] `Client ID`/`Client Secret` guardados fuera del repo (gestor de contraseñas)

## Notas

- El login del flujo real se prueba recién en la tarea 5 (frontend) — acá solo se deja la configuración lista.
- Para producción habrá que repetir esto con el dominio real (nuevo OAuth client o URIs adicionales + publicar el consent screen). Anotado para la fase de despliegue, no bloquea nada ahora.
