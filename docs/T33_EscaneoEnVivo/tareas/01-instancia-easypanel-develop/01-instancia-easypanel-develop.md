# Tarea 1 — Servicio nuevo en EasyPanel apuntando a `develop`

**Estado:** ✅ Hecha (2026-09-17).

**Depende de:** nada (la rama `develop` ya existe, creada por el usuario).

## Objetivo (según `plan.md`, T33/Fase 0)

Levantar una instancia de `pwa/` separada de producción, rastreando la rama
`develop`, para poder experimentar con la cámara sin arriesgar
`fabbric.aivance.cloud` ni depender de un túnel `cloudflared` (que se caía
entre sesiones, según T23).

## Alcance

- Nuevo servicio en EasyPanel, mismo patrón ya verificado para
  `frontend`/`backend` (memoria del proyecto, sección "DEPLOYED" de T16) —
  **el gotcha de monorepo ya documentado ahí sigue aplicando igual acá**:
  - "Ruta de compilación" (tab Fuente) → `/` (raíz del repo) — **no**
    `/pwa`, porque el build necesita `packages/shared` como sibling.
  - "Archivo" (tab Compilación) → `pwa/Dockerfile` — toma el stage `prod`
    solo (es el último del archivo, sin `--target` explícito).
  - Rama a rastrear → `develop` (no `main`).
- Variables de build (`ARG`, se hornean en el bundle en tiempo de build, no
  de runtime — ver gotcha ya documentado de `VITE_API_URL`):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
  `VITE_API_URL` apunta al **backend que ya está en producción**
  (`https://frontend-fabbric-backend.ka3c6z.easypanel.host`) — esta tarea no
  toca backend, así que no hace falta un backend nuevo ni una base de datos
  aparte.
- Container port de EasyPanel (tab Dominios) → `80` (nginx, mismo valor que
  ya usa el servicio `frontend` — el gotcha de puerto ya documentado en T16
  fue específico del backend en `4000`, no debería repetirse acá, pero
  confirmar el valor igual antes de asumir que quedó bien).
- Subdominio propio para esta instancia de prueba (ej.
  `scan-test.aivance.cloud`, o el que decida el usuario al crear el
  servicio) — EasyPanel da HTTPS automático, lo que además resuelve el
  requisito de contexto seguro para `getUserMedia` sin depender de
  `cloudflared`.

## Resultado real

Servicio `fabbric-pwa2` (proyecto `frontend` en EasyPanel), rama `develop`,
repo `julianmarcelolopez/fabbric` — **no usa un subdominio propio**, sigue
el mismo patrón que producción: mismo dominio base (`fabbric-test.aivance.cloud`),
path `/stock/` (ver `pwa/nginx.conf` y `pwa/vite.config.ts`, `base:"/stock/"`
horneado en build time). URL real:
**`https://fabbric-test.aivance.cloud/stock/`** — la raíz del dominio sin
`/stock/` devuelve 404 (página propia de EasyPanel/Traefik, no es un error
de la app: ese path no está mapeado a ningún servicio).

Verificado por este lado (sin browser, por `curl`):
- `GET /stock/` → 200, HTML correcto (`<title>Eliathi Modas — Stock</title>`,
  referencias a `/stock/assets/...`).
- El bundle JS horneado apunta a
  `https://frontend-fabbric-backend.ka3c6z.easypanel.host` (el backend real
  de producción) — confirma que `VITE_API_URL` quedó bien seteado en el
  build, sin backend nuevo de por medio.

## Criterio de aceptación

✅ Cumplido — el servicio buildeó sin error y sirve el bundle correcto en
`https://fabbric-test.aivance.cloud/stock/`, apuntando al backend real.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
