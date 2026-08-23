# Análisis — T22 Carga Masiva de Productos

Ver `overview.md` para el contexto completo y la estructura de datos.

Este análisis evalúa la Tarea 1 (validar compatibilidad de estructura) y la Tarea 2 (botón de carga masiva en AppSheet) definidas para T22: si son ejecutables sin ambigüedad y si el diseño propuesto es técnicamente sólido. No implica implementación de código — eso queda para una etapa posterior, una vez resueltos los puntos abiertos.

### Tarea 1 — Validar compatibilidad de estructura

**Estado: no ejecutable tal cual.** El prompt depende de "[pegar acá el link o adjuntar el archivo]" — todavía no hay una hoja de Google Sheets real ni un archivo adjunto para analizar. Antes de correr esta tarea hace falta el link/archivo del proveedor o de la carga a auditar.

Además de eso, el prompt deja sin definir varias reglas que un agente necesita para no reportar falsos positivos/negativos:

- **Qué cuenta como "fila con datos incompletos".** `overview.md` solo exige `codigo_barras` y `precio` como obligatorios; `descripcion` e `imagen` son opcionales explícitamente. El prompt de Tarea 1 no aclara si `marca`, `modelo`, `talle` o `color` vacíos también deben reportarse como error o solo como advertencia. Sin esta precisión, el agente puede sobre-reportar filas válidas como incompletas.
- **Criterio de "tipo de dato incorrecto" en `precio`.** Google Sheets no tiene tipado estricto de columna; hay que definir la regla operativa (ej.: el valor debe poder interpretarse como número tras remover símbolo de moneda y separador de miles; si no, se reporta). El prompt menciona el caso "precio como texto" pero no la regla de detección.
- **Duplicados y comparación de `codigo_barras`.** No especifica si la comparación es case-sensitive, ni si se deben recortar espacios en blanco antes de comparar (un error común al pegar datos de Excel/proveedor).
- **Filas vacías al final de la hoja.** Google Sheets suele traer filas en blanco de sobra (rango extendido); el prompt no aclara que estas deben ignorarse y no reportarse como "código de barras vacío".
- **Fuera de alcance que conviene dejar explícito.** Según `overview.md`, una referencia de imagen rota (archivo inexistente en Drive) es un estado válido y temporal, no un error de carga. El prompt de Tarea 1 no dice si hay que verificar contra Drive que el archivo de `imagen` exista — conviene aclarar que esa verificación **no** es parte de esta tarea (evita que el agente intente acceder a la API de Drive innecesariamente).

**Recomendación:** completar el prompt con estas reglas antes de ejecutarlo, y adjuntar la hoja/archivo real a validar.

### Tarea 2 — Botón de carga masiva en AppSheet

**Viabilidad: confirmada.** El diagnóstico del prompt es correcto — AppSheet no tiene importación de CSV nativa desde el celular, y el patrón staging sheet + Apps Script (Web App) + acción "Call a webhook" es el workaround estándar y la única forma de lograr un botón real dentro de la app. No hace falta buscar una alternativa fuera de este enfoque.

Sin embargo, el prompt da por sentados varios detalles de diseño que no son triviales y que van a determinar si la implementación funciona como se espera:

1. **Cómo se muestra el resultado en la app.** La acción "Call a webhook" de AppSheet dispara la llamada HTTP pero no tiene forma nativa de tomar la respuesta y mostrarla en la UI. Para que el usuario vea "filas agregadas / omitidas / con error" hace falta que el Apps Script escriba ese resumen en una celda o fila de la propia hoja (ej. `Carga_Masiva_Staging!Resultado`), y que el botón en AppSheet, después de disparar el webhook, fuerce una sincronización y navegue a una vista que lea esa celda. El prompt lo da por hecho ("muestra el resultado") sin especificar este mecanismo.
2. **Seguridad del Web App.** Para que AppSheet lo pueda invocar sin flujo OAuth, el Apps Script normalmente se publica con acceso "Anyone" — eso deja un endpoint abierto que puede escribir en la planilla si la URL se filtra. Falta especificar un token/secreto validado dentro del script (comparado contra un valor guardado en Script Properties) para no dejar el catálogo expuesto a escritura anónima.
3. **Duplicado vs. actualización (upsert).** El prompt dice "evitando duplicados por `codigo_barras`" pero no define qué pasa si el producto ya existe y la fila de staging trae datos nuevos (por ejemplo, reposición de stock del mismo producto con precio actualizado). Si la regla es simplemente "ignorar si ya existe", se pierde la posibilidad de usar esta misma vía para actualizar productos existentes — algo que puede chocar con los "movimientos de entrada/salida" que `overview.md` deja pendientes de diseño. **Esto es una decisión de negocio que conviene confirmar con el usuario antes de programar el script**: ¿duplicado = se descarta silenciosamente, o se actualiza el registro existente?
4. **Limpieza de la hoja de staging.** No está definido si las filas ya procesadas se borran, se marcan como "procesadas" o quedan tal cual. Dejarlas sin marcar no rompe la lógica de duplicados (se re-detectarían como ya existentes), pero genera confusión operativa y hace más difícil auditar qué se cargó en cada corrida. Conviene definir explícitamente el comportamiento.
5. **Concurrencia.** Apps Script escribiendo sobre la hoja mientras AppSheet sincroniza en paralelo puede causar colisiones puntuales; se resuelve con `LockService` en el script, pero no está mencionado en el prompt.
6. **Límites de ejecución.** Los Web Apps de Apps Script en cuentas gratuitas tienen un límite de ejecución de ~6 minutos por llamada. Para los volúmenes esperados (lotes de un proveedor, probablemente decenas o cientos de filas) no debería ser un problema, pero conviene confirmar con el usuario el volumen típico de una carga masiva antes de asumir que nunca se va a acercar al límite.

**Conclusión:** el enfoque propuesto es viable y es el camino correcto. Antes de pasar a implementación (que no es parte de este análisis) conviene resolver el punto 3 (upsert vs. descarte) como decisión de negocio, y dejar explícitos los puntos 1, 2 y 4 como parte del diseño técnico del Apps Script.

## Validación contra archivo real de ejemplo — `ELIATHI - STOCK PRODUCTOS.xlsx`

Se recibió un archivo Excel real (exportado de la hoja de AppSheet, pestaña `productos`) con 2 filas de datos de ejemplo, más 31 pestañas vacías adicionales (`Hoja 3` a `Hoja 33`, `Hoja 4`) que no tienen contenido y se pueden ignorar. Se inspeccionó el archivo a nivel de celda (no solo la vista renderizada) para confirmar tipos de dato reales, no solo el texto visible.

**Columnas encontradas (en orden):** `codigo_barras, marca, modelo, talle, color, descripcion, precio, stock, imagenes`

### Comparación contra el modelo de `overview.md`

| Modelo (`overview.md`) | Archivo real | Coincide |
|---|---|---|
| `codigo_barras` (texto, clave única) | `codigo_barras` — guardado como texto real (no numérico), preserva el `0923` con cero a la izquierda | Sí |
| `marca` | `marca` | Sí |
| `modelo` | `modelo` | Sí |
| `talle` | `talle` | Sí |
| `color` | `color` | Sí |
| `descripcion` (opcional) | `descripcion` — vacía en ambas filas | Sí |
| `precio` (numérico) | `precio` — guardado como número real (25000, 149990), no texto | Sí |
| `imagen` | `imagenes` (**plural**) | **No** — nombre de columna distinto |
| *(no existe en el modelo)* | `stock` — numérico (1, 1) | **No** — columna extra, no contemplada en `Catalogo_Productos` |

*(El PDF de referencia muestra un borde de una décima columna vacía al final; se confirmó contra el XML crudo del archivo que no existe tal columna — es un artefacto del export a PDF, no un dato real.)*

### Hallazgos

1. **Columna `stock` no contemplada en el modelo (el más importante).** El archivo real del local/proveedor ya trae una cantidad de stock por producto, pero `overview.md` define explícitamente que el control de stock/movimientos "todavía no está definido, pendiente de una tabla separada" y `Catalogo_Productos` no tiene ese campo. Esto es una **decisión de producto, no de estructura**, y hay dos caminos:
   - Descartar la columna `stock` en la carga masiva (se ignora, y el conteo de stock se sigue manejando aparte cuando se diseñe esa tabla), o
   - Sumar `stock` como columna nueva de `Catalogo_Productos` ahora, ya que el dato llega naturalmente en cada carga masiva y perderlo sería desperdiciar información que el proveedor ya entrega.
   
   Ninguna decisión es "incorrecta", pero hay que tomarla antes de definir el mapeo de columnas de la carga masiva.

2. **Nombre de columna `imagenes` vs. `imagen`.** El archivo trae la columna en plural; el modelo la define en singular. Si el validador de la Tarea 1 exige coincidencia exacta de nombre (tal como está redactado el prompt: "nombres de columna distintos" se reporta como discrepancia), esta hoja fallaría la validación aunque el contenido sea compatible. Recomiendo que el mapeo de la carga masiva tolere alias conocidos (`imagenes` → `imagen`) en vez de exigir coincidencia exacta — o pedirle a quien genera el archivo que use el nombre singular.

3. **Espacios en blanco sobrantes en los campos de texto.** Se encontró `"TAVERNITI "` (espacio final en `marca`), `"              S"` (14 espacios antes de la `S` en `talle`) y `" Blanca"` (espacio inicial en `color`). No rompen la estructura, pero ensucian el dato: por ejemplo, un filtro por talle `"S"` no matchearía `"              S"` tal cual está guardado. **La carga masiva debe hacer `trim()` de todos los campos de texto antes de insertar.**

4. **La ruta de `imagenes` no sigue la convención documentada en `overview.md`, y hay un mismatch real de datos.** `overview.md` dice que la convención es `productos_imagenes/<codigo_barras>.jpg`. Lo que aparece en el archivo es:
   - Fila 1 (`codigo_barras = 0923`): `productos_Images/03332421803043.imagenes.145400.` — referencia el código de barras de la **otra** fila, no el propio, y el path termina en un punto sin extensión de archivo (parece incompleto).
   - Fila 2 (`codigo_barras = 03332421803043`): `productos_Images/03332421803043.imagenes.003453.jpg` — el prefijo sí coincide con su propio código de barras, pero el nombre completo no es `03332421803043.jpg` sino que tiene un sufijo adicional (`.imagenes.003453`).
   - La carpeta se llama `productos_Images` (con mayúscula), no `productos_imagenes` como dice `overview.md`.

   **Confirmado con el usuario (2026-08-10):** el patrón `<algo>.imagenes.<número>.<ext>` es efectivamente el nombre que **AppSheet genera automáticamente** al sacar la foto desde el celular — no es algo que se defina manualmente. La convención simple `codigo_barras.jpg` que tenía documentada `overview.md` no reflejaba el comportamiento real, así que ya se corrigió esa sección del documento. Cualquier lógica de emparejamiento imagen-producto en la carga masiva no puede asumir que el nombre de archivo contiene el código de barras — solo aplicaría a imágenes subidas a mano con esa convención.

### Conclusión de compatibilidad

La estructura **no es 100% compatible tal cual** con el modelo de `overview.md`. No hay problemas de tipo de dato (texto vs. número están bien resueltos en el archivo real), pero sí hay que resolver, antes de dar por buena la carga masiva:

- Qué hacer con `stock` (sumarlo al modelo o descartarlo).
- Tolerar `imagenes` como alias de `imagen` en el mapeo, o exigir que se renombre en origen.
- Sanitizar (trim) todos los campos de texto en la inserción.
- No asumir la convención `codigo_barras.jpg` para las imágenes sin antes confirmar el patrón real que usa AppSheet.

### Preguntas abiertas nuevas (a partir del archivo de ejemplo)

- ¿Se agrega `stock` como campo del modelo de `Catalogo_Productos` ahora, o se descarta en la carga masiva y se maneja después con la tabla de movimientos pendiente?
- ~~¿Se puede confirmar en la app AppSheet real cuál es el patrón exacto de nombre que genera al subir una foto desde la cámara?~~ **Confirmado (2026-08-10):** sí, el nombre que aparece en el archivo de ejemplo es el real, generado por AppSheet al sacar la foto — no sigue la convención `codigo_barras.jpg`. Ver corrección en `overview.md`.
- ¿El archivo de origen para la carga masiva se puede pedir siempre con la columna llamada `imagen` (singular, igual al modelo), o el validador tiene que tolerar variantes como `imagenes`?

### Resumen de bloqueos/pendientes

| # | Ítem | Tipo | Bloquea implementación |
|---|---|---|---|
| 1 | Falta el link/archivo real de la hoja a validar (Tarea 1) | Insumo faltante | Parcialmente resuelto — ya hay un archivo de ejemplo (`ELIATHI - STOCK PRODUCTOS.xlsx`), aunque con solo 2 filas de muestra |
| 2 | Reglas de validación no precisadas (obligatoriedad de marca/modelo/talle/color, comparación de duplicados, filas vacías) | Ambigüedad de prompt | No bloquea, pero conviene resolver antes de correr Tarea 1 |
| 3 | Mecanismo para mostrar el resumen de resultado en AppSheet | Detalle de diseño faltante | Sí, para Tarea 2 |
| 4 | Manejo de duplicado: ¿descartar o actualizar (upsert)? | Decisión de negocio | Sí, para Tarea 2 |
| 5 | Seguridad del Web App (token/secreto) | Detalle de diseño faltante | Recomendado antes de publicar, no bloquea el desarrollo |
| 6 | Limpieza/marcado de filas procesadas en staging | Detalle de diseño faltante | No bloquea, pero conviene definirlo antes de implementar |
| 7 | Columna `stock` en el archivo real, no contemplada en el modelo | Decisión de producto | Sí — condiciona el mapeo de columnas de la carga masiva |
| 8 | Nombre de columna `imagenes` (plural) vs. `imagen` (modelo) | Discrepancia de estructura | Sí, si el validador exige coincidencia exacta de nombre |
| 9 | Convención real de nombres de archivo de imagen (no coincide con `codigo_barras.jpg`) | Supuesto del modelo | **Resuelto (2026-08-10)** — confirmado con el usuario y corregido en `overview.md`; ninguna lógica debe asumir que el nombre de archivo contiene el código de barras |
