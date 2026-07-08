# Tarea 2 — Proyecto Supabase de desarrollo

**Estado:** ✅ Hecha (2026-07-06)
**Depende de:** —

## Objetivo

Tener un proyecto Supabase de desarrollo (`fabbric-dev`) con todo lo que las tareas siguientes van a necesitar: credenciales de API, connection strings, JWT secret, login con Google habilitado, y el bucket de imágenes creado.

## Pasos

- [x] Crear proyecto nuevo en https://supabase.com/dashboard (ej. `fabbric-dev`)
- [x] Guardar de **Project Settings → API**: `Project URL`, `anon public key`, `service_role key`
- [x] Guardar de **Project Settings → Database**: **dos** connection strings distintas (ver "Por qué dos strings" abajo):
  - Connection pooling **Transaction mode** → para el runtime del backend
  - Connection **directa** (o Session mode) → para correr migraciones
- [x] ~~Guardar `JWT Secret`~~ → no aplica, ver notas: el proyecto usa JWT Signing Keys (ES256) + JWKS
- [ ] Habilitar proveedor **Google** en **Authentication → Providers** → **diferido a T1** (no bloquea T0)
- [x] Crear bucket de Storage `product-images` (público para lectura)

## Por qué dos connection strings

`drizzle-kit push`/las migraciones necesitan una conexión directa (o session pooler); si se les da la transaction pooler que usa el runtime, las migraciones fallan o el pool de conexiones se agota bajo carga. Es la causa más común de que esta fase se trabe — guardar ambas strings por separado ahora evita el problema en la tarea 4.

## Definition of Done

- [x] Los valores necesarios (URL, publishable key, secret key, 2 connection strings) están guardados fuera del repo — **no** se commitean todavía, eso es la tarea 3
- [x] ~~Proveedor Google habilitado~~ → diferido a T1 por decisión explícita (no bloquea T0)
- [x] El bucket `product-images` existe y es público para lectura (verificado vía API de Storage: `"public": true`)

## Notas de ejecución (2026-07-06)

- **Proyecto**: ref `uhnitagtprwhwpqjwdph`, región `us-west-2` (Oregon). Para el proyecto de **producción** elegir una región más cercana a los usuarios (ej. São Paulo).
- **Claves en formato nuevo**: el proyecto entrega `sb_publishable_...` (reemplaza `anon`) y `sb_secret_...` (reemplaza `service_role`). Se usan las nuevas; las legacy JWT existen pero no se guardan.
- **JWT**: el proyecto usa **JWT Signing Keys asimétricas (ES256)**, no hay secreto compartido HS256. El backend verificará tokens contra `https://uhnitagtprwhwpqjwdph.supabase.co/auth/v1/.well-known/jwks.json` (librería `jose`, `createRemoteJWKSet`). `SUPABASE_JWT_SECRET` se eliminó del `.env` — ver tarea 3 actualizada.
- **Google OAuth**: diferido al inicio de T1 — requiere credenciales de Google Cloud Console y no bloquea nada de T0.
- **Seguridad**: la secret key y el service_role JWT se pegaron en el chat de esta sesión — aceptable para dev, pero **rotar las claves** antes de que el proyecto tenga datos reales.
- Connection strings: directa `db.uhnitagtprwhwpqjwdph.supabase.co:5432`, pooler `aws-1-us-west-2.pooler.supabase.com:6543` (user `postgres.uhnitagtprwhwpqjwdph`).
