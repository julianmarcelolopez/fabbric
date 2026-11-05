# Status — T42 Modo "Consultar" en la PWA

Ver el problema y la propuesta completa en
[`specs/T42_ConsultarYEditarPWA.md`](specs/T42_ConsultarYEditarPWA.md) y
el plan de implementación + mockup visual en [`plan.md`](plan.md).
Este archivo es solo el estado — se actualiza a medida que avanza, sin
repetir el análisis.

## Estado general: ⬜ Diseño y plan cerrados — implementación NO empezada (a pedido explícito del usuario)

| Paso | Estado |
|---|---|
| Diagnóstico (por qué hace falta, qué ya existe en el backend) | ✅ Hecho |
| Propuesta de alcance v1 (5 campos básicos) | ✅ Hecha |
| Ampliación de alcance (permisos por rol + paridad con admin: Datos/Variantes/Fotos) | ✅ Hecha |
| Mockup visual interactivo (con toggle de rol) | ✅ Hecho — ver `plan.md` |
| Decisión: bloquear "Modificar" en los dos lados (PWA + admin), con el matiz de qué endpoints se pueden bloquear de verdad sin romper el alta existente | ✅ Confirmada por el usuario |
| Decisión: implementar todo junto (no por fases) | ✅ Confirmada por el usuario |
| **Implementación** | ⬜ **Pendiente — el usuario pidió explícitamente no implementar todavía** |
| Verificación | ⬜ Pendiente |

## Tareas (`tareas/`, se ejecutan según dependencias)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [Backend: guard `requireOwnerOrAbove`](tareas/01-backend-guard-requireowner/01-backend-guard-requireowner.md) | — | ⬜ Pendiente |
| 2 | [PWA: navegación + rol (tab "Consultar")](tareas/02-pwa-navegacion-y-rol/02-pwa-navegacion-y-rol.md) | — | ⬜ Pendiente |
| 3 | [PWA: `EditarScreen` — Datos](tareas/03-pwa-editar-datos/03-pwa-editar-datos.md) | 1, 2 | ⬜ Pendiente |
| 4 | [PWA: `EditarScreen` — Variantes](tareas/04-pwa-editar-variantes/04-pwa-editar-variantes.md) | 1, 3 | ⬜ Pendiente |
| 5 | [PWA: `EditarScreen` — Fotos](tareas/05-pwa-editar-fotos/05-pwa-editar-fotos.md) | 1, 3 | ⬜ Pendiente |

Las Tareas 1 y 2 son independientes entre sí y pueden ir primero, en
cualquier orden. 3 necesita las dos. 4 y 5 solo necesitan 1 y 3 (no
se bloquean entre sí, pero comparten el mismo archivo `EditarScreen.tsx`
así que en la práctica conviene hacerlas en secuencia para no pisarse).

**Correcciones a `plan.md` hechas en este análisis (2026-11-05)**:
`GET /admin/me` **ya existe** (`backend/src/modules/admin/routes.ts`)
— la Tarea 2 no tiene nada de backend que esperar, solo falta que la
PWA lo llame. También se aclaró explícitamente que reordenar fotos
(`PUT /admin/products/:id/images/order`, ya existe y lo usa el admin
de escritorio) queda fuera de esta vuelta a propósito.

## Pendiente operativo antes de implementar

`vendedor@eliathimodas.com` tiene hoy rol `staff` en `admin_users` (verificado
contra la base real). El usuario pidió tratarlo como admin por ahora
("puede hacer todo") — **se intentó pasar su rol a `owner` por SQL directo
y la acción quedó bloqueada por el modo automático de la sesión
(clasificada como "Permission Grant" — elevar un permiso)**. Falta que el
usuario lo apruebe explícitamente (reintentar el mismo comando pidiendo
confirmación) o lo haga él mismo antes de que tenga sentido activar el
guard `requireOwnerOrAbove` — si no, ese usuario específico quedaría
bloqueado para modificar justo cuando se pidió lo contrario.

## Próximo paso

1. Resolver el rol de `vendedor@eliathimodas.com` (ver arriba).
2. Con el OK del usuario, implementar según `plan.md`: guard de backend +
   `EditarScreen.tsx` con las 3 secciones + `GET /admin/me` para que la
   PWA sepa el rol del usuario logueado.
