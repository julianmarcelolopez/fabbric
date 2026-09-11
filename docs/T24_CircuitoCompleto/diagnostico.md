# Diagnóstico — estado real del circuito Eliathi Modas

Auditoría de `funcionalidades_eliathi_modas.md` contra el código real de `backend/`, `frontend/` y `pwa/` (la PWA de T23 vive en `pwa/`, no en `ventas-pwa/` — esa carpeta es un repo Git separado y no forma parte del monorepo ni de este circuito). Metodología: lectura directa de rutas, schema de Drizzle y pantallas, no de los documentos de ticket.

## Tabla actualizada

| # | Funcionalidad | Estado confirmado | Archivo / endpoint / tabla que lo resuelve |
|---|---|---|---|
| 1 | Catálogo de productos | **Implementado** | `backend/src/modules/products/routes.ts` (CRUD), `categories` (módulo aparte), `frontend/src/features/admin/pages/ProductsPage.tsx` + `ProductEditPage.tsx` (alta/edición en 3 pasos) |
| 2 | Código de barras por producto | **Implementado** | `productVariants.barcode` (`backend/src/db/schema.ts:154`, único por `orgId`), `GET /admin/variants/by-barcode/:code` (`backend/src/modules/variants/routes.ts:22`), usado por `pwa/src/screens/EscanearScreen.tsx` y `AltaScreen.tsx` |
| 3 | Control de stock por movimientos | **Implementado** | tabla `stockMovements`, `POST/GET /admin/variants/:id/stock-movements` (`backend/src/modules/stock/routes.ts`), consumido por `StockPage.tsx` (admin) y `FichaScreen.tsx` (pwa) |
| 4 | Venta presencial en un paso | **Implementado** | `POST /admin/orders/venta-local` (`backend/src/modules/orders/routes.ts:392-534`), flujo completo `EscanearScreen → FichaScreen → CarritoScreen → confirmVenta` en `pwa/src/App.tsx` |
| 5 | Medios de pago / carteras / finanzas | **Implementado** | selector de 4 medios en `pwa/src/screens/CarritoScreen.tsx:28-33`; `venta-local` resuelve la cartera (`LOCAL_SALE_WALLETS`, `orders/routes.ts:44-49`) vía `ensureWallet`/`recordOrderCharge` (`backend/src/modules/finance/service.ts`) |
| 6 | Publicación selectiva en tienda online | **Parcial** | campo `products.visibleInCatalog` (schema + `updateProductSchema` aceptan ambos sentidos), pero la UI (`ProductEditPage.tsx:188-195`) solo expone "Guardar y publicar" (false→true); no hay acción para volver a ocultar un producto ya publicado |
| 7 | Gestión de proveedores | **No implementado** | sin tabla, columna ni endpoint — no hay ningún rastro de `proveedor`/`supplier` en `backend/src` |
| 8 | Envíos | **No aplica** | confirmado, sin código relacionado (gestión manual fuera del sistema) |
| 9 | Facturación electrónica ARCA/AFIP | **No implementado** | confirmado — cero referencias a AFIP/ARCA/factura en `backend/`, `frontend/` o `pwa/` (los matches de un grep amplio eran falsos positivos de la palabra "marca") |
| 10 | Carga masiva de productos (CSV) | **Diseñado, no implementado** | `docs/T23-App_ingreso_egreso_productos/implementacion.md` Prompt 6 lo marca explícitamente como diferido; no hay código de parseo CSV en ningún workspace |
| 11 | Panel de stock / diagnóstico | **Implementado** | `StockPage.tsx` (`frontend/src/features/admin/pages/StockPage.tsx`) sobre `GET /admin/stock` y `/admin/stock/critical` |

## Notas donde el estado documentado no coincidía

**#2 — Código de barras por producto.** El documento lo marcaba "No implementado (especificado)". En el código está completamente implementado: columna, endpoint de búsqueda y las dos pantallas de la PWA que lo consumen (escaneo por foto + entrada manual como respaldo). Corregido a **Implementado**.

**#4 — Venta presencial en un paso.** El documento lo marcaba "No implementado (especificado)". El endpoint `POST /admin/orders/venta-local` existe, es transaccional (descuenta stock con guard atómico en el `WHERE`, crea el pedido ya `paid`, registra el movimiento financiero, todo en una sola transacción con reintento ante colisión de `orderNumber`), y la PWA completa el flujo de punta a punta. Corregido a **Implementado**.

**#5 — Medios de pago / carteras / finanzas.** El documento decía "Base implementada; falta el selector móvil". El selector ya existe en `CarritoScreen.tsx` (efectivo / transferencia / tarjeta / mercadopago) y está conectado al backend. Corregido a **Implementado**.

**#6 — Publicación selectiva.** La columna "Parcial" del documento es correcta, pero vale precisar *qué* falta exactamente — ver diagnóstico abajo, es uno de los tres puntos que preguntaste.

Los ítems #1, #3, #7, #8, #9, #10, #11 coinciden con lo documentado — no requieren corrección.

---

## Sobre tus tres preocupaciones puntuales

### AFIP/ARCA

Confirmado: no hay ninguna integración, ni siquiera un stub. Es coherente con lo documentado ("diferido, sin ticket activo") — no es un gap oculto, es una decisión ya tomada de no encararlo todavía. Si en algún momento se vuelve prioridad, hoy arrancaría de cero: no hay modelo de datos para tipo de comprobante, CUIT del cliente, ni relación factura↔pedido.

### Venta selectiva (publicación en la tienda online, #6)

Acá sí hay un matiz importante que el documento no capturaba con precisión. Lo que **sí** existe:

- Todo producto nace oculto (`visibleInCatalog: false`), tanto si se carga desde el admin de escritorio (`ProductsPage.create`, `frontend/src/features/admin/pages/ProductsPage.tsx:59`) como si se carga por escaneo desde la PWA (`alta-rapida`, `backend/src/modules/products/routes.ts:175`). Ningún producto nuevo aparece en la tienda online sin un paso explícito.
- Ese paso explícito es el wizard de 3 pasos del admin de escritorio: "Guardar y publicar" en el paso 3 (fotos) hace `PATCH /admin/products/:id` con `visibleInCatalog: true`.

Lo que **falta**: una vez publicado, no hay forma de volver a ocultarlo desde la UI. `ProductsPage.tsx` muestra la columna "Visible" como texto (Sí/No), sin botón. El endpoint sí acepta el cambio en ambos sentidos (`updateProductSchema` es `.partial()` y no restringe la dirección), así que es un gap de UI, no de backend — resolverlo es agregar un botón "Ocultar de la tienda" que llame al mismo PATCH con `false`. Es una tarea chica si querés que la meta en un ticket.

### UX/UI de T23 para carga y venta desde el celular

Repasé las 5 pantallas reales (`pwa/src/screens/*.tsx`, `App.tsx`). En términos de diseño de interacción, el flujo está bien resuelto para el caso de uso (una sola acción grande por pantalla, sin navegación libre — "Escanear" y "Carrito" son los únicos destinos, todo lo demás son estados a los que se llega por una acción concreta):

- **Escaneo:** un botón grande ("Sacar foto del código de barras") + campo manual de respaldo. Vale notar que el escaneo en vivo con cámara (`getUserMedia`) se abandonó explícitamente tras pruebas reales en iPhone — el comentario en `EscanearScreen.tsx:11-24` documenta que el decoder JS de esa librería no leía códigos de barras lineales de forma confiable, y se migró a "sacar foto + decodificar con zxing-wasm", que sí funcionó en el dispositivo real. Es una decisión ya validada contra hardware real, no una suposición.
- **Alta de producto nuevo:** formulario corto (marca, modelo, categoría, talle, color, precio) + foto como paso separado y explícitamente opcional ("Continuar sin foto por ahora") — no bloquea el alta si falla la cámara o la conexión.
- **Ficha / entrada de stock:** stepper +/- simple, un botón.
- **Carrito:** lista con stock **en vivo** por ítem (no el que tenía al escanear — se re-consulta al entrar al carrito, con aviso visual "no alcanza" si quedó corto por una venta concurrente), selector de medio de pago como chips, total corriendo.

Lo que **no** está confirmado es la verificación formal contra dispositivo real: el propio ticket T23 (`docs/T23-App_ingreso_egreso_productos/tareas/07-pulido-pruebas/README.md`, "Fase 7 — Pulido y pruebas") tiene su checklist **completo sin tildar** — manejo de errores de red, permiso de cámara denegado, y las tres pruebas end-to-end (alta, entrada, venta completa) contra un celular real. El código de las pantallas ya contempla varios de esos casos (fallback manual, foto opcional, errores por `ApiError`), pero no hay una confirmación explícita de que se haya recorrido esa checklist. Si la fricción que te preocupa es real, lo más barato es cerrar esa Fase 7 antes de asumir que la app "ya está" — es la brecha concreta entre "el código existe" y "está probado con quien realmente va a vender parado en el local".

## Resumen

De las 11 funcionalidades, 3 estaban subestimadas en el documento (código de barras, venta en un paso, selector de medio de pago) — el circuito de venta presencial de T23 está más completo de lo que el catálogo indicaba. Los gaps reales que quedan son: proveedores (sin ticket), AFIP (diferido a propósito), CSV masivo (diseñado, diferido a propósito), el botón de "ocultar" en publicación selectiva (chico), y el cierre formal de pruebas en dispositivo real de T23 (Fase 7, no bloqueante en código pero sí en confianza).
