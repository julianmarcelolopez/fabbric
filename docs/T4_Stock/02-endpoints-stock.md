# Tarea 2 — Endpoints de stock (movimientos, historial, crítico, umbral)

**Estado:** ✅ Hecha (2026-07-08) — suite 18/18 PASS
**Depende de:** [01-schema-stock.md](01-schema-stock.md)

## Objetivo

La lógica de negocio de la fase: mover stock en transacción con validaciones, consultar historial, detectar stock crítico y configurar el umbral. Y el cambio de contrato en variantes: el stock ya no se edita directo.

## Pasos

`backend/src/modules/stock/routes.ts` (todo con `requireAdminAuth` + `requireOrgId` + `schema` Swagger):

- [x] `POST /admin/variants/:id/stock-movements` — **update guardado en SQL** (`WHERE stock + delta >= 0`), sin condiciones de carrera: si no matchea → 400 `insufficient_stock` con rollback del movimiento; variante de otra org → 404
- [x] `GET /admin/variants/:id/stock-movements` — historial descendente (límite 100)
- [x] `GET /admin/stock` — `{ lowStockThreshold, items: [...] }` con producto, talle/color, stock por canal, total y flag `critical`
- [x] `GET /admin/stock/critical` — solo las críticas
- [x] `GET /admin/catalog-config` — lazy create con defaults de la org (con fallback de slug sufijado si el slug global ya está tomado)
- [x] `PATCH /admin/catalog-config/low-stock-threshold`

### Cambio de contrato en variantes (la nota de T2 se cobra)

- [x] `updateVariantSchema` (shared) perdió `stockOnline`/`stockLocal` — verificado: un PATCH con `stockOnline: 999` lo ignora (Zod lo descarta) y aplica el resto
- [x] El alta de variante conserva el stock inicial como estado inicial (sin movimiento)
- [x] `VariantEditor` en el frontend: pendiente para la tarea 3 (mientras tanto los inputs de stock quedan no-op inofensivos)

## Definition of Done

- [x] Suite 18/18: entrada/venta/ajuste aplican y registran; venta imposible → 400 y **nada cambió** (contadores + conteo de movimientos verificados por DB); delta 0 / entrada negativa / `sync` → 400
- [x] Historial en orden descendente con nota
- [x] `critical` reacciona al umbral (con 100 la variante aparece en `/critical`, con 3 no)
- [x] Config lazy verificada en una org nueva (slug y umbral default correctos)
- [x] **Aislamiento**: staff de otra org — stock vacío, 404 en mover e historial
- [x] Las 5 rutas en `/docs` (verificado contra el spec); `tsc --noEmit` limpio
