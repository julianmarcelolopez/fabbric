# Tarea 3 — Definition of Done de T13

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** tareas 1 a 2

## Objetivo

Cerrar T13 con el criterio de `docs/plan_2.md`: *la tienda pública se ve con tipografía y paleta coherentes y un wordmark prolijo, sin tocar el panel admin*.

## Checklist final (usuario, en navegador)

- [x] `/store/demo` con la tipografía Poppins y el fondo crema — confirmado ("todo perfecto") en la verificación de la tarea 1.
- [x] Acento naranja (`#FF6B4A`) coherente contra el fondo crema.
- [x] Logo real bien integrado en la topbar contra el nuevo fondo.
- [x] Wordmark de respaldo (círculo con inicial) probado de verdad con `logoUrl = null` — se ve prolijo, confirmado por el usuario.
- [x] `admin.css` sin diff (`git diff --stat`) — panel admin no tocado.
- [x] Consola limpia; `tsc --noEmit` y `vite build` limpios en las dos tareas.

## Resultado (2026-07-24)

Verificado en navegador por el usuario en dos pasadas (tarea 1: paleta/tipografía/logo; tarea 2: wordmark de respaldo con el logo temporalmente quitado y repuesto). **Criterio de la fase cumplido.** Documentado también en `docs/plan_2.md` que el theming quedó hardcodeado (no configurable por org) como decisión consciente para esta demo de un solo tenant.

## Al cerrar

- [x] Actualizar README de T13 + memoria; sugerir commit (`feat: t13 identidad visual`).
