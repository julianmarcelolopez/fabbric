# Tarea 6 — Docker de desarrollo

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [04-backend-skeleton.md](04-backend-skeleton.md), [05-frontend-skeleton.md](05-frontend-skeleton.md)

## Objetivo

Levantar backend y frontend con Docker Compose en modo desarrollo, con hot reload, como alternativa a correrlos con `npm run dev` local.

## Pasos

- [x] `backend/Dockerfile` (stage `dev`: `node:22-alpine`, `npm install --workspace`, `CMD ["npx", "tsx", "watch", "src/index.ts"]`)
- [x] `frontend/Dockerfile` (stage `dev`: `node:22-alpine`, `npm install --workspace`, `CMD ["npm", "run", "dev", "--", "--host"]`)
- [x] `docker-compose.yml` en la raíz con los dos servicios, `env_file: .env.local`, volúmenes montados para hot reload
- [x] Docker Desktop con backend WSL2 confirmado (`docker info` → "Docker Desktop")

## Definition of Done

- [x] `docker compose up --build` levanta ambos servicios sin error
- [x] `curl http://localhost:4000/health` responde `{ ok: true }` con los contenedores corriendo
- [x] `http://localhost:5173` responde HTTP 200 sirviendo el HTML de fabbric (verificado por `<title>fabbric</title>` — ver nota sobre el falso positivo)
- [x] Editar un archivo dispara hot reload en ambos contenedores: backend verificado por log `[tsx] change in ./src/index.ts Restarting...`, frontend verificado pidiendo el módulo al dev server y viendo el contenido nuevo

## Notas de ejecución (2026-07-07)

- **Contexto de build = raíz del monorepo** (no cada subcarpeta): npm workspaces necesita el `package.json` raíz para resolver dependencias hoisted. Cada Dockerfile copia el `package.json` raíz + el del workspace y corre `npm install --workspace`.
- **Volúmenes**: bind mount `.:/app` para hot reload + volúmenes anónimos sobre `node_modules` (raíz y por-workspace) para que los del contenedor no se pisen con los de Windows.
- **Hot reload en Windows requirió polling**: los bind mounts Windows→WSL2 no propagan eventos de archivos, así que los watchers (tsx, Vite/chokidar) no se disparaban. Solución: `CHOKIDAR_USEPOLLING=1` + `CHOKIDAR_INTERVAL=1000` como `environment` de ambos servicios en el compose. Sin esto los contenedores corren pero hay que reiniciarlos a mano en cada cambio.
- **Falso positivo a tener en cuenta**: en la primera verificación, el puerto 5173 respondía 200 pero era **otro proyecto** (`finance-home-web`) que lo tenía ocupado — los contenedores de fabbric estaban caídos (SIGTERM por suspensión de la máquina durante la noche). Moraleja: verificar siempre que la respuesta sea del servicio esperado (título del HTML, no solo el status code) y chequear `docker ps` de qué contenedor publica el puerto.
- Se agregó `.dockerignore` en la raíz (node_modules, dist, .git, .env*, docs).
