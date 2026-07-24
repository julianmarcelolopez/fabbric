# Tarea 1 — `SettingsPage.tsx` con tabs + tab Usuario

**Estado:** ⬜ Pendiente
**Depende de:** —

## Objetivo

Shell de la nueva sección "Configuración", con navegación por tabs y el primer tab funcionando.

## Pasos

- [ ] `frontend/src/features/admin/pages/SettingsPage.tsx` (nuevo): layout con tabs (Usuario | Integraciones); navegación simple entre tabs (estado local o sub-rutas, ej. `/admin/settings` y `/admin/settings/integraciones` — a definir según lo que sea más consistente con el resto del router).
- [ ] `frontend/src/router.tsx`: agregar la(s) ruta(s) nueva(s) dentro de `/admin`.
- [ ] `AdminLayout.tsx`: nuevo ítem "Configuración" en el sidebar.
- [ ] Tab Usuario: usa el `Me` que ya llega por Outlet context (mismo patrón que el resto de las páginas admin) — muestra email, rol y nombre de organización. Sin formulario, sin edición.
- [ ] Tab Integraciones: placeholder vacío por ahora (lo completa T16) — que no rompa la navegación.

## Definition of Done

- [ ] `tsc --noEmit` limpio; Vite compila.
- [ ] Verificación en navegador → tarea 2.
