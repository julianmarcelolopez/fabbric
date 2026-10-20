# Tarea 1 — Backend: `parseBarcode` + `GET /admin/products/suggest-by-barcode/:barcode`

**Estado:** ✅ Hecha.

**Depende de:** nada.

## Objetivo (según `plan.md`, T36/Fase 1)

Exponer un endpoint que, dado un código de barras escaneado, devuelva
sugerencias de marca/modelo/categoría/color/talle derivadas de variantes ya
cargadas — sin tabla ni migración nueva, todo a partir de
`product_variants.barcode` (`backend/src/db/schema.ts:197`).

## Alcance

- `backend/src/lib/barcode.ts` (nuevo):

```ts
const BARCODE_RE = /^(\d+)(\d{3})\.(.+)$/;

export type ParsedBarcode = { modeloCode: string; colorCode: string; talleCode: string };

export function parseBarcode(barcode: string): ParsedBarcode | null {
  const match = BARCODE_RE.exec(barcode.trim());
  if (!match) return null;
  const [, modeloCode, colorCode, talleCode] = match;
  return { modeloCode, colorCode, talleCode: talleCode.trim() };
}
```

  El color son los 3 dígitos antes del ".", el modelo todo lo anterior
  (largo variable — confirmado con `01800640.034` → modelo de 5 dígitos y
  `018005053.034` → modelo de 6). El talle, después del ".", **no se asume
  numérico de largo fijo** — corregido tras ver datos reales de producción
  (`09234602.XL`, `09234323.S`) donde el talle es texto literal, no un
  código de 3 dígitos; se acepta cualquier texto no vacío y se recorta
  espacios sueltos (algunos barcodes reales traían espacios finales, ej.
  `"09234323.S  "`).

- `backend/src/modules/products/routes.ts`:
  - Import de `parseBarcode` (`../../lib/barcode.js`) y de `isNotNull`
    (`drizzle-orm`).
  - Nuevo `GET /admin/products/suggest-by-barcode/:barcode`, registrado
    antes del `POST /admin/products/alta-rapida`:
    - Si `parseBarcode` devuelve `null` (formato no reconocido): responde
      `{ parsed: null, product: null, colorName: null, talleName: null }`
      sin error — el alta por texto libre sigue siendo el fallback.
    - Trae todas las `productVariants` de la org con `barcode` no nulo,
      parsea cada una y busca, por separado, la más reciente
      (`createdAt`) que matchee `modeloCode`, `colorCode` o `talleCode` del
      código escaneado.
    - Si hay match de modelo, resuelve el producto completo (nombre, marca,
      categoría) con el mismo join que ya usa `GET /admin/products/:id`.
    - Devuelve `{ parsed, product: {...} | null, colorName, talleName }`.

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- `curl` contra el backend en Docker:
  - Un barcode cuyo `modeloCode` coincide con una variante ya cargada
    devuelve el producto correcto (nombre/marca/categoría).
  - Un barcode cuyo `colorCode`/`talleCode` ya se usó (en cualquier modelo)
    devuelve `colorName`/`talleName` con el nombre más reciente.
  - Un barcode que no matchea `/^(\d+)(\d{3})\.(.+)$/` (ej. sin ".", o con
    menos de 4 dígitos antes del ".") devuelve
    `{ parsed: null, product: null, colorName: null, talleName: null }`.
  - Un barcode válido sin ninguna coincidencia devuelve `product: null`,
    `colorName: null`, `talleName: null` (sin error).

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
