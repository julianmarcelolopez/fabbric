# Tarea 2 — Backend: CORS dinámico por dominios propios

**Estado:** ✅ Hecha y verificada con `curl`: origin `https://eliathimodas.com`
recibe `access-control-allow-origin` en el preflight y en el GET real;
origin no registrado (`https://otrodominio.com`) no recibe el header en
ninguno de los dos casos.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T38/Fase 2)

Que la API acepte requests desde cualquier dominio propio registrado, sin
abrir un wildcard (`origin: "*"`) y sin tener que agregar manualmente cada
dominio nuevo a una variable de entorno.

## Alcance

- `backend/src/index.ts` (registro de `@fastify/cors`, hoy
  `origin: [env.FRONTEND_URL, env.PWA_URL, /\.trycloudflare\.com$/]`,
  líneas ~91-109): reemplazar el array fijo por una función `origin` que:
  - siga aceptando `FRONTEND_URL`/`PWA_URL`/la regex de dev, igual que hoy
    (cero regresión del comportamiento actual).
  - además acepte cualquier origin cuyo host matchee un `customDomain`
    registrado (Tarea 1).
- Cache en memoria de `customDomain → org` (TTL corto, ej. 60s) para que
  la función `origin` no le pegue a la DB en cada preflight — no hace
  falta invalidación activa al guardar la config, el TTL alcanza para
  este caso de uso (ver `analisis.md`, "Decisiones a resolver" #4).

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- Request con header `Origin: https://eliathimodas.com` (dominio ya
  cargado) contra el backend en Docker: el preflight lo acepta.
- Request con un origin no registrado: se sigue rechazando — ningún
  wildcard.
- `FRONTEND_URL`/`PWA_URL` siguen funcionando exactamente igual que antes
  (sin regresión).

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 4.
