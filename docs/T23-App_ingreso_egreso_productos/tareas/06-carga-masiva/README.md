# Fase 6 — Carga masiva por CSV (administración)

## ⏸️ DIFERIDA — no se implementa en esta pasada

**Motivo:** el camino real de carga inicial de catálogo es escanear cada producto físico (Fase 3), no importar un archivo — y una carga CSV tampoco podría traer la foto (hace falta la prenda en mano para eso), así que escanear ya cubre mejor el caso de uso real. `docs/plan_2.md` ya había tomado el mismo criterio para la demo ("Importación Excel/CSV: fuera de esta demo... es una mejora de operación para cuando cargue el catálogo completo").

Esta carpeta queda como **registro del diseño ya resuelto**, no como trabajo pendiente de esta iteración. Se retoma como ticket aparte si aparece un caso real (ej. un proveedor entrega una lista digitalizada, idealmente con fotos ya subidas).

## Objetivo original (según plan.md, para cuando se retome)

Cubrir el camino alternativo a escanear producto por producto: cargar un lote de productos desde un CSV ya digitalizado, sin generar duplicados y sin perder el stock inicial que traiga el archivo.

## Diseño ya resuelto (de la primera vuelta del diagnóstico — sigue siendo válido, hay que remapearlo)

- Aplicar `trim` a todos los campos de texto antes de validar o insertar. No normalizar mayúsculas/minúsculas.
- Validar `codigo_barras` (→ `barcode`) obligatorio y `precio` numérico; fila inválida → error, seguir con las demás.
- Si el `barcode` no existe: crear `product` + `productVariant` (remapeo pendiente: en el diseño original era un insert simple en una tabla `productos`; ahora son dos escrituras, product + variant, igual que en el alta por escaneo de Fase 3). Si trae `stock > 0`, crear un movimiento `entrada` en `stockMovements` (`channel: local`) para la variante recién creada.
- Si el `barcode` ya existe: actualizar los datos del `product`/`productVariant` correspondiente. No generar ningún movimiento de stock nuevo, aunque la fila traiga `stock`.
- Al finalizar, reportar un resumen: filas agregadas, actualizadas, con error.

## Al retomar esta fase, falta decidir además

- Pantalla de administración vs. script de línea de comandos (sigue abierto, no bloquea nada de las Fases 1-5/7).
- Cómo resolver `categoryId` (obligatorio en `products`) para productos nuevos que vienen del CSV — el alta por escaneo (Fase 3) lo resuelve con un selector manual; una carga masiva necesitaría una columna de categoría en el CSV o un mapeo/default.

## Dependencias

- **La bloquean**: Fase 01 (esquema de `productVariants.barcode` ya existente).
- **Bloquea**: nada de las fases activas — Fase 07 ya no depende de esta fase.
