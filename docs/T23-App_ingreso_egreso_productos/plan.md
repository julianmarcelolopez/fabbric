# Plan de implementación — T23 App de ingreso/egreso de productos

Ver `overview.md` (decisión de arquitectura, modelo de datos y pantallas), `analisis.md` (flujo de navegación) y `mockups.html` (prototipo visual) antes de arrancar.

## Stack tecnológico

| Capa | Elección | Motivo |
|---|---|---|
| Frontend nuevo | React + Vite, configurado como PWA (`vite-plugin-pwa`), carpeta `pwa/` | Instalable desde el navegador del celular, sin pasar por App Store / Play Store |
| Escaneo de código de barras | Librería de lectura por cámara del navegador (ej. `html5-qrcode`) | No requiere hardware ni SDK nativo |
| Backend | El ya existente (`backend/`, Fastify + Drizzle + Supabase) — se **extiende**, no se reemplaza | Ya tiene catálogo, stock por canal, pedidos manuales, cobro con cartera y auth resueltos (T2/T4/T6/T7/T9) |
| Cliente API de la PWA | Mismo patrón que `frontend/src/lib/api.ts` (`apiJson`/`apiUpload`, Bearer token de Supabase Auth) | Consistencia con el resto del monorepo, cero infraestructura nueva |
| Transacciones de venta | Transacción de Drizzle dentro de un endpoint nuevo del backend existente (`POST /admin/orders/venta-local`) | Mismo mecanismo que ya usa `mark-paid`; no hace falta una función RPC de Postgres |
| Hosting | Junto con `frontend/`, mismo esquema de deploy que ya usa fabbric | Sin infraestructura nueva que mantener |
| Control de versiones | Git + repositorio remoto (mismo monorepo) | — |

## Fase 0 — Gaps abiertos: **resueltos**

`diagnostico.md` encontró 8 gaps (más 2 decisiones de negocio) que no estaban lo suficientemente definidos para empezar a implementar. Quedaron resueltos en una primera vuelta, y luego **revisados a fondo** al descubrir que el dominio de T23 ya existe en gran parte en `backend/` — ver la sección "Decisión de arquitectura" de `overview.md` para el detalle completo de ese replanteo. Resumen del estado final:

1. Upsert vs. duplicado / sanitización / columna `stock` del proveedor (carga masiva) → resueltos como diseño, pero la Fase 6 que los usa queda **diferida** (ver más abajo).
2. Transacción atómica de venta → resuelta, pero no como función RPC de Postgres: es el endpoint nuevo `POST /admin/orders/venta-local` en el backend existente.
3. RLS → no aplica; la autorización sigue en el backend (`requireAdminAuth`/`requireOrgId`).
4. Login → Supabase Auth real, mismo usuario que el panel admin (`admin_users`, roles `owner`/`staff`). No hace falta mapeo a email falso.
5. Mismatches del mockup (medio de pago, cantidad en "Registrar entrada") → agregados al mockup y a los prompts.
6. Contrato de stock → no hace falta: se usa `productVariants.stockLocal` + el endpoint de stock ya existente, no una función/vista propia.
7. Medios de pago habilitados (confirmado): `efectivo`, `transferencia`, `tarjeta`, `mercadopago` — 4 carteras separadas, resueltas automáticamente por el backend a partir del medio de pago elegido (no se le muestra al vendedor).
8. Nombre de la carpeta de la PWA (confirmado): `pwa/`, sumada a los `workspaces` del `package.json` raíz.
9. Proyecto Supabase (confirmado, **revertido** respecto de la primera vuelta): el mismo que ya usa fabbric, no uno nuevo.

## Fase 1 — Extender el backend existente

No se crea un proyecto Supabase nuevo ni tablas propias. Se extiende `backend/`:

- Migración Drizzle: columna `barcode` (text, único por `orgId`) en `productVariants`.
- Endpoint nuevo `GET /admin/variants/by-barcode/:code` — busca la variante (+ producto, + imágenes, + `stockLocal`) por código de barras, org-scoped, 404 si no existe.
- Endpoint nuevo `POST /admin/orders/venta-local` — en una sola transacción: crea el pedido con ítems `channel: local`, valida y descuenta stock, lo marca `paid`, resuelve/crea la cartera según el medio de pago recibido y registra el movimiento financiero vinculado.
- Nada de RLS, nada de RPC de Postgres, nada de bucket ni Auth nuevos — todo eso ya existe.

## Fase 2 — Scaffold de la PWA

- Proyecto React + Vite + PWA en `pwa/`, sumada a `workspaces` del `package.json` raíz.
- Cliente de API igual al de `frontend/` (`apiJson`/`apiUpload`), apuntando al mismo backend y mismo proyecto Supabase (solo para Auth).
- Pantalla de Login con Supabase Auth real (mismo login que usa el admin de escritorio).

## Fase 3 — Escaneo, alta y ficha de producto

- Integrar la librería de escaneo por cámara.
- Rama alta (código nuevo, 404) vs. ficha (código existente, 200), según `analisis.md`.
- Alta: formulario (marca, modelo, talle, color, precio, categoría) + foto → `POST /admin/products` + `POST /admin/products/:id/variants` + `POST /admin/products/:id/images`.
- Ficha: datos + `stockLocal` + acciones "Registrar entrada" / "Agregar a la venta".

## Fase 4 — Entrada de stock

- Acción "Registrar entrada" desde la ficha → `POST /admin/variants/:id/stock-movements` (`channel: local`, `type: entrada`).

## Fase 5 — Carrito y confirmación de venta

- Carrito como estado local de la PWA.
- Bottom nav (Escanear / Carrito) con contador de ítems.
- Selector de medio de pago (efectivo/transferencia/tarjeta/mercadopago).
- Confirmar venta → `POST /admin/orders/venta-local` (Fase 1) en una sola llamada — pensado como pistola de punto de venta, sin pasos intermedios.

## Fase 6 — Carga masiva por CSV (administración) — **DIFERIDA, no se implementa ahora**

**Motivo:** el camino real de carga inicial de catálogo es escanear cada producto físico (Fase 3) — y una carga CSV tampoco puede traer la foto (hace falta la prenda en mano). Mismo criterio que ya había tomado `docs/plan_2.md` para la demo. Se retoma en el futuro si aparece un caso real (ej. un proveedor que entrega una lista digitalizada con fotos ya subidas).

El diseño ya resuelto (útil para cuando se retome) queda documentado en `tareas/06-carga-masiva/README.md`: upsert de productos existentes por `codigo_barras`, `trim` de campos de texto sin normalizar mayúsculas/minúsculas, columna `stock` opcional que genera movimiento `entrada` solo en productos nuevos. Al retomarse, hay que remapear ese diseño contra `products`/`productVariants`/`stockMovements` (no contra tablas propias).

## Fase 7 — Pulido y pruebas

- Manejo de errores de red (sin conexión, cámara sin permiso, etc.).
- Estados de carga/spinner en las acciones contra el backend.
- Prueba end-to-end de los tres flujos: alta, entrada, venta completa (incluyendo stock insuficiente).
- Contraste del comportamiento real contra `mockups.html` antes de dar por cerrado el ticket.
- Verificar que el stock que mueve la PWA en el local **es el mismo** que ve la tienda online (mismo `productVariants.stockLocal`, no hay sincronización porque es la misma fuente).

## Fuera de alcance (igual que `overview.md`)

- Integración con facturación electrónica ARCA/AFIP.
- Migración de fotos desde Google Drive/Sheets.
