# T28 — Plan de implementación (Opción A: la simple)

Basado en `docs/T28_CodigosBarraCompartidos/analisis.md`. Alcance: permitir que un código de barras se repita entre variantes distintas (talle/color) cuando el proveedor no lo diferencia — sin resolver todavía el caso de "rotar entre variantes ya existentes que comparten código" (eso es la Opción B, diferida).

No se implementa nada todavía — este es el plan a revisar antes de tocar código.

## 1. Migración de base de datos

- `backend/src/db/schema.ts:158-177` (`productVariants`): reemplazar
  ```ts
  unique("product_variants_org_barcode_unique").on(t.orgId, t.barcode)
  ```
  por
  ```ts
  unique("product_variants_org_barcode_talle_color_unique").on(t.orgId, t.barcode, t.talle, t.color)
  ```
- Generar la migración desde `backend/` con `npm run db:generate` (nombre sugerido: algo como `t28_barcode_shared_across_variants`) y aplicarla con `db:migrate` — **nunca `db:push`**, mismo criterio que el resto del proyecto.
- No hace falta backfill: ninguna fila existente puede violar el nuevo constraint (es estrictamente más permisivo que el actual).
- El constraint ya existente `product_variants_product_talle_color_unique` (`schema.ts:175`, sobre `productId, talle, color`) sigue intacto — sigue siendo imposible cargar dos veces la misma combinación talle/color en el mismo producto, con o sin código de barras.

## 2. Backend — permitir barcode al crear una variante

- `packages/shared/src/schemas/variant.ts`, `createVariantSchema`: agregar `barcode: z.string().min(1).nullable().optional()`. Hoy este schema no lo acepta — es la única vía de creación de variante que no puede setear el código (la de alta por escaneo sí lo hace, vía `altaRapidaSchema`).
- `backend/src/modules/variants/routes.ts:69-112` (`POST /admin/products/:id/variants`): envolver el `insert` en un `try/catch` con `isUniqueViolation` (mismo patrón ya usado en el `PATCH` de variantes, `routes.ts` línea ~154-161, y en `alta-rapida`), devolviendo 409 legible si choca contra el nuevo constraint. La validación de duplicado talle/color existente (líneas 91-103) sigue igual, sin tocar.

## 3. Backend — `by-barcode` determinístico ante ambigüedad

- `backend/src/modules/variants/routes.ts:36-55`: hoy el `select` no tiene `.orderBy()` ni `.limit()` — asume una sola fila posible. Agregar `.orderBy(desc(productVariants.updatedAt)).limit(1)` explícito, para que si hay más de una variante con el mismo código, la respuesta sea siempre "la más reciente" de forma predecible, no lo que Postgres devuelva primero sin orden declarado.

## 4. PWA — salida manual en la Ficha

- `pwa/src/screens/FichaScreen.tsx`: debajo de la acción principal (Registrar entrada / Agregar a la venta), sumar un link chico en el mismo estilo que "Continuar sin foto por ahora" de `AltaScreen.tsx`: **"¿Es otro talle o color? Cargar como variante nueva con este código"**.
- Al tocarlo, se abre un mini-formulario inline (dos inputs: Talle, Color — mismo estilo que los campos de `AltaScreen`) con un botón "Guardar variante nueva".
- Al confirmar: `POST /admin/products/${variant.product.id}/variants` con `{ talle, color, barcode: variant.barcode, stockLocal: 1 }` — `stockLocal: 1` fijo (no un selector de cantidad; es la prenda física que el vendedor tiene en la mano al cargarla, mismo criterio que ya usa `alta-rapida` para el alta por escaneo).
- Si el backend devuelve 409 (combinación talle/color ya existe para ese producto, con o sin este código), mostrar el mensaje de error tal cual — no intentar adivinar una corrección automática.
- Al guardar con éxito: volver a Escanear (`onDone()`), mismo comportamiento que el alta completa de un producto nuevo. **No** se agrega una pantalla de confirmación de pantalla completa tipo `EntradaOkScreen`/`VentaAgregadaOkScreen` para esta acción — es un camino de excepción, no el flujo principal; si en el uso real resulta confuso no tener esa confirmación, se suma después.
- El `variant` que sigue mostrando la Ficha en pantalla en ese momento **no** cambia — el vendedor sigue viendo la variante original que resolvió el escaneo; si necesita seguir trabajando con la que acaba de crear, tiene que volver a escanear (limitación conocida de la Opción A, documentada en `analisis.md`).

## 5. Nice-to-have — no bloquea este ticket

- `frontend/src/features/admin/components/VariantEditor.tsx`, formulario "Agregar variante" (línea ~138-156): hoy no tiene campo de código de barras — solo talle/color/stock. Con `createVariantSchema` ya aceptándolo (paso 2), sumar un input opcional ahí sería consistente, pero no es necesario para resolver el caso real (que ocurre escaneando desde la PWA, no cargando a mano desde el admin de escritorio). Evaluar por separado si hace falta.

## Verificación

- Migración: correr `db:generate` + `db:migrate` contra la base real y confirmar con una consulta directa que el constraint viejo ya no existe y el nuevo sí (`\d product_variants` o el equivalente vía `information_schema.table_constraints`).
- Playwright, org descartable: crear dos variantes de un mismo producto con el mismo `barcode` (una a través del endpoint directo, para simular el caso real de un código que el proveedor repite) → confirmar que `by-barcode` no rompe y devuelve la más reciente → desde la Ficha de esa, usar "Cargar como variante nueva" para crear una tercera con el mismo código y un talle distinto → confirmar que se crea bien → confirmar que intentar crear una cuarta con el mismo talle/color que una ya existente da 409 legible, no un error crudo de Postgres.
- Probar también el circuito normal (código único, caso de siempre) para confirmar que no se rompió nada — un producto con código único se sigue escaneando exactamente igual que antes.

## Dependencias

- **La bloquean:** nada — es independiente de T27 (aunque comparte el mismo código de barras real que motivó el hallazgo del bug de ITF, ya resuelto aparte).
- **Bloquea:** nada. La Opción B (selector de variante ante ambigüedad, diferida) se retoma como su propio ticket si hace falta, no bloquea ni depende de que la Opción A esté terminada de una forma particular — reemplazaría el paso 3 de este plan (el `.limit(1)` determinístico) por un array + selector, sin tocar el resto.
