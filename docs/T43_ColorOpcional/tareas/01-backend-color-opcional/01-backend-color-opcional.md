# Tarea 1 — Backend: color opcional (DB + Zod + rutas)

**Estado:** ✅ Hecha. `tsc --noEmit` limpio en `backend/`. Migración
`0030_t43_color_opcional.sql` aplicada contra la base real. Verificado
con una transacción de prueba con rollback (sin dejar datos de test en
la base real): insertar una variante con `color: null`, confirmar que
el chequeo de duplicados por talle (usando `isNull`) la encuentra
correctamente, y que una segunda variante del mismo producto con color
normal no se ve afectada.

**Hallazgo durante la implementación, fuera del alcance original de
`plan.md`**: el endpoint que realmente usa la PWA para el alta por
escaneo no es `POST /admin/products/:id/variants`
(`createVariantSchema`) sino `POST /admin/products/alta-rapida`
(`altaRapidaSchema`, `backend/src/modules/products/routes.ts`), que
tenía su propio `color: z.string().min(1)` — no estaba en la lista de
archivos de `plan.md`. Corregido también acá (ver "Alcance real"
abajo); si no se corregía, la Tarea 4 (PWA) iba a fallar igual al
intentar dar de alta un perfume sin color, aunque el resto de las
capas ya lo permitieran.

**Depende de:** nada.

## Objetivo (según `plan.md`, T43 puntos 1-3)

Que la base y la validación dejen de exigir un color para crear o
editar una variante — es la base para todo lo demás (admin, PWA,
storefront dependen de que esto exista primero).

## Alcance real (incluye el hallazgo de arriba)

- `backend/src/db/schema.ts`, tabla `product_variants`: sacado
  `.notNull()` de `color` (queda `color: text("color")`).
- Migración `0030_t43_color_opcional.sql`
  (`ALTER TABLE product_variants ALTER COLUMN color DROP NOT NULL`),
  generada con `drizzle-kit generate` y aplicada con `drizzle-kit
  migrate` (override de pooler de sesión sobre `DATABASE_URL`, como
  siempre). Datos existentes no se tocaron — ya tienen color no-nulo.
- `packages/shared/src/schemas/variant.ts`: `color` en
  `productVariantSchema`/`createVariantSchema`/`updateVariantSchema`
  pasa a `z.string().nullable()` (con `.optional()` donde aplica) —
  sin `.min(1)`, para que un string vacío llegue a la ruta y se pueda
  normalizar ahí en vez de rechazarse como error de validación.
- `packages/shared/src/schemas/product.ts`: `altaRapidaSchema.color`
  (el que usa la PWA) — mismo cambio.
- `backend/src/modules/variants/routes.ts`: nuevo helper
  `emptyToNull()`; aplicado en el `POST`/`PATCH` de variante. El
  chequeo de duplicados (`talle`+`color` dentro del mismo producto)
  usa `isNull(productVariants.color)` cuando corresponde, en vez de
  `eq(..., null)` (que en SQL nunca matchea — hubiera dejado crear
  variantes duplicadas con color vacío sin avisar).
- `backend/src/modules/products/routes.ts`, endpoint
  `POST /admin/products/alta-rapida`: mismo `trim() || null` antes de
  insertar. También se ajustó el tipo de `colorNameMatch` en
  `suggest-by-barcode` (ahora `color: string | null`) — es solo una
  corrección de tipo, sin cambio de comportamiento.
- `backend/src/modules/orders/routes.ts`: el tipo local de
  `catalogLines` tenía `color: string` a mano — ajustado a
  `string | null` (el snapshot de pedido, `order_items.color`, ya era
  nullable en la base desde antes; esto era solo un tipo desactualizado).

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`. ✅
- Migración aplicada contra la base real sin error. ✅
- Verificado con un script puntual (transacción con rollback, sin
  dejar datos de prueba): crear una variante con `color: null`,
  confirmar que el chequeo de duplicados por talle+color-null la
  encuentra, y que una variante con color normal no se ve afectada. ✅
- Crear/editar una variante **con** color sigue funcionando exacto
  igual que antes (no hay regresión para ropa existente) — cubierto
  por el mismo script (segunda variante con color "Rojo"). ✅
- No se pudo probar por `curl` real contra los endpoints HTTP (mismo
  problema de siempre: las credenciales de `SEED_ADMIN_EMAIL`/
  `PASSWORD` en `.env.local` no coinciden con la contraseña real) —
  mismo criterio que B001, verificación directa contra la base en su
  lugar. La verificación end-to-end real queda para cuando se pruebe
  el alta de un perfume real desde la PWA (Tarea 4).

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2, Tarea 3, Tarea 4.
