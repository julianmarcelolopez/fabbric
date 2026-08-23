# Diagnóstico — T23 App de ingreso/egreso de productos

Revisión cruzada de `overview.md`, `analisis.md`, `implementacion.md`, `plan.md` y `mockup.html`, con el mismo criterio usado para revisar T22 vs T23: señalar contradicciones, gaps sin resolver y supuestos no triviales que un prompt da por sentado.

## 1. Coherencia entre documentos

### 1.1 Contradicción real: columna `stock` del proveedor (la más importante)

`plan.md` Fase 0, punto 3, exige resolver esto antes de programar:

> "si el archivo trae una cantidad inicial por producto, cada fila con stock > 0 debe generar un movimiento `entrada` al cargarse — si no, se pierde esa cantidad inicial."

Pero **ni `overview.md` ni `implementacion.md` lo contemplan**:

- El modelo de `productos` en `overview.md` no tiene campo `stock` (correcto, el stock se calcula desde `movimientos` — pero eso no resuelve de dónde sale el movimiento inicial de la carga masiva).
- Prompt 6 de `implementacion.md` fija las columnas del CSV de forma cerrada: `codigo_barras, marca, modelo, talle, color, descripcion, precio, imagen_url` — **sin `stock`**. Tal como está redactado, no hay forma de que ese prompt genere los movimientos de entrada que plan.md exige.

Origen del gap: viene del hallazgo real documentado en `docs/T22_Carga_Masiva_Productos/analisis.md` (el Excel real `ELIATHI - STOCK PRODUCTOS.xlsx` trae una columna `stock` no contemplada en el modelo original). Ese hallazgo se trasladó a `plan.md` como gap de Fase 0, pero **nunca se trasladó a `overview.md` ni a `implementacion.md`** — quedó huérfano en un solo documento.

### 1.2 Upsert vs. duplicado: el prompt ya decidió antes de que se decida

`plan.md` Fase 0, punto 1, lo lista como pregunta abierta ("¿se actualiza o se descarta y se reporta como conflicto?"). Pero Prompt 6 de `implementacion.md` ya prescribe el comportamiento sin condicionarlo a ninguna decisión: "omitir duplicados ya existentes". Si la decisión de negocio terminara siendo "actualizar" (upsert), Prompt 6 queda mal escrito. Vale la pena notar que este mismo punto ya había quedado abierto en `T22/analisis.md` (punto 3 de la Tarea 2, marcado ahí como "decisión de negocio a confirmar con el usuario") y parece haberse arrastrado sin resolverse realmente, solo re-etiquetado como gap en T23.

### 1.3 Sanitización: mencionada en plan.md, ausente en el prompt de implementación

`plan.md` Fase 0, punto 2, pide definir `trim` (y opcionalmente normalizar mayúsculas/minúsculas). Prompt 6 de `implementacion.md` no menciona sanitización en ningún punto — solo valida obligatoriedad de `codigo_barras` y tipo numérico de `precio`. El hallazgo que motivó este gap (`T22/analisis.md`, punto 3: `"TAVERNITI "`, `"              S"` con 14 espacios, `" Blanca"`) es concreto y real, no hipotético — pero no llegó al prompt.

### 1.4 Transacción atómica de venta: sigue siendo una intención, no un diseño

El stack de `plan.md` es explícito: *"El cliente JS no garantiza atomicidad entre tablas; la venta + sus movimientos deben confirmarse como una sola operación"* vía función RPC. Pero:

- `plan.md` Fase 0, punto 4, dice "diseñar la función RPC" — es una tarea pendiente, no un diseño resuelto.
- Prompt 1 (`implementacion.md`, esquema Supabase) **no pide crear la función RPC de venta** — solo pide la vista/función de stock, el bucket y Auth.
- Prompt 5 (`implementacion.md`, carrito) pide que la confirmación "se ejecute como una sola operación (transacción)" pero no menciona que deba ser vía RPC, ni su nombre, ni su firma.
- `analisis.md` es el único lugar que menciona "vía RPC atómica" (en la tabla de pantallas), pero sin ningún detalle técnico.
- Ningún documento define: parámetros de la función (¿array de `{producto_id, cantidad}` + `medio_pago`?), si valida stock insuficiente antes de vender, ni si el `total` se recalcula server-side desde los precios actuales o se confía en el valor que manda el cliente.

### 1.5 Mockup vs. documentos: falta selector de medio de pago

`overview.md` y Prompt 5 dicen que `ventas.medio_pago` se completa al confirmar la venta. En `mockup.html` no existe ningún selector de medio de pago — ni en Carrito ni en Confirmar venta; está *hardcodeado* en el JS del prototipo (`'Total $' + total + ' · Efectivo'`, línea 223). La interacción real (¿dropdown antes de confirmar? ¿botones tipo chip?) no está definida en ningún documento.

### 1.6 Mockup vs. documentos: falta captura de cantidad en "Registrar entrada"

`overview.md`, `analisis.md` y Prompt 4 dicen que "Registrar entrada" permite indicar una cantidad. En el mockup, el botón `btn-entrada` de la ficha va directo de vuelta a Escanear sin pedir cantidad — no hay campo ni modal. La UI real de este paso no está prototipada ni especificada (¿input numérico en la misma ficha? ¿modal aparte?).

### 1.7 RLS mencionado en plan.md, ausente en overview.md y en el prompt

`plan.md` Fase 1 incluye "Configurar Auth (usuario/contraseña) y **RLS** en las tres tablas" como checklist. `overview.md` no menciona RLS en ningún momento, y Prompt 1 de `implementacion.md` tampoco lo pide explícitamente (solo pide Auth usuario/contraseña). Esto importa porque Supabase activa RLS en modo "deny all" por defecto al crear tablas desde el dashboard — si nadie define políticas explícitas, la app queda bloqueada aunque el resto esté bien implementado. Es un gap silencioso: no está mal encaminado, pero falta que alguno de los documentos de referencia (`overview.md` sería el lugar natural) diga qué política aplica (ej. "cualquier usuario autenticado puede leer/escribir en las 3 tablas").

## 2. Estado de los gaps de Fase 0

El mensaje menciona 3 gaps; `plan.md` en realidad lista **4** en su Fase 0. Los reporto todos porque el cuarto (columna `stock`) es el que más bloquea, y omitirlo del diagnóstico sería repetir el mismo patrón que este ticket busca evitar.

| # | Gap (plan.md) | Estado | Qué falta decidir |
|---|---|---|---|
| 1 | Upsert vs. duplicado en carga masiva | **Parcialmente resuelto, pero no confirmado como decisión** | Prompt 6 ya implementa "descartar duplicado" de facto. Falta una confirmación explícita de que esa es la decisión final (no una que un prompt tomó por default) — sobre todo porque el caso de uso típico (reposición con precio actualizado) es justamente el que "descartar" no cubre. |
| 2 | Sanitización de texto (trim / normalizar case) | **No resuelto** | Falta definir: ¿trim en qué campos exactamente (todos los de texto)? ¿normalizar mayúsculas/minúsculas sí o no (plan.md lo deja como "opcional", sin decidir)? Y falta trasladarlo a Prompt 6, que hoy no lo menciona. |
| 3 | Columna `stock` del proveedor en la carga masiva | **No resuelto y contradictorio** | Es una decisión de modelo de datos, no de detalle: si se agrega, hay que definir cómo la carga masiva crea el `movimiento` de `entrada` (necesita el `producto_id` recién insertado, y probablemente sea un solo movimiento con `cantidad = stock`, no N filas). Si se descarta, hay que decirlo explícitamente en `overview.md` para que no vuelva a aparecer como gap. Hoy no está en ninguno de los dos estados — simplemente no está contemplada en el CSV de Prompt 6. |
| 4 | Transacción atómica de venta vía RPC | **No resuelto** | No hay firma de función, ni validación de stock insuficiente (nada impide vender más de lo disponible, en ningún documento), ni definición de si el `total` se recalcula server-side. Prompt 1 debería pedir crear esta función explícitamente; Prompt 5 debería invocarla por nombre. |

**Ninguno de los 4 está lo suficientemente definido para empezar a implementar directamente.** El 1 es el más cerca de estar resuelto (solo falta confirmarlo), el 3 y el 4 requieren decisiones de diseño reales antes de escribir los prompts finales de Fase 1 y Fase 6.

## 3. Supuestos no triviales no especificados

Además de los ya mencionados en la sección 1 (RLS, medio_pago, cantidad en entrada, columna stock, firma del RPC):

- **"Usuario/contraseña simple" contra Supabase Auth.** Supabase Auth nativo identifica usuarios por email (o teléfono), no por un "usuario" arbitrario. El mockup pide un campo "Usuario" (no email), y `overview.md` dice "usuario/contraseña simple" sin aclarar si es un email disfrazado (ej. `vendedor1@eliathi.local`) o si hace falta una tabla/mapeo custom username→email. Prompt 2 no lo resuelve — asume que "usar Supabase Auth" ya responde la pregunta, y no es así.
- **Validación de stock insuficiente al vender.** Ningún documento dice qué pasa si se intenta confirmar una venta con más cantidad de la que hay en stock (¿la RPC debe rechazarla? ¿permite stock negativo?). Dado que el stock se calcula en tiempo real, esto es fácil de pasar por alto hasta que se define la RPC.
- **Origen de `imagen_url` en la carga masiva.** Prompt 6 asume que el CSV trae URLs de imagen ya válidas y accesibles (no rutas relativas tipo Google Drive, que era el caso real en T22). No se especifica qué pasa si la URL no apunta a Supabase Storage, está rota, o el proveedor no tiene fotos digitalizadas — casos que sí aparecían documentados en T22.
- **Compresión/tamaño de imagen al subir desde el celular.** Prompt 3 (alta de producto) no menciona resize/compresión antes de subir al bucket. En una PWA usada desde datos móviles en un local, esto puede ser relevante para Fase 7 ("pulido"), pero conviene que quede anotado como decisión pendiente y no solo implícito en "pulido y pruebas".
- **Contrato de la vista/función de stock.** Prompt 1 dice "Creá una vista o función que calcule el stock" sin definir cuál de las dos, ni su firma (¿función `get_stock(producto_id)` para la ficha individual, o vista `stock_por_producto` consultable por REST para listados futuros?). Ambas cosas son válidas pero determinan cómo se consulta desde el frontend.
- **Pantalla vs. script para la carga masiva (Fase 6).** Tanto `overview.md` como `plan.md` dejan abierto si es "pantalla de escritorio o script". No es bloqueante para empezar Fases 1-5, pero si se resuelve tarde puede afectar en qué carpeta del monorepo vive ese código.

## 4. Veredicto

**No está listo para implementar tal cual.** Bloquea empezar, en orden de impacto:

1. **Resolver la contradicción de la columna `stock`** (sección 1.1 / gap 3): decidir si se agrega al modelo y al CSV de Prompt 6, con su lógica de movimiento de entrada, o si se descarta explícitamente en `overview.md`. Esto cambia el modelo de datos y reescribe Prompt 6.
2. **Diseñar la función RPC de venta** (sección 1.4 / gap 4): firma, parámetros, validación de stock insuficiente, y si el total se recalcula server-side. Sin esto, Prompt 1 y Prompt 5 quedan incompletos y Fase 5 no se puede prometer como "atómica" de verdad.
3. **Confirmar formalmente la decisión de upsert vs. descarte** (gap 1) — hoy vive implícita en la redacción de Prompt 6, no como una decisión tomada a conciencia.
4. **Sumar la regla de sanitización a Prompt 6** (gap 2) — trim como mínimo, y decidir si se normaliza case.
5. **Definir la política de RLS** de las 3 tablas antes de ejecutar Prompt 1, para que la app no quede bloqueada por el default de Supabase.
6. **Aclarar el mecanismo de login** (usuario vs. email en Supabase Auth) antes de Prompt 2.
7. **Resolver los dos mismatches del mockup** (medio_pago sin selector, cantidad sin captura en "Registrar entrada") o decidir explícitamente que quedan simplificados (medio_pago fijo, cantidad fija en 1) para esta versión.
8. **Definir el contrato de la vista/función de stock** antes de Prompt 1.

Los puntos 1-4 son los que más impactan alcance y estructura de datos — conviene cerrarlos antes de tocar la Fase 1. Los puntos 5-8 son detalles concretos pero rápidos de decidir; igual conviene dejarlos explícitos en los documentos (no solo en este diagnóstico) antes de convertir las fases de `plan.md` en checklists accionables, para no repetir el patrón que motivó esta revisión.

---

**Nota aparte (no bloqueante):** sobre el nombre de la carpeta nueva para la PWA en el monorepo (junto a `backend/` y `frontend/`) — quedó pendiente de tu confirmación, no lo definí acá. Cuando lo charlemos, mi sugerencia sería algo corto y consistente con el patrón existente (ej. `pwa/` o `app-tienda/`), pero es tu llamada.
