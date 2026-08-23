# Fase 2 — Scaffold de la app

**Estado: ✅ Hecha (2026-08-17)** — las 3 tareas completas.

## Objetivo (según plan.md)

Tener el proyecto React + Vite + PWA armado y **dockerizado** (mismo esquema que `backend/`/`frontend/`), con el mismo cliente de API y el mismo login que ya usa el panel admin, antes de implementar pantallas de negocio.

## Por qué está subdividida

Mismo criterio que la Fase 1: separar por tipo de riesgo/verificación, en el orden real de construcción — no se puede dockerizar un proyecto que todavía no existe, y no tiene sentido probar login/API contra un servidor suelto en el host cuando el resto del proyecto corre en Docker Compose (lección aprendida en la Fase 1: la verificación de `01-extender-backend` se rehizo porque se había levantado el backend con `npx tsx` directo en vez de `docker compose`).

## Decisiones que marcan esta fase

- **Dockerizada desde el día 1**, no como un paso aparte más adelante: `pwa/Dockerfile` replica el patrón multi-stage de `frontend/Dockerfile` (dev con hot reload + build + prod con nginx), y se agrega como servicio nuevo a `docker-compose.yml`. Confirmado con el usuario: mismo esquema de stages que `frontend/`, sin recortar el stage de producción para "más adelante".
- **Puerto 5174** para el dev server de `pwa` (4000 = backend, 5173 = frontend, ambos ya ocupados).
- **Prueba de cámara desde celular real ⇒ túnel `cloudflared`**: `getUserMedia` exige contexto seguro (HTTPS o `localhost`); un celular pegándole a `http://192.168.x.x:5174` no cumple eso y el navegador bloquea la cámara. El proyecto ya resuelve el mismo problema para el webhook de Mercado Pago con un túnel `cloudflared` (ver `backend/.env.local`, `MP_WEBHOOK_URL`) — acá se reusa el mismo mecanismo, apuntando al puerto de `pwa` en vez del de `backend`.
- **Variables de entorno compartidas con `frontend/`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` ya viven en el `.env.local` de la raíz (mismo proyecto Supabase, mismo backend) — no hace falta duplicarlas, solo que `pwa/vite.config.ts` apunte su `envDir` a la raíz, igual que ya hace `frontend/vite.config.ts`.

## Hallazgos reales al verificar en navegador (Tarea 3)

- **CORS**: el backend solo permitía `FRONTEND_URL` como origen — la PWA quedaba bloqueada. Se agregó `PWA_URL` (nueva variable de entorno, default `http://localhost:5174`) a los orígenes permitidos. Ver detalle en `03-cliente-api-y-login/README.md`.
- **`SEED_ADMIN_PASSWORD` en `backend/.env.local` está desactualizado**: ese admin real tiene Google vinculado y en la práctica se loguea así, no con la contraseña que quedó documentada. No se tocó la cuenta real; se verificó el login con un admin descartable. Si querés loguearte con tu cuenta real en la PWA, actualizá `SEED_ADMIN_PASSWORD` o usá la contraseña real que ya tenés.

## Nota aparte (no bloqueante de esta fase)

Hoy no existe ninguna pantalla de admin para invitar/crear vendedores (`admin_users` con rol `staff`) — se evaluó y se descartó explícitamente en `docs/plan_2.md`. Para probar el login de la PWA alcanza con el admin ya seedeado (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`); si el dueño quiere sumar un vendedor real más adelante, hoy eso requiere crearlo a mano (Supabase Auth + fila en `admin_users`), no hay UI todavía.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-scaffold-vite-pwa](01-scaffold-vite-pwa/README.md) — proyecto Vite+React+PWA, workspace, manifest/ícono | — | ✅ Hecha |
| 2 | [02-dockerizacion](02-dockerizacion/README.md) — `pwa/Dockerfile` (dev+prod) + servicio en `docker-compose.yml` | 1 | ✅ Hecha |
| 3 | [03-cliente-api-y-login](03-cliente-api-y-login/README.md) — `api.ts`/`supabaseClient.ts` + pantalla de Login | 2 | ✅ Hecha |

## Criterios de aceptación de la fase completa

- `npm install` desde la raíz del monorepo instala también las dependencias de `pwa/`.
- `docker compose up -d pwa` levanta la app en `http://localhost:5174` con hot reload, igual que `backend`/`frontend`.
- La app se puede instalar como PWA (manifest válido, ícono presente).
- El login autentica correctamente contra el mismo Supabase Auth que ya usa el panel admin — un usuario `admin_users` existente puede loguearse tal cual.
- Una llamada de prueba desde la PWA a un endpoint existente del backend responde 200 con el Bearer token de la sesión.

## Dependencias

- **La bloquean**: Fase 01 (`extender-backend`) — ya resuelta.
- **Bloquea**: Fases 03 a 07 — todas las pantallas de negocio se montan sobre este scaffold.
