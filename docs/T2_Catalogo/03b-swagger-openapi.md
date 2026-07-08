# Tarea 3b (extra) — Swagger/OpenAPI para toda la API

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [03-productos-variantes.md](03-productos-variantes.md)
**Origen:** pedido del usuario al cerrar la tarea 3 ("¿tenemos swagger de todos los servicios?") — no estaba en el plan original de la fase.

## Objetivo

Documentación OpenAPI viva de todos los endpoints, generada desde los mismos schemas Zod de `@fabbric/shared` que ya validaban los requests — una sola fuente de verdad para validación, tipos y docs.

## Qué se hizo

- [x] Dependencias: `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod`
- [x] `index.ts`: `validatorCompiler`/`serializerCompiler` de Zod + registro de swagger (`transform: jsonSchemaTransform`) + UI en **`/docs`** (spec JSON en `/docs/json`); security scheme `bearerAuth` declarado
- [x] Refactor de los 6 módulos de rutas (admin, superadmin, categories, collections, products, variants): cada ruta declara `schema` con `tags`, `summary`, `security`, y `body`/`params` desde los Zod compartidos. Los handlers ya no hacen `schema.parse(...)` a mano — Fastify valida en la capa de ruta y `request.body`/`params` llegan tipados (`withTypeProvider<ZodTypeProvider>`).
- [x] Error handler extendido: los errores de validación de ruta (`hasZodFastifySchemaValidationErrors`) responden el mismo formato `{ error: { code: "validation", issues } }` que antes — sin cambio de contrato.

## Verificación

- [x] `GET /docs/json` → OpenAPI 3 con las **13 rutas** existentes documentadas (bodies y params tipados)
- [x] `GET /docs` → Swagger UI navegable (HTTP 200)
- [x] **Sin regresiones**: las suites completas de las tareas 2 y 3 (33 checks) pasan idénticas contra el backend refactorizado
- [x] `tsc --noEmit` limpio

## Regla para las fases siguientes

**Toda ruta nueva nace con `schema` declarado** (tags, summary, security, body/params desde `@fabbric/shared`). Una ruta sin schema no aparece bien en `/docs` y no valida en la capa de ruta — se considera incompleta.
