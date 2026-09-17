# Tarea 1 — Servicio nuevo en EasyPanel apuntando a `develop`

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

El servicio nuevo builda sin error y sirve algo en
`https://<subdominio-de-prueba>` — no hace falta que funcione todavía
(eso lo confirma la Tarea 2), solo que el deploy en sí termine OK.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
