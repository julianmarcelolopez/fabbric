# Tarea 3 — Plugin de auth del backend (JWKS + `requireAdminAuth`)

**Estado:** ✅ Hecha (2026-07-07) — DoD completo; el caso 200 se cerró en la tarea 4 con el owner del seed
**Depende de:** [02-shared-package.md](02-shared-package.md)

## Objetivo

El corazón de la fase: `backend/src/plugins/auth.ts`, que valida el JWT de Supabase en cada request protegida y resuelve el principal contra `admin_users`, dejando `orgId` y `role` disponibles para el resto del código. Es uno de los "archivos críticos" listados en `docs/plan.md`.

## Pasos

- [x] Agregar dependencia `jose` al backend (+ `fastify-plugin` para que los decorators del plugin lleguen a las rutas)
- [x] `backend/src/plugins/auth.ts`:
  - `createRemoteJWKSet(new URL(env.SUPABASE_URL + "/auth/v1/.well-known/jwks.json"))` — creado una sola vez (cachea las claves solo)
  - `jwtVerify` del header `Authorization: Bearer <token>` con `issuer: env.SUPABASE_URL + "/auth/v1"` y `audience: "authenticated"`
  - Con el `sub` del token, buscar la fila en `admin_users`; si no existe → 403 (usuario autenticado pero no es admin)
  - Token ausente/inválido/vencido → 401
  - Decorar `request.adminUser = { id, orgId, role, email }`
  - Exponer `requireAdminAuth` (acepta `super_admin`/`owner`/`staff`) y `requireSuperAdmin` (solo `super_admin`) como hooks/decorators aplicables por grupo de rutas
- [x] `backend/src/lib/tenant.ts` — helper `requireOrgId(request)` que tira 403 si un super_admin (orgId null) intenta operar por rutas de tenant (regla del plan: ningún query de negocio sin `WHERE org_id`)
- [x] `backend/src/lib/errors.ts` — `AppError` base + `UnauthorizedError`/`ForbiddenError`, con `setErrorHandler` en `index.ts` que responde `{ error: { code, message } }` consistente
- [x] Ruta de prueba protegida: `GET /admin/me` → devuelve el `adminUser` resuelto (email, role, orgId)

## Definition of Done

- [x] `GET /admin/me` sin token → 401 `{"error":{"code":"unauthorized","message":"Falta el token Bearer"}}`
- [x] `GET /admin/me` con token basura → 401 `{"error":{"code":"unauthorized","message":"Token inválido o vencido"}}`
- [x] `GET /admin/me` con token válido de un usuario que **no** está en `admin_users` → 403 — probado con un usuario temporal real de Supabase Auth (creado por Admin API, logueado por password grant, borrado después). Esto prueba de paso que la verificación JWKS/ES256 funciona con tokens reales del proyecto.
- [x] `GET /admin/me` con token válido de un admin → 200 — verificado en la tarea 4 con el owner del seed (`role=owner`, `orgId` de la org demo)
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-07)

- **Reconstruir la imagen no alcanza cuando cambian dependencias**: compose reutiliza los volúmenes anónimos de `node_modules` del contenedor anterior. Hace falta `docker compose up -d --renew-anon-volumes <servicio>` después de un build con deps nuevas — anotado porque va a volver a pasar en cada fase.
- **La Auth API de Supabase rechaza la secret key si el User-Agent parece un navegador** ("Forbidden use of secret API key in browser") — los tests de API con claves secretas se hacen con Node/fetch, no con `Invoke-RestMethod` de PowerShell.
- El tipo `AdminRole` del plugin viene de `@fabbric/shared` — primer uso real del paquete compartido en el backend.

## Notas

- Para probar el DoD hace falta al menos un usuario en Supabase Auth y una fila en `admin_users` — eso lo crea el seed de la tarea 4; los dos primeros casos (401) se pueden probar antes.
- El JWKS endpoint es público; no requiere la service key. La service key se usa recién en la tarea 4 (Admin API para crear usuarios).
- Verificar `issuer` y `audience`, no solo la firma — un token de otro proyecto Supabase con la misma librería no debe pasar.
