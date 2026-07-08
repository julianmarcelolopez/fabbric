# Tarea 4 — Esqueleto Fastify (backend)

**Estado:** ✅ Hecha (2026-07-06)
**Depende de:** [01-repo-structure.md](01-repo-structure.md), [03-env-vars.md](03-env-vars.md)

## Objetivo

Backend Fastify que bootea, valida sus env vars, se conecta a Postgres vía Drizzle, y expone `GET /health`. Incluye crear (no implementar auth sobre) las tablas `organizations` y `admin_users` como esqueleto de schema.

## Pasos

- [x] `backend/package.json` con dependencias: `fastify`, `@fastify/multipart`, `@fastify/cors`, `zod`, `drizzle-orm`, `postgres`, `drizzle-kit`, `tsx`, `typescript` (+ `dotenv` para cargar `.env.local` de la raíz)
- [x] `backend/tsconfig.json`
- [x] `backend/src/config/env.ts` — valida env vars con Zod al bootear (falla rápido si falta algo)
- [x] `backend/src/db/client.ts` — cliente `postgres-js` + `drizzle()` apuntando a `DATABASE_URL` (pooler), con `prepare: false` (requerido por PgBouncer en transaction mode)
- [x] `backend/src/db/schema.ts` — arranca solo con `organizations` y `admin_users` (el resto de tablas se agregan fase por fase)
- [x] `backend/drizzle.config.ts` — apunta a `db/schema.ts` y `db/migrations/`, usando `DIRECT_URL` para migraciones
- [x] `backend/src/index.ts` — bootea Fastify, registra `@fastify/cors` (permitiendo `http://localhost:5173` en dev) y el plugin de health check
- [x] Ruta `GET /health` → `{ ok: true }`
- [x] Script `dev`: `tsx watch src/index.ts`

## Nota para fases futuras (no es parte de esta tarea)

Cuando en T2 se implemente subida de imágenes, recordar configurar el límite de tamaño de `@fastify/multipart` (`bordart-admin` usa `bodySizeLimit: "10mb"` en Next.js para su equivalente) — si no se configura, los uploads grandes se rechazan silenciosamente más adelante.

## Definition of Done

- [x] `npm run dev` (desde `backend/`) levanta sin errores en `localhost:4000`
- [x] `curl http://localhost:4000/health` devuelve `{ ok: true }`
- [x] `npx drizzle-kit push` (desde `backend/`) crea las tablas `organizations` y `admin_users` en Supabase — verificado vía `information_schema`: ambas tablas con 5 columnas + enum `admin_role` (`super_admin`, `owner`, `staff`)
- [x] Arrancar el backend sin `.env.local` falla rápido con error claro (verificado: exit 1 listando `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` como faltantes)

## Notas de ejecución (2026-07-06)

- ESM (`"type": "module"`) + TypeScript `NodeNext` — los imports relativos llevan extensión `.js`.
- `env.ts` carga `.env.local` de la raíz del monorepo vía `dotenv` con path resuelto desde el propio archivo (funciona sin importar el cwd); en Docker el archivo no existe y las vars llegan por `env_file` sin que el load falle.
- `db:push`, `db:generate`, `db:migrate`, `db:studio` quedaron como scripts npm del backend.
- Typecheck (`tsc --noEmit`) pasa limpio.
