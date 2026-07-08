# Starter — cómo arrancamos (Fase 0)

Paso a paso para dejar el monorepo funcionando antes de escribir la primera línea de lógica de negocio. Ver `docs/plan.md` para el diseño completo (modelo de datos, API, fases siguientes).

## 0. Prerrequisitos

- [ ] Node.js 20+ instalado (`node -v`)
- [ ] Docker Desktop instalado y corriendo (`docker --version`)
- [ ] Cuenta de Supabase creada
- [ ] Cuenta de Mercado Pago developers (para credenciales de test, se usa recién en Fase 6 — no bloquea el arranque)

## 1. Crear el proyecto Supabase de desarrollo

- [ ] Crear un proyecto nuevo en https://supabase.com/dashboard (ej. `fabbric-dev`)
- [ ] Guardar de **Project Settings → API**: `Project URL`, `anon public key`, `service_role key`
- [ ] Guardar de **Project Settings → Data API / Database**: `Connection string` (Postgres, modo *transaction pooler* para el backend)
- [ ] Guardar de **Project Settings → API → JWT Settings**: `JWT Secret`
- [ ] Habilitar el proveedor **Google** en **Authentication → Providers** (necesario para login del portal cliente y opcional para el admin) — requiere crear credenciales OAuth en Google Cloud Console y pegar `Client ID` / `Client Secret` acá
- [ ] Crear un bucket de Storage llamado `product-images` (público para lectura)

## 2. Estructura base del repo

- [ ] `git init` en `C:\projects\fabbric`
- [ ] Crear `package.json` raíz con workspaces:
  ```json
  {
    "name": "fabbric",
    "private": true,
    "workspaces": ["frontend", "backend", "packages/*"]
  }
  ```
- [ ] Crear carpetas: `backend/`, `frontend/`, `packages/shared/`
- [ ] `.gitignore` (node_modules, dist, .env, .env.local)
- [ ] `.env.example` en la raíz con las variables de Fase 0-1 (ver sección 5)

## 3. Backend — esqueleto Fastify

- [ ] `backend/package.json`: dependencias `fastify`, `@fastify/multipart`, `zod`, `drizzle-orm`, `postgres`, `drizzle-kit`, `tsx`, `typescript`
- [ ] `backend/tsconfig.json`
- [ ] `backend/src/config/env.ts` — valida env vars con zod al bootear (falla rápido si falta algo)
- [ ] `backend/src/db/client.ts` — cliente `postgres-js` + `drizzle()` apuntando a la connection string de Supabase
- [ ] `backend/src/db/schema.ts` — arrancar solo con `organizations` y `admin_users` (el resto de tablas se agregan fase por fase, no todas de una)
- [ ] `backend/drizzle.config.ts` — apunta a `db/schema.ts` y a `db/migrations/`
- [ ] `backend/src/index.ts` — bootea Fastify, registra plugin de health check
- [ ] Ruta `GET /health` → `{ ok: true }`
- [ ] `npm run dev` (script `tsx watch src/index.ts`) levanta sin errores en `localhost:4000`

## 4. Frontend — esqueleto Vite + React

- [ ] `npm create vite@latest frontend -- --template react-ts` (o crear a mano si preferís controlar la versión)
- [ ] Instalar `react-router-dom`, `@supabase/supabase-js`
- [ ] `frontend/src/lib/supabaseClient.ts` — cliente Supabase con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [ ] `frontend/src/router.tsx` — esqueleto de rutas vacío (`/admin`, `/store/:slug`, `/portal` — solo placeholders por ahora)
- [ ] `npm run dev` levanta en `localhost:5173`

## 5. Variables de entorno (`.env.example` en la raíz)

```bash
# Backend
DATABASE_URL=postgresql://...supabase.co:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
PORT=4000

# Frontend (prefijo VITE_ para que Vite las exponga al cliente)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:4000
```

Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) y Resend (`RESEND_API_KEY`) se agregan recién en Fase 6 — no hace falta tenerlas ahora.

## 6. Docker (desarrollo local)

- [ ] `backend/Dockerfile` (stage `dev`: `node:20-alpine`, copia código, `npm install`, `CMD ["npx", "tsx", "watch", "src/index.ts"]`)
- [ ] `frontend/Dockerfile` (stage `dev`: `node:20-alpine`, `npm install`, `CMD ["npm", "run", "dev", "--", "--host"]`)
- [ ] `docker-compose.yml` en la raíz con los dos servicios, `env_file: .env`, volúmenes montados para hot reload
- [ ] `docker compose up --build` levanta ambos servicios sin error

## 7. Criterio de "Fase 0 terminada"

- [ ] `curl http://localhost:4000/health` devuelve `{ ok: true }` (corriendo con Docker o con `npm run dev` local, cualquiera de los dos)
- [ ] `http://localhost:5173` carga en el navegador sin errores de consola
- [ ] `npx drizzle-kit push` (desde `backend/`) crea las tablas `organizations` y `admin_users` en el proyecto Supabase de dev — verificable en el Table Editor de Supabase o con `drizzle-kit studio`

Cuando esto esté verde, seguimos con **Fase 1** (`docs/plan.md`): multi-tenancy real + login del admin (email/password y Google).
