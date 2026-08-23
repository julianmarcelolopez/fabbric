# T22 — Carga Masiva de Productos

## Contexto

Sistema de inventario para un local de ropa, usando **Google Sheets** como base de datos y **AppSheet** como interfaz (celular) para escanear productos al recibirlos o venderlos. El local no tenía inventario digitalizado; solo llevaban registro en papel de las ventas (egresos), sin control de stock ni de lo que ingresa.

La carga inicial del catálogo se está haciendo producto por producto, escaneando cada prenda física desde el celular (no existía ninguna lista digital previa para importar). Este requerimiento (T22) cubre la carga masiva: el camino alternativo para cuando sí existe una lista de productos ya digitalizada (ej. entregada por el proveedor, o cargada desde una compu) y no tiene sentido escanear uno por uno.

## Objetivo

Contar con una vía de carga masiva confiable hacia el catálogo de productos, que conviva con la carga por escaneo individual sin generar duplicados ni romper la estructura de datos.

## Estructura de datos (hoja "Catalogo_Productos")

Una fila = un producto único, identificado por su código de barras.

| Columna | Tipo | Descripción |
|---|---|---|
| `codigo_barras` | Texto (clave única, obligatoria) | Código escaneado de la prenda. No debe repetirse ni estar vacío. |
| `marca` | Texto | Marca del producto. |
| `modelo` | Texto | Ej: Remera, Sweter, Campera. |
| `talle` | Texto | S, M, L, XL, numérico, etc. |
| `color` | Texto | |
| `descripcion` | Texto (opcional) | Detalle adicional, puede quedar vacío. |
| `precio` | Numérico | Precio de venta. Sin símbolo de moneda ni separadores de miles. |
| `imagen` | Texto (ruta, no binario) | Referencia a la foto del producto — ver sección siguiente. |

Ejemplo de fila:
```
0923,TAVERNITI,REMERA,S,Blanca,,25000,productos_imagenes/0923.jpg
```

## Manejo de imágenes

La columna `imagen` **no contiene la foto**, contiene una ruta/nombre de archivo que apunta a una imagen guardada aparte en Google Drive, en una carpeta `<NombreTabla>_Images` (en esta app, `productos_Images`).

Hay dos formas de que esa imagen exista realmente:

1. **Carga manual**: alguien sube el archivo de imagen a la carpeta de Drive, con el nombre que se le quiera dar.
2. **Captura desde AppSheet** (recomendado, y la vía real usada hoy): al escanear el producto desde el celular, se saca la foto con la cámara dentro de la misma app. AppSheet la sube sola a la carpeta `productos_Images` de Drive y completa el valor de la columna `imagen` automáticamente.

**Confirmado con el usuario (2026-08-10):** el nombre de archivo que genera AppSheet al sacar la foto desde el celular **no es** `<codigo_barras>.jpg`. Sigue un patrón auto-generado propio de AppSheet, del tipo `productos_Images/<algo>.imagenes.<timestamp>.<ext>` (ver ejemplo real en `analisis.md`, sección "Validación contra archivo real de ejemplo"). Cualquier lógica de carga masiva o de validación de estructura **no debe asumir** que el nombre de archivo de imagen coincide con el código de barras del producto — esa convención solo aplicaría si alguien sube una imagen a mano y la nombra así manualmente.

Si en la carga masiva vienen rutas de imagen que no tienen su archivo correspondiente en Drive, esa referencia queda rota (la app no va a poder mostrar la foto) hasta que se suba el archivo con ese nombre exacto.

## Flujo general del sistema

- **AppSheet** lee y escribe directamente sobre esta Google Sheet — no hay una base de datos separada.
- **Carga inicial de inventario**: producto por producto, escaneando cada prenda física desde el celular.
- **Carga masiva** (alcance de T22): para lotes de productos que llegan como lista digital, sin escanear uno por uno.
- **Movimientos de entrada/salida** (ventas y reposición de stock): todavía no definidos, pendiente de una tabla separada (fuera de alcance de T22).

## Alcance de T22

1. Validar que la estructura de la hoja/archivo de origen sea compatible con `Catalogo_Productos` antes de cargar (ver `analisis.md`).
2. Definir e implementar cómo se dispara la carga masiva desde la app (botón en la vista Productos), incluyendo la lógica de validación e inserción.

## Criterios de aceptación

- No se generan filas duplicadas por `codigo_barras`.
- Los campos obligatorios (`codigo_barras`, `precio`) no pueden quedar vacíos; si faltan, esa fila se reporta como error y no se carga.
- Los campos opcionales (`descripcion`, `imagen`) pueden quedar vacíos sin que falle la carga.
- Al finalizar la carga se reporta un resumen: filas agregadas, filas omitidas por duplicado, filas con error.
