# Tarea 3 — Alta de producto (formulario + foto)

**Estado:** ✅ Hecha (2026-08-17) — flujo completo probado de punta a punta, datos verificados por SQL
**Depende de:** Tarea 1 (`01-endpoint-alta-rapida`) y Tarea 2 (`02-escaneo`)

## Objetivo

Formulario de alta rápida por escaneo: crea el producto de forma atómica y después sube la foto como paso aparte, resiliente a fallos.

## Pasos

- [x] Formulario de Alta: marca, modelo, talle, color, precio (input en pesos, convertido a centavos con `pesosToCents`, copiado a `pwa/src/lib/money.ts`), categoría (selector contra `GET /admin/categories`). El `barcode` viene precargado desde la Tarea 2, no es editable.
- [x] Al guardar: `POST /admin/products/alta-rapida` con los datos del formulario.
  - [x] Si 409 (`barcode` duplicado): mensaje claro (`Ya existe un producto con el código ${barcode}.`), no rompe la app. Implementado; **no probado en vivo** (fácil de forzar, pendiente si se quiere cubrir).
  - [x] Si 201: continúa al paso de foto con el `productId` devuelto.
- [x] Paso de foto: `<input type="file" accept="image/*" capture="environment">` → `POST /admin/products/:id/images` (reusa `apiUpload` de `pwa/src/lib/api.ts`).
  - [x] Si falla la subida: se muestra el error (`photoError`) y el botón "Sacar foto" sigue disponible para reintentar sin perder ni repetir los datos del formulario (no hay un botón "Reintentar" separado — es el mismo botón, ya que el `productId` no se pierde). Existe además "Continuar sin foto por ahora".
  - [x] Si tiene éxito, o si el vendedor elige continuar sin foto: vuelve a Escanear (`onDone`).

## Definition of Done

- [x] Alta completa con foto: `product` + `productVariant` + `productImages` creados correctamente, `visibleInCatalog: false`, `stockLocal: 1`, `barcode` correcto — **verificado por SQL** contra la org de prueba (ver "Cómo se verificó").
- [ ] Falla simulada en la subida de foto (ej. cortar la conexión a propósito) — **no probado**; el manejo de error está implementado (paso anterior) pero no se forzó un fallo real de red.
- [ ] El producto dado de alta aparece en el panel admin de escritorio (`frontend/`) — **no verificado visualmente en el panel**, sí confirmado por SQL que el row queda con `visible_in_catalog: false` en la misma tabla que usa `frontend/`.
- [x] Precio ingresado en pesos se guarda correctamente en centavos: probado con "19999,50" → `1999950` centavos, verificado por SQL.
- [x] Probado en navegador de punta a punta (Playwright, desktop/Docker) — 3/3 PASS.

## Cómo se verificó

- **Playwright** (`test-alta.mjs`, script de sesión): login con admin de prueba → entrada manual de un `barcode` inexistente → llega a Alta → completa marca/modelo/categoría/talle/color/precio → `Guardar producto` → pasa al paso de foto → sube `test-photo.png` (PNG válido generado con `zlib`, sin dependencias externas) → vuelve a Escanear. **3/3 PASS**, un único mensaje de consola (404 esperado, de la búsqueda inicial del código inexistente).
- **SQL directo** contra la org temporal (`7ec2eb3f-5088-4cd4-9dbf-a7407f28dd51`) tras el test: confirmó `products` (`name`, `brand`, `price: 1999950`, `visible_in_catalog: false`, `category_id` correctos), `product_variants` (`talle: "M"`, `color: "Negro"`, `barcode` correcto, `stock_local: 1`), y `product_images` (row con `url`/`storage_path` apuntando al archivo real subido a Storage).
- **Limpieza**: se borraron `product_images`, `product_variants`, `products`, `categories`, `admin_users`, `organizations` (la org temporal) por SQL, el archivo de Storage por `supabase-js` (`storage.from("product-images").remove(...)`), y el usuario de Supabase Auth de prueba (`auth.admin.deleteUser`). No quedó ningún dato de prueba en la base real.

## Pendiente (no bloquea, pero no se cubrió)

- Caso 409 (código duplicado) en vivo por UI.
- Fallo real de red durante la subida de foto (solo se verificó el manejo de error a nivel de código, no un fallo forzado).
- Verificación visual en `frontend/` de que el producto aparece listado y no-visible.

## Dependencias

- **La bloquean**: Tarea 1 (`alta-rapida`) y Tarea 2 (`escaneo`, que precarga el `barcode`).
- **Bloquea**: nada dentro de esta fase — pero junto con la Tarea 4 deja el catálogo listo para que las Fases 04/05 del plan general tengan productos reales con los que operar.
