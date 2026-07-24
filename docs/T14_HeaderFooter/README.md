# T14 — Header/footer personalizables (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

Replicar el "Perfil de tienda" que Edgar ya tiene hoy en WhatsApp Business (`docs/analisis-negocio.md`, sección 2) — banner de portada, WhatsApp, Instagram, mail, dirección y horario — como campos fijos configurables, más un botón "Compartir".

Criterio de verificación (de `docs/plan_2.md`): *desde `CatalogConfigPage` se sube un banner y se cargan WhatsApp/Instagram/mail/dirección/horario → aparecen en el header y el footer de la tienda pública; si no están cargados, no rompen el layout*.

## Decisiones que marcan esta fase

- **No es un editor de bloques genérico** — son campos fijos y concretos, porque ya sabemos exactamente cuáles tienen que ser (el perfil de WhatsApp de Edgar). Un sistema de bloques reordenables/editables es mucho más trabajo del que amerita esta demo.
- **Mapa embebido de la dirección y estado "abierto/cerrado" en vivo quedan explícitamente afuera** (ver `docs/plan_2.md`, "Fuera de alcance") — complejidad real por poco beneficio.
- El banner usa el **mismo mecanismo de upload que el logo** (`@fastify/multipart` → Supabase Storage) — nada nuevo que inventar, solo un segundo campo de imagen.
- Todos los campos son **nullable y opcionales**: sin cargar nada, el layout se comporta igual que hoy (mismo criterio que ya usa `businessDescription`).

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-y-endpoints.md](01-schema-y-endpoints.md) — columnas nuevas en `catalog_configs`, migración, endpoint de upload de banner | — | ⬜ Pendiente |
| 2 | [02-banner-y-footer-ui.md](02-banner-y-footer-ui.md) — `CatalogConfigPage` (banner + campos) y `StoreLayout` (banner, footer, compartir) | 1 | ⬜ Pendiente |
| 3 | [03-verificacion-final.md](03-verificacion-final.md) — Definition of Done de T14 | 1-2 | ⬜ Pendiente |

## Recordatorios operativos

- Migración: mismo procedimiento que T11/T12. Si se hace en la misma sesión que T16 (que también agrega columnas a `catalog_configs`), evaluar si conviene combinar migraciones — no es obligatorio.
- Reusar el endpoint de upload de logo (`/admin/catalog-config/logo`) como plantilla para el de banner — mismo patrón de validación (tipo/tamaño de archivo).

## Próximo paso al cerrar T14

Independiente del resto — seguir con cualquiera de T11, T12, T13 o T15.
