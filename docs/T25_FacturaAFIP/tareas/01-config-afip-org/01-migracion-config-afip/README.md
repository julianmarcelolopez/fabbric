# Tarea 1 — Migración: config AFIP en `catalogConfigs`

**Estado:** ✅ Hecha (2026-08-25) — migración `0020_panoramic_the_professor.sql`, verificación `t25-01-afip-config.mjs` 12/12 PASS

**Depende de:** Fase 0 (prerrequisitos externos)

## Objetivo

Agregar a `catalogConfigs` los campos necesarios para facturar en nombre de una organización, cifrados igual que `mpAccessToken`/`mpWebhookSecret` (ver `backend/src/db/schema.ts` y `backend/src/lib/crypto.ts`).

## Pasos

- [x] En `backend/src/db/schema.ts`, agregado a `catalogConfigs`: `afipCuit` (text), `afipPuntoVenta` (integer), `afipAmbiente` (`pgEnum` nuevo `afip_ambiente`: `homologacion`/`produccion`), `afipCertificado`/`afipClavePrivada`/`afipAccessToken` (text, cifrados) — los 6 nullable.
- [x] Cifrado con el mismo `encrypt()`/`decrypt()` de `lib/crypto.ts` (AES-256-GCM) — nunca en texto plano.
- [x] **No** se agregaron a `updateCatalogConfigSchema` — se cargan por su propio endpoint, `PATCH /admin/catalog-config/afip-integration` (`updateAfipIntegrationSchema` en `packages/shared`), mismo patrón que `mp-integration`.
- [x] Migración generada y aplicada: `supabase/migrations/0020_panoramic_the_professor.sql` — 1 enum nuevo + 6 columnas nullable, sin tocar filas existentes.
- [x] Config de Eliathi cargada con el certificado de homologación de la Fase 0 (CUIT `20304556006`, ambiente `homologacion`; `afipPuntoVenta` queda `null` — todavía no se gestionó, ver `overview.md` decisión #8) — carga manual directa por SQL con el mismo cifrado del endpoint, para no depender de una contraseña real de admin. Verificado que los 3 valores cifrados desencriptan exactamente igual al contenido original de los archivos.

## Cómo se implementó

- `toAdminConfig` (`catalogConfig/service.ts`) se extendió para enmascarar también `afipCertificado`/`afipClavePrivada`/`afipAccessToken`, igual que ya hacía con los de Mercado Pago — ningún endpoint devuelve estos valores en texto plano.
- El endpoint `PATCH /admin/catalog-config/afip-integration` sigue el mismo esqueleto que `mp-integration`: recibe los 6 campos, cifra los 3 sensibles, guarda, devuelve la fila enmascarada.
- Verificado con `backend/t25-01-afip-config.mjs` (12/12 PASS) contra una organización descartable creada y borrada por el propio script — no toca la organización real de Eliathi.
- La carga de la fila real de Eliathi se hizo aparte, con un script temporal fuera del repo (leyó `C:\Users\JulianLopez\afip-fabbric-homologacion\*` y usó el `access_token` de afipsdk.com ya obtenido) — no quedó ningún script con esos datos en el repositorio.

## Definition of Done

- [x] La migración corre limpia sin afectar filas existentes de `catalogConfigs` (todos los campos nuevos nullable).
- [x] Los campos sensibles quedan cifrados en la base, no en texto plano — confirmado por SQL directo (el valor crudo no coincide con el texto plano) y por round-trip de desencriptado.
- [x] `updateCatalogConfigSchema` no cambia — confirmado por test: un `PATCH /admin/catalog-config` con `afipCuit` en el body no lo modifica.
- [x] `tsc --noEmit` limpio en `backend/` y `packages/shared/` tras el cambio de tipos.

## Dependencias

- **La bloquean**: Fase 0 — ya resuelta, definió las credenciales exactas a guardar.
- **Bloquea**: Tarea 2 (`02-modulo-servicio-afip`) — ya puede leer esta config para autenticarse contra AFIP. **Desbloqueada.**
