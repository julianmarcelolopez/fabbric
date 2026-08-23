# Tarea 2 — Dockerización de la PWA

**Estado:** ✅ Hecha (2026-08-17)
**Depende de:** Tarea 1 (`01-scaffold-vite-pwa`)

## Objetivo

Que `pwa/` corra en Docker Compose igual que `backend/` y `frontend/` — mismo esquema de stages (dev + build + prod), mismo patrón de bind mount para hot reload. Confirmado con el usuario: mismo esquema de `frontend/Dockerfile`, sin recortar el stage de producción.

## Pasos

- [x] `pwa/Dockerfile`, calcado de `frontend/Dockerfile`:
  - [x] Stage `dev`: `FROM node:22-alpine`, contexto de build = raíz del monorepo, `COPY package.json package-lock.json` + `COPY pwa/package.json ./pwa/`, `npm install --workspace @fabbric/pwa --no-audit --no-fund`, `EXPOSE 5174`, `CMD ["npm", "run", "dev", "--", "--host"]`.
  - [x] Stage `build`: instala también `@fabbric/shared` (`pwa/package.json` ya lo declara), copia el código, hornea `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_API_URL` como `ARG`/`ENV` antes de `npm run build`.
  - [x] Stage `prod`: `nginx:alpine` sirviendo `pwa/dist`, mismo `try_files $uri /index.html`.
  - [x] **Stage `prod` construido y corrido de verdad** (`docker build --target prod` + `docker run`, no solo escrito) — encontró un problema real: nginx no tiene `.webmanifest` en su tabla de `mime.types` por default y lo servía como `application/octet-stream` en vez de `application/manifest+json`. Corregido con un `location ~* \.webmanifest$ { add_header Content-Type application/manifest+json; }` en la config de nginx. `sw.js` sí se sirve bien con el default de nginx (`.js` → `application/javascript`), no necesitó ajuste.
- [x] Servicio `pwa` agregado a `docker-compose.yml` (mismo patrón que `frontend`): `target: dev`, `env_file: .env.local`, `CHOKIDAR_USEPOLLING`/`CHOKIDAR_INTERVAL`, puerto `"5174:5174"`, volúmenes (`.:/app`, `/app/node_modules`, `/app/pwa/node_modules`), `depends_on: [backend]`.
- [x] Túnel `cloudflared` documentado y **probado end-to-end** (ver sección abajo) — encontró y resolvió un problema real, no solo documentación.

## Cómo probar la cámara desde un celular real

`getUserMedia` requiere contexto seguro (HTTPS o `localhost`). Un celular pegándole a `http://<ip-de-la-compu>:5174` no cumple eso — hace falta HTTPS. Igual que ya se hace para el webhook de MP (`backend/.env.local`, `MP_WEBHOOK_URL`, túnel `cloudflared`), acá se levanta un túnel apuntando al puerto de la PWA:

```
cloudflared tunnel --url http://localhost:5174
```

La URL pública que devuelve (`https://algo.trycloudflare.com`) es la que se abre desde el celular para probar el escaneo real. Cambia en cada sesión de túnel — no hace falta guardarla en ningún `.env`, es solo para pruebas manuales.

**Hallazgo real al probarlo** (no estaba anticipado): Vite bloquea por default (403 "Blocked request") las requests que llegan con un `Host` que no reconoce — protección contra DNS rebinding. El túnel manda `Host: algo.trycloudflare.com`, no `localhost`, así que sin ajustar nada la app queda inalcanzable desde el celular aunque el túnel esté arriba y respondiendo. Solución aplicada en `pwa/vite.config.ts`:

```ts
server: {
  port: 5174,
  allowedHosts: [".trycloudflare.com"],
}
```

Verificado con un túnel real: 403 antes del cambio, 200 después, sirviendo el HTML de la app.

## Definition of Done

- [x] `docker compose up -d pwa` levanta el contenedor sin errores (`docker compose logs pwa`: `VITE ready`).
- [x] `http://localhost:5174` responde 200 desde el host; hot reload confirmado editando `pwa/src/App.tsx` y viendo el cambio reflejado en el contenedor (bind mount funcionando).
- [x] `docker compose exec pwa npx tsc --noEmit` limpio.
- [x] Túnel `cloudflared` hacia `:5174` probado de punta a punta: 403 inicial por `allowedHosts`, corregido, 200 final confirmado contra la URL pública real (`https://possibly-trucks-boxing-assure.trycloudflare.com`). Túnel cerrado al terminar la verificación.
- [x] Stage `prod` construido (`docker build --target prod`) y corrido en un contenedor aparte: `index.html`, `manifest.webmanifest` (con el `Content-Type` correcto tras el fix), `sw.js` e íconos, todos 200; ruta SPA inexistente cae a `index.html` (200), confirmando el fallback de nginx. Contenedor e imagen de prueba borrados al terminar.
- [x] Los 3 servicios (`backend`, `frontend`, `pwa`) levantados juntos con `docker compose up -d` sin conflicto de puertos ni de red — los tres responden 200 en simultáneo.

## Dependencias

- **La bloquean**: Tarea 1 (`01-scaffold-vite-pwa`).
- **Bloquea**: Tarea 3 (`03-cliente-api-y-login`) — se prueba contra el servidor dockerizado, no uno suelto en el host.
