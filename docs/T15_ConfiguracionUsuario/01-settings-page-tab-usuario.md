# Tarea 1 — `SettingsPage.tsx` con tabs + tab Usuario

**Estado:** ✅ Completada (2026-07-24) — verificada en navegador por el usuario, sin defectos
**Depende de:** —

## Objetivo

Shell de la nueva sección "Configuración", con navegación por tabs y el primer tab funcionando.

**Ampliado durante la implementación**: el usuario preguntó qué pasa si querés cambiar tu contraseña, o si entraste con Google. Se investigó el código real de `LoginPage.tsx`: hoy el admin **solo** tiene login por email/contraseña — el comentario que decía "botón Google se agrega en T6" nunca se concretó (T6 agregó Google solo para el portal del comprador). Como no existe ningún admin logueado con Google, no se construyó nada condicional para ese caso — no hay forma de alcanzarlo. Pero sí se agregó **cambiar contraseña**, porque cerraba un gap real: no había ninguna forma de que un admin cambiara su propia contraseña, en ningún lado del sistema.

## Decisiones de diseño (resueltas antes de codear)

- **Una sola ruta** (`/admin/settings`), switching de tabs con **estado local del componente** (`useState<"usuario" | "integraciones">`) — no sub-rutas. Ningún otro lugar del admin usa sub-rutas anidadas con Outlet propio (todas son rutas planas: `orders`, `customers`, `config`...); introducir ese patrón para 2 tabs sería una abstracción de más.
- **Tabs con las clases `.btn`/`.btn.primary` ya existentes** (activa = primary, inactiva = plain) — no hay ningún componente de tabs en el admin para reusar, y no se justifica crear un sistema nuevo para dos.
- Sidebar: "Configuración" va justo **después de "Tienda"**, antes del spacer.

## Pasos

- [x] `frontend/src/features/admin/pages/SettingsPage.tsx` (nuevo): estado local `tab`, fila de dos botones arriba (Usuario | Integraciones), contenido condicional debajo.
- [x] `frontend/src/router.tsx`: ruta `{ path: "settings", element: <SettingsPage /> }` dentro de `/admin`.
- [x] `AdminLayout.tsx`: `<NavLink to="/admin/settings">Configuración</NavLink>` después de la de "Tienda".
- [x] Tab Usuario: usa el `Me` que ya llega por `useOutletContext<Me>()` (mismo patrón que el resto de las páginas admin) — muestra email, rol (`me.role`) y organización (`me.orgName`). Sin formulario, sin edición, sin llamada a la API (ya está en el contexto).
- [x] **Cambiar contraseña** (agregado sobre la marcha): mini-form (`ChangePasswordForm`, dentro de la misma tab Usuario) con contraseña nueva + confirmar, `supabase.auth.updateUser({ password })` del lado del cliente — sin backend nuevo, Supabase ya resuelve esto contra la sesión activa. Validación mínima: 6+ caracteres, coinciden entre sí.
- [x] Tab Integraciones: placeholder simple ("Próximamente") por ahora — lo completa T16, que reemplaza este contenido.

## Definition of Done

- [x] `tsc --noEmit` limpio; `vite build` compila sin errores.
- [x] **Cambio de contraseña probado de punta a punta, de verdad, no solo compilado**: se cambió la contraseña real del owner a un valor temporal vía la API de Supabase (mismo mecanismo que usa `updateUser`), se confirmó login exitoso con la nueva, y se revirtió a la original — confirmado con un login final.
- [x] Verificación visual en navegador → confirmado por el usuario, sin problemas.
