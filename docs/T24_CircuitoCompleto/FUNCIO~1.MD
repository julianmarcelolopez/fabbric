# Catálogo de funcionalidades — circuito Eliathi Modas

Desglose del circuito completo que se pensó para la tienda (carga de productos, publicación web, proveedores, envíos, ventas y facturación) en funcionalidades individuales, cruzadas contra lo que ya existe en la plataforma. El estado de cada una está tomado de lo ya documentado en tickets anteriores (T2/T4/T6/T7/T9, T22, T23) — falta confirmarlo contra el código real, ver el prompt de auditoría al final.

| # | Funcionalidad | Descripción | Ticket / documento de referencia | Estado (a confirmar) |
|---|---|---|---|---|
| 1 | Catálogo de productos | Alta, edición y categorías de producto desde el admin de escritorio | Ya existente en fabbric | Implementado |
| 2 | Código de barras por producto | Columna `barcode` en `productVariants` + búsqueda por código | T23, Fase 1 | No implementado (especificado) |
| 3 | Control de stock por movimientos | `stockMovements`: entrada / venta / ajuste / sync, por canal (local/online) | T4 | Implementado |
| 4 | Venta presencial en un paso | Escaneo → carrito → confirmar venta (`POST /admin/orders/venta-local`) desde el celular | T23, Fases 1, 3-5 | No implementado (especificado) |
| 5 | Medios de pago / carteras / finanzas | Registro de cobro por medio de pago, movimiento financiero vinculado a una cartera | T9 (base) + T23 (selector desde el celular) | Base implementada; falta el selector móvil |
| 6 | Publicación selectiva en tienda online | Elegir qué prendas se muestran también en el sitio web (`visibleInCatalog`) | Campo de schema ya existe; falta UI de alta/edición | Parcial |
| 7 | Gestión de proveedores | Atar cada entrada de stock a un proveedor, para ver qué trajo cada uno (conecta con el problema real: proveedor familiar que trae mercadería no pedida) | Sin ticket todavía | No implementado |
| 8 | Envíos | Edgar los maneja manualmente (OCA / Correo Argentino) | Fuera de alcance del sistema por ahora | No aplica |
| 9 | Facturación electrónica ARCA/AFIP | Generar factura solo cuando el cliente la pide, no automática | Diferido, sin ticket activo | No implementado |
| 10 | Carga masiva de productos (CSV) | Alternativa a escanear uno por uno, para listas ya digitalizadas | T23, Fase 6 (diseño resuelto) | Diseñado, implementación diferida a propósito |
| 11 | Panel de stock / diagnóstico | Ver de un vistazo todo lo que entra y sale | `StockPage` en el admin de escritorio | Implementado (precisión depende de que todas las ventas pasen por el sistema) |

## Prompt para Claude Code — auditoría de estado real

> Leé este documento (`docs/funcionalidades_eliathi_modas.md`) y verificá, contra el código real de `backend/` y `frontend/`, cuál es el estado real de cada una de las 11 funcionalidades: implementado, parcial, no implementado, o no aplica. Para cada una que exista, indicá el archivo, endpoint o tabla concreta que la resuelve. Para las marcadas "a confirmar", decime si la columna Estado que puse coincide con lo que encontraste en el código, o si hay que corregirla. No implementes ni modifiques nada — el resultado de esta tarea es actualizar la columna Estado de la tabla con lo que confirmaste, y agregar una fila de notas debajo de cada funcionalidad donde el estado real no coincida con lo documentado.
