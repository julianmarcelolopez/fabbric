# Tarea 1 — Columnas cifradas + PATCH/GET enmascarado

**Estado:** ✅ Completada (2026-07-28)
**Depende de:** T15 (shell de Configuración)

## Objetivo

Guardar de forma segura las credenciales de Mercado Pago de una org, sin exponerlas nunca completas de vuelta.

## Decisión de cifrado (cerrada)

**AES-256-GCM con el módulo `crypto` nativo de Node** — cero dependencias nuevas, mismo criterio del proyecto que "sin SDK de MP" / "sin dnd-kit" (evitar libs para algo que la plataforma ya resuelve).

- `backend/src/lib/crypto.ts`: `encrypt(plaintext: string): string` / `decrypt(ciphertext: string): string`. Formato de salida: IV (12 bytes) + auth tag (16 bytes) + ciphertext, concatenados y codificados en base64.
- Clave: `ENCRYPTION_KEY` (32 bytes en base64), **opcional** en `env.ts` — `encrypt`/`decrypt` tiran `AppError` si se llaman sin la clave configurada.

## Gap real encontrado durante la implementación (no estaba en el plan original)

El doc original decía "el PATCH en `catalogConfig/routes.ts` enmascara". Al implementar apareció que **hay 5 puntos que devuelven la fila de `catalog_configs` cruda**, no 1 — todos necesitaban el enmascarado, o el token cifrado se filtraba tal cual por el que se hubiera olvidado:

1. `GET /admin/catalog-config` — **vive en `backend/src/modules/stock/routes.ts`** (de T4), no en `catalogConfig/routes.ts` como asumía el doc original.
2. `PATCH /admin/catalog-config` (general) — en `catalogConfig/routes.ts`.
3. `POST /admin/catalog-config/logo` — en `catalogConfig/routes.ts`.
4. `POST /admin/catalog-config/banner` — en `catalogConfig/routes.ts`.
5. `PATCH /admin/catalog-config/mp-integration` (el endpoint nuevo de esta tarea).

Solución: función reusable `toAdminConfig()` en `catalogConfig/service.ts` (desencripta y enmascara `mpAccessToken`/`mpWebhookSecret`, o `null` si no hay nada), aplicada en los 5 puntos — en vez de repetir la lógica de enmascarado en cada handler.

## Pasos

- [x] `backend/src/lib/crypto.ts`: `encrypt`/`decrypt` (AES-256-GCM nativo).
- [x] `backend/src/config/env.ts`: `ENCRYPTION_KEY: z.string().optional()`.
- [x] `backend/.env.example` y `.env.local` (raíz y `backend/`): `ENCRYPTION_KEY` documentada/cargada.
- [x] `backend/src/db/schema.ts`: columnas `mpAccessToken`/`mpWebhookSecret` (text, nullable) en `catalog_configs`.
- [x] Migración `0010_catalog_config_mp_integration.sql`, aplicada a la DB real.
- [x] `packages/shared/src/schemas/catalogConfig.ts`: campos sumados a `catalogConfigSchema` (representan el valor YA enmascarado); **nuevo schema separado** `updateMpIntegrationSchema` (no se mezclaron con `updateCatalogConfigSchema`, mismo criterio que `logoUrl`/`bannerUrl` — nunca se setean por el PATCH general) — token y secret se guardan/limpian siempre juntos, no tiene sentido uno sin el otro.
- [x] `toAdminConfig()` en `catalogConfig/service.ts`, aplicada en los 5 puntos reales (ver arriba).
- [x] Endpoint nuevo `PATCH /admin/catalog-config/mp-integration`: cifra al guardar (`null` si se manda `null` → "Desconectar"), devuelve enmascarado.
- [x] Confirmado que `/public/:slug/config` (`public/routes.ts`) usa un objeto literal explícito — no un spread — así que los campos nuevos no se filtran ahí sin tener que excluirlos a mano.

## Definition of Done

- [x] `tsc --noEmit` limpio en `shared` y `backend`.
- [x] **Verificado el cifrado de verdad, no solo por lectura de código**: round-trip `encrypt`/`decrypt` con un token de prueba real (el cifrado no se parece al original, desencripta exacto, y el enmascarado final da `····9999` como se esperaba). Además se confirmó que GCM detecta manipulación del ciphertext (integridad, no solo confidencialidad) — un ciphertext corrompido tira error en vez de desencriptar cualquier cosa.
- [x] **Prueba HTTP completa contra el backend real** (login real, no simulado): `PATCH /admin/catalog-config/mp-integration` con credenciales de prueba → responde enmascarado (`····9999`/`····1234`); confirmado en la DB que lo guardado es ciphertext, no texto plano; `PATCH` con `null`/`null` ("Desconectar") limpia los dos campos correctamente. Dato de prueba revertido al cerrar.
- [x] Ruta visible en `/docs` (Swagger toma el schema solo).
