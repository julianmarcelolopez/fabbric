# Fase 1 — Extender el backend existente

**Estado: ✅ Hecha (2026-08-17)** — las 3 tareas completas, 42/42 checks PASS entre las 3 suites (`t23-01-barcode-migration.mjs`, `t23-02-by-barcode.mjs`, `t23-03-venta-local.mjs`).

*(Antes "Base en Supabase" — renombrada tras descubrir que Eliathi Modas ya es un tenant real de fabbric, ver `overview.md` "Decisión de arquitectura" y `tareas/00-gaps-previos/`.)*

## Objetivo (según plan.md)

Sumar al backend existente (`backend/`) lo mínimo necesario para que la PWA pueda buscar por código de barras y confirmar una venta presencial en un solo paso — sin crear un proyecto Supabase nuevo ni tablas propias.

## Por qué está subdividida

Agrupar migración + los dos endpoints en una sola tarea rompía con el patrón que ya usa el propio proyecto: T4, T7 y T9 (de los que esta fase depende directamente) siempre separaron schema/migración de endpoints, y separaron endpoints simples de los que combinan varias reglas de negocio. En particular, `venta-local` no es un endpoint aislado — combina la creación de pedido manual (T7) y el cobro con cartera (T9) en una transacción nueva, y necesita generalizar `ensureMpWallet` (hoy hardcodeada para una sola cartera) a un helper genérico. Esa es la pieza de más riesgo real y conviene que quede sola, con su propia verificación.

## Decisiones que marcan esta fase

- **`venta-local` no pasa por `pending`**: a diferencia del alta manual de T7 (que crea `pending` y cobra después en un segundo paso), acá el pedido nace directamente en `paid` dentro de la misma transacción — no hay un estado intermedio que loguear ni una segunda llamada que pueda fallar y dejar algo a medias.
- **Una cartera por medio de pago, generalizando el patrón de T9**: `ensureMpWallet` (hardcodeada a la cartera "Mercado Pago") se generaliza a `ensureWallet(tx, orgId, name)`. El medio de pago `mercadopago` de esta app reusa la **misma** cartera "Mercado Pago" que ya usa el webhook del checkout online — es la misma plata entrando a la misma cuenta, tiene que verse junta en Finanzas.
- **`barcode` es un campo nuevo, no `sku`**: `productVariants.sku` ya existe pero es texto libre sin unicidad, pensado como código interno. `barcode` es el código de barras físico de la prenda, con constraint de unicidad por organización.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-migracion-barcode](01-migracion-barcode/README.md) — columna `barcode` en `productVariants` | Fase 0 | ✅ Hecha |
| 2 | [02-endpoint-by-barcode](02-endpoint-by-barcode/README.md) — `GET /admin/variants/by-barcode/:code` | 1 | ✅ Hecha |
| 3 | [03-endpoint-venta-local](03-endpoint-venta-local/README.md) — `POST /admin/orders/venta-local` + carteras genéricas | Fase 0 (no depende de 1/2) | ✅ Hecha |

## Criterios de aceptación de la fase completa

- Buscar por un `barcode` inexistente devuelve 404; por uno existente, devuelve la variante con su `stockLocal` correcto.
- `venta-local` con stock suficiente: crea el pedido, descuenta stock, lo deja `paid`, y crea el movimiento financiero — todo en una sola llamada.
- `venta-local` con stock insuficiente para algún ítem: rechaza toda la operación (400), sin pedido, sin stock descontado, sin movimiento financiero — verificado por SQL.
- La cartera se crea sola la primera vez que se usa un medio de pago, y se reusa en ventas siguientes.
- Aislamiento por organización en ambos endpoints.

## Dependencias

- **La bloquean**: Fase 0 (gaps previos) — ya resuelta.
- **Bloquea**: todas las fases siguientes (02 a 07).
