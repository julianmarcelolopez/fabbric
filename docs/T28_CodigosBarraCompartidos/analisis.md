# T28 — Análisis: códigos de barras compartidos entre variantes

## Contexto

Todo el modelo de escaneo de T23 (`docs/T23-App_ingreso_egreso_productos/overview.md`) asume una relación **1 código de barras ↔ 1 variante** — así lo refleja el schema:

```ts
// backend/src/db/schema.ts:158-176 (productVariants)
sku: text("sku"),
barcode: text("barcode"),  // nullable
talle: text("talle").notNull(),
color: text("color").notNull(),
...
unique("product_variants_org_barcode_unique").on(t.orgId, t.barcode)
```

Esta asunción es correcta para la mayoría de la mercadería (indumentaria con etiquetado GS1 formal: marca + modelo + color + talle, todo en el mismo código). Pero en la operación real de Eliathi aparecieron casos donde **no** se cumple.

## Casos reales investigados

### 1. Medias — código genuinamente compartido (caso confirmado)

3 pares de medias del mismo modelo, distinto color, con el **mismo código de barras físico** impreso en la etiqueta de los tres. Confirmado por el usuario mirando la mercadería en persona — no es un error de tipeo ni de escaneo, el proveedor no generó códigos distintos por color para este artículo.

**Impacto real:** hoy, escanear el segundo par (código idéntico al primero) lleva a la Ficha del primer par ya cargado — no hay forma de dar de alta el segundo color como una variante aparte del mismo producto sin chocar contra el constraint único de la base.

### 2. Taverniti — sospecha inicial descartada con evidencia

Se sospechó inicialmente que el esquema de Taverniti tampoco diferenciaba talle dentro del código (solo color, vía los últimos 3 dígitos visibles a simple vista: "09234602 M" — 8 dígitos + una letra suelta). Se investigó con dos fotos reales:

- Primera foto: no se pudo decodificar por calidad de imagen (plástico arrugado + reflejo + ruido de compresión JPEG) — probado exhaustivamente (10+ combinaciones de escala/umbral/desenfoque), sin éxito. No aporta evidencia en ningún sentido.
- Segunda foto (mismo tipo de prenda, otro color/talle): decodificó limpio como **Code128**, texto `"09234601.L"` — el talle **sí** está codificado dentro del símbolo (el "." y la letra son parte del payload real, no solo texto impreso al lado).

**Conclusión: el caso Taverniti queda descartado** — su código de barras sí distingue talle+color. El problema real es específico de proveedores que no generan códigos por variante (como el caso de las medias), no un patrón general de "marca grande = código incompleto".

### Hallazgo relacionado (ya resuelto, no es parte de este ticket)

Durante la misma investigación se encontró y arregló un bug real de decodificación: el formato **ITF** (logística/cajas, nunca usado en indumentaria) hacía que `zxing-wasm` confundiera un EAN-13 borroso con un ITF válido de 14 dígitos, devolviendo un código incorrecto con total confianza. Se sacó ITF del set de formatos aceptados en `EscanearScreen.tsx` — cambio ya hecho y verificado, documentado como parte del trabajo de T27, no de T28. Se menciona acá solo porque salió de la misma sesión de diagnóstico.

## Estado actual del código

- **`GET /admin/variants/by-barcode/:code`** (`backend/src/modules/variants/routes.ts:22-67`): busca `where(barcode = code AND orgId = orgId)`, sin `.limit()` ni `.orderBy()` — asume que como mucho hay una fila (el constraint único lo garantiza hoy). Devuelve 404 si no hay ninguna.
- **`POST /admin/products/:id/variants`** (`routes.ts:69-112`): crea una variante nueva bajo un producto existente. Usa `createVariantSchema` (`packages/shared/src/schemas/variant.ts`), que **no incluye `barcode`** — hoy el código de barras de una variante nueva creada por acá queda siempre `null`; la única vía que sí lo setea es el alta por escaneo (`POST /admin/products/alta-rapida`).
- **`PATCH /admin/variants/:id`**: desde el trabajo reciente de corrección de datos, ya permite editar `barcode` de una variante existente (agregado a `updateVariantSchema`), con manejo de 409 si el nuevo valor choca con otra variante.

## Las dos opciones de diseño consideradas

### Opción A — simple (la que se implementa en este ticket)

- Aflojar el constraint único de `(orgId, barcode)` a `(orgId, barcode, talle, color)` — el mismo código puede repetirse entre variantes distintas del mismo o de otro producto, pero no se puede repetir la combinación completa código+talle+color (eso seguiría siendo un error real de carga).
- `by-barcode` sigue devolviendo **una sola** variante cuando hay ambigüedad — la más reciente (`ORDER BY updated_at DESC LIMIT 1`, explícito — hoy no tiene orden y depende del orden físico de Postgres, que hay que dejar de asumir en cuanto pueda haber más de una fila).
- La Ficha de producto suma una salida manual: "¿Es otro talle/color con este código? Cargar como variante nueva" — abre un mini-formulario (talle, color) y crea una variante nueva bajo el mismo producto, con el mismo código de barras.

**Limitación conocida y aceptada por ahora:** si tenés 3 medias con el mismo código y vas alternando cuál escaneás, la Ficha siempre te va a mostrar la última variante cargada con ese código — no necesariamente la que tenés en la mano. El vendedor tiene que mirar el talle/color en pantalla y usar la salida manual de nuevo si no coincide. No resuelve el caso de uso de "rotar entre variantes ya existentes que comparten código" — solo resuelve "cargar una variante nueva que todavía no existe".

### Opción B — correcta (diferida)

- `by-barcode` devuelve **todas** las variantes que coincidan cuando hay más de una.
- La PWA muestra un selector chico ("Encontramos varias variantes con este código: Rojo, Azul, Verde — ¿cuál es?") antes de llegar a la Ficha, cuando y solo cuando hay ambigüedad real.
- Resuelve también el caso de "rotar entre variantes ya existentes" que la Opción A no cubre.
- Mayor superficie: cambia la forma de la respuesta de `by-barcode` (objeto → posible array), y suma un estado/pantalla nueva en el circuito de Escanear.

**Decisión (2026-09-14):** arrancar con la Opción A. Se documenta acá la Opción B para retomarla si la limitación de A resulta molesta en el uso real — no se descarta, queda diferida.

## Fuera de alcance de este ticket

- La Opción B completa (selector de variante ante ambigüedad).
- Cualquier cambio al escaneo por foto o a los formatos de `zxing-wasm` — eso ya se resolvió aparte (ver "Hallazgo relacionado" arriba).
- Agregar un campo de código de barras al formulario de alta manual de variante en el **admin de escritorio** (`VariantEditor.tsx`, sección "Agregar variante") — nice-to-have para consistencia, evaluado en `plan.md`, no bloquea este ticket.
