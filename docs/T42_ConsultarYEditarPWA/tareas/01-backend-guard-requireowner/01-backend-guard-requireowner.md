# Tarea 1 — Backend: guard `requireOwnerOrAbove` + aplicarlo a 4 endpoints

**Estado:** ⬜ Pendiente.

**Depende de:** nada.

## Objetivo (según `plan.md`, sección "Permisos")

Que "solo administradores pueden modificar" sea real a nivel de API
(no solo un botón escondido en la PWA) para los 4 endpoints que el
alta de staff NO necesita hoy — los otros 3 (ver `plan.md`) quedan
abiertos a propósito, documentado ahí.

## Alcance

- `backend/src/plugins/auth.ts`: nuevo
  `app.decorate("requireOwnerOrAbove", async (request) => {...})`,
  mismo patrón que `requireSuperAdmin` (líneas 149-154) pero
  aceptando `"owner"` además de `"super_admin"` (rechaza solo si
  `role === "staff"`). Sumar el tipo a la interfaz de decoradores
  (junto a `requireAdminAuth`/`requireSuperAdmin`, línea ~35-36).
- Aplicar `preHandler: fastify.requireOwnerOrAbove` (en vez de
  `requireAdminAuth`) en:
  - `PATCH /admin/variants/:id` (`backend/src/modules/variants/routes.ts`)
  - `DELETE /admin/variants/:id` (ídem)
  - `DELETE /admin/images/:id` (`backend/src/modules/images/routes.ts`)
  - `PUT /admin/products/:id/collections` (`backend/src/modules/products/routes.ts`)
- Sin cambios en los demás endpoints de estos 3 archivos (en
  particular, `POST /admin/products/:id/variants` y
  `POST /admin/products/:id/images` quedan con `requireAdminAuth` —
  los usa el alta de staff hoy, ver tabla de `plan.md`).

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- Con token de un usuario `staff`: los 4 endpoints de arriba
  devuelven 403. Confirmado con `curl`, no solo desde la UI (ver nota
  de T39/B001 sobre credenciales de `.env.local` si hace falta un
  script de prueba en vez de `curl` directo).
- Con token de un usuario `owner` o `super_admin`: los 4 siguen
  funcionando exactamente igual que antes (sin regresión).
- El alta por escaneo (`AltaScreen.tsx`) sigue funcionando igual para
  `staff` — publicar online, agregar variante a modelo existente, y
  subir foto del alta no se tocan ni se rompen (usan los 3 endpoints
  que quedan abiertos).
- El admin de escritorio (`ProductEditPage.tsx`) también queda sujeto
  al guard — confirmar que un `staff` ya no puede borrar una variante/
  imagen ni cambiar colecciones desde ahí tampoco (consistencia entre
  los dos lados, pedida explícitamente por el usuario).

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 3 (necesita el guard activo para que el 403 de
  colecciones sea real), Tarea 4 (variantes), Tarea 5 (fotos).
