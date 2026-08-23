# Fase 3 — Escaneo, alta y ficha de producto

## Objetivo (según plan.md)

Implementar la pantalla "Escanear" y las dos ramas a las que deriva: Alta de producto (código nuevo) y Ficha de producto (código existente) — contra el catálogo real (`products`/`productVariants`) del backend existente.

## Por qué está subdividida

Mismo criterio que las Fases 1 y 2: separar por riesgo. El diseño original de esta fase (3 llamadas HTTP separadas para dar de alta un producto) podía dejar productos huérfanos si fallaba a mitad de camino — se revisó a fondo antes de escribir código y se resolvió con un endpoint atómico nuevo, mismo patrón que `venta-local` en la Fase 1. Esa pieza de backend queda separada de las pantallas de la PWA, que a su vez se separan entre sí porque el escaneo (cámara/hardware) tiene un tipo de riesgo distinto al de mostrar datos de un producto ya existente.

## Decisiones que marcan esta fase

- **`POST /admin/products/alta-rapida`**: crea `product` + `productVariant` en una sola transacción — si falla cualquier parte, no queda nada escrito. Elimina el riesgo real que tenía el diseño original (un producto sin variante, invisible por código de barras pero visible y confuso en el panel de escritorio).
- **La foto es un segundo paso, deliberadamente no atómico con lo anterior** — técnicamente no puede serlo (es una subida `multipart` que necesita el `id` del producto ya creado). Pero como el producto ya queda completo y vendible sin ella, un fallo acá no es grave: se ofrece reintentar solo la foto, sin perder los datos del formulario. Mismo nivel de tolerancia que ya tiene todo fabbric con productos sin imagen.
- **`visibleInCatalog: false` fijo al dar de alta por escaneo** — como la foto puede tardar o fallar, un producto recién escaneado no debe aparecer de inmediato en la tienda online sin foto. El dueño lo activa a mano desde el panel de escritorio cuando está listo.
- **`stockLocal: 1` fijo, no lo manda el cliente** — la prenda física que el vendedor tiene en la mano al escanear por primera vez ya es stock real. Se fija del lado del backend para que nadie pueda mandar otro valor por error.
- **Captura de foto con `<input type="file" accept="image/*" capture="environment">`** — cámara nativa del celular, sin manejar un segundo `getUserMedia` propio además del que ya usa el escáner.
- **Navegación por estado, sin `react-router-dom`** — mismo modelo que `mockups.html` (confirmado: `pwa/package.json` no tiene router, a propósito).
- **Debounce obligatorio en el lector de código de barras** — sin esto, un solo escaneo real dispara la búsqueda contra `by-barcode` decenas de veces mientras la cámara sigue enfocando el mismo código.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-endpoint-alta-rapida](01-endpoint-alta-rapida/README.md) — `POST /admin/products/alta-rapida` | Fase 01 | ✅ Hecha |
| 2 | [02-escaneo](02-escaneo/README.md) — foto nativa + `zxing-wasm`, entrada manual de respaldo, integración con `by-barcode` | Fase 02 | ✅ Hecha (escaneo real funcionando, verificado en iPhone y desktop) |
| 3 | [03-alta-producto](03-alta-producto/README.md) — formulario + `alta-rapida` + foto con reintento | 1, 2 | ✅ Hecha (verificado por SQL, faltan casos borde: 409 en vivo y fallo forzado de red) |
| 4 | [04-ficha-producto](04-ficha-producto/README.md) — mostrar producto existente + stock | 2 | ✅ Hecha (verificado 15/15 con producto con foto y sin foto) |

## Criterios de aceptación de la fase completa

- [x] Escanear un código que no existe permite darlo de alta completo (con foto y categoría) en menos de 4 pasos.
- [x] Un fallo en la creación de producto/variante no deja nunca un producto huérfano — todo o nada, verificado por SQL.
- [x] Un fallo en la subida de la foto no rompe el alta — el producto queda usable y buscable igual, con opción de reintentar solo la foto (verificado a nivel de código/manejo de error; no se forzó un fallo de red real).
- [x] El producto dado de alta no aparece en la tienda online hasta que el dueño lo active a mano — verificado por SQL (`visible_in_catalog: false`).
- [x] Escanear un código existente muestra su ficha con el `stockLocal` correcto.
- [ ] El producto dado de alta por la PWA aparece también en el panel admin de escritorio (`frontend/`) — verificado por SQL contra la misma tabla, **no verificado visualmente en el panel `frontend/`**.
- [x] Un solo escaneo real dispara una sola búsqueda, no varias.

### Test combinado de punta a punta (2026-08-17)

Además de verificar cada tarea por separado, se corrió un test integrador (`test-e2e-full.mjs`) que ejercita el loop completo con datos reales, sin atajos por SQL para el estado intermedio:

1. Login real.
2. Escanear un código nuevo (entrada manual) → deriva a Alta.
3. Completar el formulario y guardar → `alta-rapida` real → paso de foto.
4. Subir una foto real → vuelve a Escanear.
5. **Volver a escanear el mismo código** → ahora deriva a Ficha (no a Alta) y muestra exactamente los datos recién cargados (marca, nombre, talle, color, precio, `stockLocal: 1`, la foto recién subida).
6. Volver a Escanear.

**12/12 PASS**, un único mensaje de consola (404 esperado, de la primera búsqueda del código inexistente). Esto confirma que las Tareas 1–4 funcionan integradas de verdad — el dato que persiste `alta-rapida` es exactamente el que después lee `by-barcode` y muestra `FichaScreen`, no solo que cada pantalla funciona con datos plantados a mano.

Datos de prueba (org, categoría, admin, producto/variante/imagen, archivo de Storage, usuario de Auth) creados y eliminados por completo al terminar — no quedó nada en la base real.

## Dependencias

- **La bloquean**: Fase 01 (`extender-backend`) y Fase 02 (`scaffold-app`) — ambas ya resueltas.
- **Bloquea**: Fase 04 (Registrar entrada) y Fase 05 (Agregar a la venta) del plan general — ambas son acciones de la Ficha de producto implementada acá.
