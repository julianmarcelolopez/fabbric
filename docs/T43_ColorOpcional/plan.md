# Plan — Color opcional en variantes (T43)

Basado en `specs/T43_ColorOpcional.md`. Respuestas del usuario
(2026-11-05):
1. El código de barras de los perfumes sigue el **mismo formato** que
   la ropa (`modelo + 3 dígitos + "." + resto`) — ejemplo real dado:
   `17006000.000`. El segmento de color viene **fijo/placeholder**
   (`000`), no se usa para diferenciar nada real.
2. "Talle" (volumen) queda como **texto libre** (120ML, 100ML, 50ML
   tipeados a mano), igual que hoy funciona para ropa.

## Por qué el barcode no necesita ningún cambio de parser

Con el ejemplo real (`17006000.000`), el regex actual
(`backend/src/lib/barcode.ts`, `/^(\d+)(\d{3})\.(.+)$/`) parsea
`modeloCode="17006"`, `colorCode="000"`, `talleCode="000"` sin
romperse — el formato es compatible tal cual. Como el segmento de
color es el mismo fijo (`000`) para todas las variantes de un mismo
perfume, el matching de `suggest-by-barcode` (mismo modelo + mismo
color ⇒ mismo producto) sigue funcionando igual que con ropa: dos
variantes de volumen distinto del mismo perfume comparten
`modeloCode` y `colorCode`, así que se reconocen como el mismo
producto automáticamente. **No hace falta tocar
`backend/src/lib/barcode.ts` ni la lógica de `suggest-by-barcode`
para esto.**

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-color-opcional](tareas/01-backend-color-opcional/01-backend-color-opcional.md) | nada | ✅ |
| 2 | [02-admin-variant-editor](tareas/02-admin-variant-editor/02-admin-variant-editor.md) | 1 | ✅ |
| 3 | [03-storefront-selector-color](tareas/03-storefront-selector-color/03-storefront-selector-color.md) | 1 | ✅ |
| 4 | [04-pwa-alta-y-ficha](tareas/04-pwa-alta-y-ficha/04-pwa-alta-y-ficha.md) | 1 | ✅ |

**Nota post-implementación de la Tarea 1**: además de los 3 archivos
listados en "Backend" abajo, apareció un cuarto necesario que
`plan.md` no tenía: `altaRapidaSchema`
(`packages/shared/src/schemas/product.ts`) y el endpoint
`POST /admin/products/alta-rapida`
(`backend/src/modules/products/routes.ts`) — es el que realmente usa
`AltaScreen.tsx` de la PWA, no `createVariantSchema`. Ya corregido;
detalle completo en `tareas/01-backend-color-opcional/`.

## Cambios concretos

### 1. Base de datos

`backend/src/db/schema.ts`, tabla `product_variants`: sacar
`.notNull()` de `color`:
```diff
- color: text("color").notNull(),
+ color: text("color"),
```
Migración: `npx drizzle-kit generate --name t43_color_opcional`, luego
`npx drizzle-kit migrate` (con el override de pooler de sesión, como
siempre). Datos existentes no se tocan — ya tienen color no-nulo.

### 2. Validación (Zod) — `packages/shared/src/schemas/variant.ts`

`createVariantSchema`: `color` pasa de `z.string().min(1)` a
`z.string().trim().optional()`. Mismo cambio en la base de
`updateVariantSchema` (ya es `.partial()`, pero la validación interna
del campo también tiene que aceptar string vacío/undefined).

### 3. Backend — rutas de variantes

`backend/src/modules/variants/routes.ts` (crear/editar variante):
antes de insertar/actualizar, normalizar string vacío a `null`
(`color: input.color?.trim() || null`) — así el campo queda
realmente vacío en la base, no como string `""`.

### 4. Admin — `frontend/.../components/VariantEditor.tsx`

- Sacar el atributo `required` del `<input>` de color (línea ~156).
- Cambiar el placeholder/label a algo que deje claro que es opcional
  (ej. placeholder "Color (opcional)").
- Sin cambios en "Talle" — sigue tal cual, el cliente lo va a usar
  para tipear "120ML" directamente.

### 5. Storefront — `frontend/src/features/catalog/ProductDetailView.tsx`

Donde se arma la lista de colores para el selector (antes de la
línea ~220), filtrar valores vacíos/null antes de calcular
`colores.length`:
```diff
- const colores = [...new Set(variants.map(v => v.color))];
+ const colores = [...new Set(variants.map(v => v.color).filter(Boolean))];
```
Con esto, un perfume (todas sus variantes con `color: null`) no
muestra el selector de color — solo el de "Talle" (volumen). Ropa
existente no cambia (siempre tuvo color no-vacío).

### 6. PWA — Alta (`pwa/src/screens/AltaScreen.tsx`)

- Sacar `color` de la validación obligatoria en línea ~143-144:
  ```diff
  - if (!marca.trim() || !modelo.trim() || !talle.trim() || !color.trim())
  -   return setFormError("Completá marca, modelo, talle y color.");
  + if (!marca.trim() || !modelo.trim() || !talle.trim())
  +   return setFormError("Completá marca, modelo y talle.");
  ```
- El input de color (líneas ~478-487) deja de ser obligatorio en la
  UI (sacar cualquier marca visual de "requerido"); si queda vacío,
  se manda `undefined`/`""` y el backend lo normaliza a `null`.

### 7. PWA — Ficha (`pwa/src/screens/FichaScreen.tsx`)

Línea ~119, mostrar el color solo si existe:
```diff
- <p>Talle {variant.talle} · {variant.color}</p>
+ <p>Talle {variant.talle}{variant.color ? ` · ${variant.color}` : ""}</p>
```

## Fuera de alcance (confirmado)

- Flag por categoría — no hace falta, color opcional aplica a todos.
- Lista fija de valores para "talle" — queda texto libre.
- Cambios al parser de barcode — el formato real ya es compatible.

## Verificación

- `tsc --noEmit` limpio en `backend/`, `frontend/`, `pwa/`.
- Crear un producto nuevo sin color desde el admin → variante queda
  con `color: null`, no rompe la grilla de `ProductsPage.tsx`.
- Ficha de ese producto en la tienda online → no aparece selector de
  "Color", solo "Talle" (volumen).
- Alta por escaneo en la PWA de un código tipo `17006000.000` sin
  tipear color → se guarda, `FichaScreen` lo muestra sin `· null` ni
  `· ` colgando.
- Productos de ropa existentes (con color) siguen funcionando exacto
  igual — selector de color sigue apareciendo, nada regresiona.
- Escanear una segunda variante del mismo perfume (mismo modelo+000,
  distinto volumen) desde el alta → `suggest-by-barcode` lo reconoce
  como el mismo producto y ofrece agregar la variante, no crea un
  producto duplicado.

## Estado: implementado y verificado en las 4 capas

Las 4 tareas quedaron hechas y verificadas (código + `tsc --noEmit`/
`build` limpios + migración aplicada contra la base real + admin
confirmado OK por el usuario + Tareas 3 y 4 verificadas con tests
Playwright automatizados, 17/17 checks). Detalle completo de lo que
se tocó realmente, incluyendo hallazgos que no estaban en este plan
original (el endpoint `alta-rapida`, ~7 pantallas que armaban
`"{talle}/{color}"` a mano, un texto de botón incorrecto y 5 queries
públicas de filtros sin excluir `null`), en `status.md` y en cada
archivo de `tareas/`.
