# Tarea 1 — Schema + migración de datos

**Estado:** ✅ Hecha — migraciones aplicadas contra Supabase remoto, backfill corrido y verificado.

**Depende de:** nada — es la primera tarea, no requiere ningún endpoint ni UI nuevo.

## Objetivo (según `plan.md`, T29/01)

Crear la tabla `brands` y migrar los valores de texto que hoy viven en
`products.brand` (`../../analisis.md` secciones 1 y 7, decisión 5) sin perder
ningún dato, dejando el sistema listo para que las tareas siguientes escriban
y lean marcas como entidad propia.

## Pasos

### 1. Tabla `brands`

- [x] En [backend/src/db/schema.ts](../../../../backend/src/db/schema.ts), agregar `brands` con el mismo shape que `collections` ([schema.ts:86-105](../../../../backend/src/db/schema.ts#L86-L105)): `id, orgId, name, slug, imageUrl, active, createdAt, updatedAt`, `unique(orgId, slug)`.
- [x] Agregar `brandId: uuid("brand_id").references(() => brands.id)` (nullable) a `products`, junto al `brand: text("brand")` existente (todavía no se borra en este paso). Migración `supabase/migrations/0023_dazzling_mac_gargan.sql`.
- [x] Generar y correr la migración de Drizzle (`npm run db:generate` + `npm run db:migrate`, contra `DIRECT_URL`).

### 2. Script de backfill

- [x] `backend/scripts/backfill-brands.ts` (nuevo, `npm run db:backfill-brands`) — por cada `orgId`, junta los valores distintos y no vacíos de `products.brand`. **Decisión tomada al implementar:** se recorta espacios al inicio/fin (higiene de datos, no semántica) pero no se normaliza mayúsculas/acentos — una colisión de slug por distinto casing se fusiona bajo el primer nombre visto y se loguea como advertencia, no se aborta el script. En esta corrida no hubo ninguna colisión.
- [x] Inserta una fila en `brands` por cada valor, con `slug` generado con la misma función que `frontend/src/lib/slug.ts` (duplicada en el script — son runtimes/paquetes separados sin un util compartido hoy).
- [x] Actualiza `products.brandId` con el id de la marca correspondiente a cada producto.
- [x] Corrido directo contra Supabase remoto (`npm run db:backfill-brands` desde `backend/`, no vía la app).

### 3. Verificación y limpieza

- [x] Verificado: 0 productos con `brand` no nulo y `brandId` nulo.
- [x] Verificado: 3 marcas creadas (`Taverniti`, `Puma`, `ZARA`), una por cada valor distinto que había en `products.brand` — coincide.
- [x] Columna `products.brand` borrada (decisión 5 de `analisis.md`). Migración `supabase/migrations/0024_magenta_layla_miller.sql`.

## Cómo se verificó

Corrida real contra Supabase remoto (no local/mock):

```
Productos con brand no nulo: 3
Marcas distintas encontradas (por org+slug): 3
  marca creada: "Taverniti" (taverniti)
  marca creada: "Puma" (puma)
  marca creada: "ZARA" (zara)
Listo — 3 marca(s) creada(s), 0 ya existían, 3 producto(s) actualizado(s).
```

Script de verificación aparte (temporal, borrado después de usarlo) confirmó
`0` productos con `brand` no nulo y `brandId` nulo, y `3` productos con
`brandId` asignado — coincide exactamente con lo migrado.

## Definition of Done

- [x] `brands` existe con los mismos campos que `collections`.
- [x] Todo producto que antes tenía `brand` no nulo ahora tiene `brandId` no nulo, apuntando a la marca correcta.
- [x] `products.brand` ya no existe en el schema.

## Efecto colateral esperado (no es un bug de esta tarea)

Al borrar `products.brand`, el backend queda **sin compilar**: 12 errores de
TypeScript en `products/routes.ts` (1), `public/routes.ts` (8),
`homeSections/routes.ts` (2) y `variants/routes.ts` (1) — todos referencian
la columna vieja. Es exactamente lo que anticipaba `../../analisis.md`
sección 3, y por lo que esta tarea se documentó como "solo de datos" — el fix
de esos call-sites es el contenido de las Tareas 2 y 5, no de esta.

## Dependencias

- **La bloquean:** nada.
- **Bloquea:** todas las tareas siguientes de T29 — ninguna puede escribir/leer `brandId` sin esto.
