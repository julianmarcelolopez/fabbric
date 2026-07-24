# Tarea 1 — Columnas cifradas + PATCH/GET enmascarado

**Estado:** ⬜ Pendiente
**Depende de:** T15 (shell de Configuración)

## Objetivo

Guardar de forma segura las credenciales de Mercado Pago de una org, sin exponerlas nunca completas de vuelta.

## Pasos

- [ ] Definir el mecanismo de cifrado en reposo para estas dos columnas (revisar qué ya usa el proyecto o si hay que sumar una dependencia mínima) antes de escribir el resto de la tarea.
- [ ] `backend/src/db/schema.ts`: columnas nuevas y nullable en `catalog_configs` — `mpAccessToken` (text, cifrado), `mpWebhookSecret` (text, cifrado).
- [ ] Migración: `db:generate -- --name catalog_config_mp_integration` + `db:migrate`.
- [ ] `packages/shared/src/schemas/catalogConfig.ts`: sumar ambos campos al schema de actualización — **solo** en el schema de admin, nunca en el público.
- [ ] `backend/src/modules/catalogConfig/routes.ts`: PATCH para guardar (cifrando antes de persistir); el GET admin devuelve el token **enmascarado** (ej. `····3421`, últimos 4 caracteres) en vez del valor real, una vez guardado.
- [ ] Confirmar que `backend/src/modules/public/routes.ts` (`/public/:slug/config`) **nunca** incluye estos campos, ni enmascarados.

## Definition of Done

- [ ] `tsc --noEmit` limpio en `shared` y `backend`.
- [ ] Prueba manual: guardar un token de prueba, confirmar que el GET admin lo devuelve enmascarado (no el valor real) y que el GET público no lo incluye en absoluto.
- [ ] Ruta visible en `/docs`.
