# T12 — Marca (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

Que cada producto pueda tener una marca (Taverniti, Bross, Adidas, Puma, Eliathi Modas, u otra) — Edgar revende multi-marca y hoy no hay dónde cargarlo.

Criterio de verificación (de `docs/plan_2.md`): *producto con marca cargada la muestra junto al nombre; el datalist sugiere las 5 marcas conocidas pero acepta texto libre*.

## Decisiones que marcan esta fase

- **Campo de texto libre en `products`**, no una tabla propia con su CRUD — no es redundante con `categoryId` (rubro, 1-por-producto, para navegación) ni con `collections` (m2m, para curaduría editorial): es un eje ortogonal. Ver el razonamiento completo en `docs/plan_2.md`.
- **Datalist sugerido** (Taverniti, Bross, Adidas, Puma, Eliathi Modas) que no restringe — mismo patrón ya usado en Finanzas (`SUGGESTED_CATEGORIES`) para categorías de movimientos.
- Si en el futuro hace falta filtrar/navegar la tienda por marca, ahí se justifica una taxonomía real — hoy no (queda anotado en "Fuera de alcance" de `plan_2.md`).

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-y-endpoints.md](01-schema-y-endpoints.md) — columna `brand`, migración, schema compartido, rutas admin + públicas | — | ✅ Completada |
| 2 | [02-marca-ui.md](02-marca-ui.md) — campo con datalist en `ProductEditPage`, mostrar marca en cards/detalle | 1 | ✅ Completada |
| 3 | [03-verificacion-final.md](03-verificacion-final.md) — Definition of Done de T12 | 1-2 | ✅ Completada |

## Recordatorios operativos

- Migración: mismo procedimiento que T11 (`db:generate` + `db:migrate`, nunca `db:push`). Si T11 y T12 se hacen en la misma sesión, evaluar si conviene una sola migración con ambas columnas.
- El datalist de marcas sugeridas se define en el frontend (constante local, mismo criterio que `SUGGESTED_CATEGORIES` en `frontend/src/features/admin/types.ts`) — no hace falta persistir la lista de marcas en ningún lado.

## Próximo paso al cerrar T12

Independiente del resto — seguir con cualquiera de T13, T14 o T15.
