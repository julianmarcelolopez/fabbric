# Tarea 2 — Backend: alta de cliente sin Google

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T34/Fase 2, Hallazgo 3)

Resuelve un gap real encontrado explorando el repo (no estaba en
`analisis.md`): hoy no existe **ningún** camino para crear un cliente sin
pasar por el login de Google de la tienda online (`resolveCustomer`,
`backend/src/plugins/auth.ts:93-114`, es el único lugar que inserta en
`customers`) — ni un `POST /admin/customers`, ni un botón en
`CustomersPage.tsx`. Una venta puerta a puerta con anticipo muy
probablemente es la primera compra de esa persona, así que sin esto el
requisito "`customerId` obligatorio si `medioPago === anticipo`" no se
puede cumplir en el caso común.

## Alcance

- `createCustomerSchema` nuevo en `packages/shared/src/schemas/order.ts`
  (o un archivo `customer.ts` aparte si conviene — no hay uno hoy):
  `{ name: z.string().min(1).max(200), phone: z.string().min(1).max(30).optional() }`.
- `POST /admin/customers` en `backend/src/modules/customers/routes.ts`
  (junto a los dos `GET` existentes, líneas 23-61): inserta con
  `googleSub: null`, `email: null`. Org-scoped (`requireOrgId`, mismo
  patrón que el resto del archivo).

## Nota — límite conocido, no se resuelve acá

Un cliente creado por esta vía y que más adelante se loguea con Google en
la tienda online queda **duplicado** (`resolveCustomer` empareja por
`googleSub`, que en la fila walk-in es `null`) — documentado en
`plan.md`, Hallazgo 3 y "Fuera de alcance". No es parte de esta tarea.

## Resultado real

`createCustomerSchema` agregado a `packages/shared/src/schemas/customer.ts`
(junto a `customerSchema`, ya corregido en la Tarea 1). `POST
/admin/customers` agregado en `customers/routes.ts`, al final del archivo.

**Gotcha de verificación**: el primer intento de probar con `curl` usando
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` de `.env.local` falló con
`invalid_credentials` — esa contraseña quedó desactualizada (la memoria del
proyecto ya registraba que se cambió a mano durante T15). Se resolvió con
el patrón real ya establecido en el repo (`backend/t23-04-alta-rapida.mjs`):
crear una org + admin user **temporales** vía `supa.auth.admin.createUser`
+ insert directo en `admin_users`, loguearse con esas credenciales
descartables, y borrar todo al final — no depender de la cuenta real
seedeada para este tipo de prueba.

## Criterio de aceptación

✅ `npx tsc --noEmit` limpio. Verificado con un script `.mjs` descartable
(org temporal, borrada al final): alta con nombre+teléfono aparece en
`GET /admin/customers?search=` con `email: null`; alta sin teléfono
funciona (opcional); nombre vacío rechaza con 400. 7/7 checks OK.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3 (venta-local necesita poder resolver un `customerId`
  válido), Tarea 5 (el buscador/alta de cliente de la PWA).
