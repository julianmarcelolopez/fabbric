# T0 — Monorepo (Fase 0 de docs/plan.md)

## Por qué arrancamos por acá

**Monorepo como arquitectura** (ya decidido en `docs/plan.md` § Decisiones de stack): `packages/shared` va a tener los schemas Zod que backend y frontend comparten sin duplicar — eso es simple con workspaces y forzado con repos separados (versionado, publicación de paquete) sin necesidad real a esta escala.

**Por qué esta es la primera tarea de las 10 fases:**
- Es la única sin decisiones de negocio (nada de roles, tablas de dominio, reglas de estado). Bajo riesgo, bajo costo de cambiar de opinión después.
- Fija convenciones de rutas que todas las fases siguientes ya asumen por nombre de archivo (`backend/src/db/schema.ts`, `backend/src/plugins/auth.ts`, etc., ver "Archivos críticos" de `docs/plan.md`).
- Es barata de verificar (`docker compose up` + `curl /health`) — confirma que toda la cadena de herramientas (Node, TypeScript, Fastify, Drizzle, Postgres de Supabase, Vite, React) encastra antes de invertir en lógica de negocio sobre una base rota.

## Alcance de esta tarea

Incluye: proyecto Supabase de dev, estructura del monorepo, esqueleto Fastify con `GET /health`, esqueleto Vite+React, Docker de desarrollo.

**No incluye** (pertenece a T1 — Multi-tenancy + Auth admin):
- Lógica de auth real (login, JWT, roles). `db/schema.ts` arranca **solo** con las tablas `organizations` y `admin_users` como esqueleto — se crean y se migran acá para poder verificar `drizzle-kit push`, pero los endpoints de login, el plugin `auth.ts` (`requireAdminAuth`/`requireCustomerAuth`), y el alta de una organización real son trabajo de T1.
- Cualquier otra tabla de negocio (catálogo, stock, pedidos, finanzas) — se agregan fase por fase.

## Cómo trabajamos esta carpeta

Cada tarea es un archivo propio, con su objetivo, pasos, Definition of Done y estado. Se ejecutan **en orden** (algunas dependen de la anterior), una por turno de conversación: abrimos el archivo, la hacemos, marcamos su estado acá abajo y en el propio archivo, y recién ahí pasamos a la siguiente.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-repo-structure.md](01-repo-structure.md) — Estructura base del monorepo | — | ✅ Hecha |
| 2 | [02-supabase-dev.md](02-supabase-dev.md) — Proyecto Supabase de desarrollo | — | ✅ Hecha |
| 3 | [03-env-vars.md](03-env-vars.md) — Variables de entorno | 1, 2 | ✅ Hecha |
| 4 | [04-backend-skeleton.md](04-backend-skeleton.md) — Esqueleto Fastify | 1, 3 | ✅ Hecha |
| 5 | [05-frontend-skeleton.md](05-frontend-skeleton.md) — Esqueleto Vite + React | 1, 3 | ✅ Hecha |
| 6 | [06-docker.md](06-docker.md) — Docker de desarrollo | 4, 5 | ✅ Hecha |
| 7 | [07-verificacion-final.md](07-verificacion-final.md) — Definition of Done de T0 | 1-6 | ✅ Hecha (commit diferido) |

Tareas 1 y 2 no dependen entre sí — se pueden hacer en cualquier orden o en paralelo. Igual con 4 y 5 una vez cerrada la 3.

## Decisiones globales ya tomadas acá

- **Node 22** (no 20): alineado con lo ya validado en producción por `bordart-admin` (`node:22-alpine`), aunque `docs/starter.md` original solo pedía 20+.
- **CORS en dev**: el backend (Fastify, puerto 4000) necesita `@fastify/cors` permitiendo `http://localhost:5173` explícitamente — no estaba en `docs/starter.md` original, se agrega en la tarea 4.
- **Dos connection strings de Supabase, no una**: pooler (transacción) para runtime, directa para migraciones — detalle en la tarea 1 y 3.

## Próximo paso

Al cerrar las 7 tareas: **T1 — Multi-tenancy + Auth admin** (`docs/plan.md`, Fase 1).
