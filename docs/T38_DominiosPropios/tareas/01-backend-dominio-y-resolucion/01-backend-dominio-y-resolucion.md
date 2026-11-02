# Tarea 1 — Backend: `customDomain` + resolución por host

**Estado:** ✅ Hecha y verificada contra la DB real (migración `0028_t38_custom_domain.sql`
aplicada, `eliathimodas.com` cargado para `eliathi-modas`, endpoint
probado con `curl`).

**Nota de diseño respecto al plan original**: el endpoint termina siendo
más simple de lo previsto — devuelve solo `{ slug }`, no el shape
completo de `/public/:slug/config`. El frontend reusa el slug resuelto
para pedir todo lo demás exactamente como ya lo hacía (`/public/:slug/config`,
`/public/:slug/home`, etc.) — cero duplicación de esa lógica.

**Depende de:** nada.

## Objetivo (según `plan.md`, T38/Fase 1)

Que el backend sepa, a partir de un hostname, a qué tienda/org
corresponde — base para que el frontend pueda montar las rutas de la
tienda en `/` cuando el visitante entra por un dominio propio.

## Alcance

- Migración nueva: `catalog_configs` suma `custom_domain` (text, nullable,
  único) — mismo patrón que la columna `slug` ya existente
  (`backend/src/db/schema.ts:460`, "único GLOBAL").
- `packages/shared`: sumar `customDomain` al schema de lectura de
  `catalogConfig` correspondiente. La escritura queda fuera de
  `updateCatalogConfigSchema` por ahora (alta manual vía SQL, no hay UI de
  autoservicio en T38 — ver `analisis.md`, "Decisiones a resolver" #5).
- Nuevo endpoint público `GET /public/stores/by-domain?host=<hostname>`
  (nuevo handler, mismo criterio que el lookup por slug ya existente en
  `backend/src/modules/catalogConfig/service.ts:17`,
  `eq(catalogConfigs.slug, slug)`):
  - Normaliza el host recibido (decidir: sacar el prefijo `www.` antes de
    comparar, o guardar ambas variantes — `eliathimodas.com` y
    `www.eliathimodas.com` — en la misma fila/columna).
  - Devuelve el mismo shape que `GET /public/:slug/config` (o un subconjunto
    que incluya al menos el `slug`, para que el frontend pueda resolver el
    resto de las llamadas existentes con el slug de siempre).
  - 404 si no hay ninguna tienda con ese dominio.

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- Migración aplicada contra la DB real (mismo flujo que otras migraciones
  del proyecto: `npm run db:generate` + `db:migrate` desde `backend/`).
- Con el dominio cargado a mano en la DB, `curl` contra el backend en
  Docker con `?host=eliathimodas.com` devuelve la tienda correcta.
- Con un host no registrado, devuelve 404.
- `www.eliathimodas.com` y `eliathimodas.com` resuelven a la misma tienda.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2, Tarea 3.
