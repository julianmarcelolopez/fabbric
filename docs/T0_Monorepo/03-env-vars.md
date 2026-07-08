# Tarea 3 — Variables de entorno

**Estado:** ✅ Hecha (2026-07-06)
**Depende de:** [01-repo-structure.md](01-repo-structure.md), [02-supabase-dev.md](02-supabase-dev.md)

## Objetivo

Documentar el `.env.example` (versionado, sin valores reales) y crear el `.env.local` real (no versionado) con los valores obtenidos en la tarea 2.

## Contenido de `.env.example` (raíz)

```bash
# Backend
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres   # transaction pooler (runtime)
DIRECT_URL=postgresql://db....supabase.co:5432/postgres           # conexión directa (migraciones)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...                                  # formato nuevo (ex service_role)
# JWT: no hay secreto compartido — el proyecto usa JWT Signing Keys (ES256).
# El backend verifica tokens contra ${SUPABASE_URL}/auth/v1/.well-known/jwks.json (jose/createRemoteJWKSet).
PORT=4000

# Frontend (prefijo VITE_ para que Vite las exponga al cliente)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...                          # formato nuevo (ex anon key)
VITE_API_URL=http://localhost:4000
```

Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) y Resend (`RESEND_API_KEY`) se agregan recién en T6 — no hace falta tenerlas ahora.

## Pasos

- [x] Crear `.env.example` en la raíz con el contenido de arriba (placeholders, sin valores reales)
- [x] Crear `.env.local` en la raíz (no versionado, ya cubierto por `.gitignore` de la tarea 1) con los valores reales guardados en la tarea 2
- [x] Confirmar que `DATABASE_URL` apunta a la connection pooling (transaction mode) y `DIRECT_URL` a la conexión directa — no a la misma string

## Definition of Done

- [x] `.env.example` está listo para commitear y no contiene secretos reales
- [x] `.env.local` existe localmente, tiene los valores reales, y git lo ignora (verificado con `git check-ignore`)

## Notas de ejecución (2026-07-06)

- **Ambas connection strings verificadas con una conexión real** (`select version()`): pooler y directa responden OK — Postgres 17.6.
- La password de la DB contiene `!`, se guardó URL-encodeada (`%21`) dentro de las connection strings.
- **Node.js no estaba instalado en la máquina** (prerrequisito del README que recién se pudo comprobar acá) — se instaló Node 22.23.1 LTS + npm 10.9.8 vía `winget install OpenJS.NodeJS.22`. Nota: al abrir una terminal nueva el PATH ya lo toma; en terminales ya abiertas hay que reiniciarlas.
- `SUPABASE_JWT_SECRET` no existe en este proyecto (usa JWT Signing Keys ES256) — el `.env` lleva un comentario apuntando al endpoint JWKS; ver notas de la tarea 2.
