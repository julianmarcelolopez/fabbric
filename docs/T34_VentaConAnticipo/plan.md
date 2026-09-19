# Plan — Venta con anticipo / saldo pendiente (T34)

Basado en `analisis.md` (contexto, decisiones de negocio, modelo de datos y
mapa de pantallas ya resueltos ahí — no se repite acá). Este plan solo
ordena el trabajo en fases y cierra los detalles de implementación que el
análisis dejaba abiertos, confirmados contra el código real.

Fases ordenadas por dependencia: el modelo de datos (Fase 1) bloquea todo
lo demás; las Fases 2-4 son backend puro y van en orden estricto entre sí
(cada una depende de la anterior); a partir de la Fase 4 (el endpoint
`cobrar-saldo` existe), **PWA (Fases 5-6) y Admin (Fases 7-8) son dos
ramas independientes** — se pueden hacer en cualquier orden entre sí, o en
paralelo si hay dos personas. La Fase 9 (verificación) cierra todo.

| # | Fase | Depende de | Rama |
|---|---|---|---|
| 1 | Modelo de datos y schemas compartidos | nada | — |
| 2 | Backend: alta de cliente sin Google (gap nuevo) | 1 | — |
| 3 | Backend: `venta-local` con anticipo | 1, 2 | — |
| 4 | Backend: `cobrar-saldo` + detalle de pedido | 1, 3 | — |
| 5 | PWA: Carrito con anticipo | 2, 3 | PWA |
| 6 | PWA: pantalla de saldos pendientes | 4 | PWA |
| 7 | Admin: cobrar saldo en detalle de pedido | 4 | Admin |
| 8 | Admin: filtro/badge + stat "Por cobrar" | 1 | Admin |
| 9 | Verificación end-to-end | 5, 6, 7, 8 | — |

**T34 completa (2026-09-18)** — las 9 fases / 9 tareas hechas y verificadas
(backend por `curl`/scripts descartables, PWA y admin en vivo por el
usuario). Detalle del cruce final contra los criterios de aceptación de
`analisis.md` en `tareas/09-verificacion-end-to-end/`.

## Desglose en tareas

Cada fase de arriba baja a una tarea propia en `tareas/`, mismo formato
que ya usa `docs/T33_EscaneoEnVivo/tareas/` (Objetivo/Alcance/Criterio de
aceptación/Dependencias) — una tarea por fase, sin dividir más porque cada
fase de este plan ya está acotada a una unidad de trabajo/verificación.

| # | Tarea | Depende de | Rama | Estado |
|---|---|---|---|---|
| 1 | [01-modelo-de-datos](tareas/01-modelo-de-datos/01-modelo-de-datos.md) | nada | — | ✅ |
| 2 | [02-alta-cliente-sin-google](tareas/02-alta-cliente-sin-google/02-alta-cliente-sin-google.md) | 1 | — | ✅ |
| 3 | [03-venta-local-anticipo](tareas/03-venta-local-anticipo/03-venta-local-anticipo.md) | 2 | — | ✅ |
| 4 | [04-cobrar-saldo-detalle-pedido](tareas/04-cobrar-saldo-detalle-pedido/04-cobrar-saldo-detalle-pedido.md) | 3 | — | ✅ |
| 5 | [05-pwa-carrito-anticipo](tareas/05-pwa-carrito-anticipo/05-pwa-carrito-anticipo.md) | 2, 3 | PWA | ✅ |
| 6 | [06-pwa-saldos-pendientes](tareas/06-pwa-saldos-pendientes/06-pwa-saldos-pendientes.md) | 4 | PWA | ✅ |
| 7 | [07-admin-cobrar-saldo](tareas/07-admin-cobrar-saldo/07-admin-cobrar-saldo.md) | 4 | Admin | ✅ |
| 8 | [08-admin-filtro-stat](tareas/08-admin-filtro-stat/08-admin-filtro-stat.md) | 1 | Admin | ✅ |
| 9 | [09-verificacion-end-to-end](tareas/09-verificacion-end-to-end/09-verificacion-end-to-end.md) | 5, 6, 7, 8 | — | ✅ |

## Hallazgos de la exploración (no estaban resueltos en `analisis.md`)

Antes de las fases — cuatro detalles reales encontrados leyendo el código,
uno de ellos (el cliente sin Google) es un gap genuino que el análisis no
había visto, no solo un matiz de implementación.

### 1. `MedioPago` no se ensancha — "anticipo" queda fuera del tipo compartido

El análisis propone sumar `"anticipo"` directo a `medioPagoSchema`
(`packages/shared/src/schemas/order.ts:145`). Revisando los usos reales de
`MedioPago` en todo el repo (`grep` confirma que son exactamente 5
archivos), dos de ellos son `Record<MedioPago, ...>` **exhaustivos**:

- `LOCAL_SALE_WALLETS` (`backend/src/modules/orders/routes.ts:46`) — resuelve
  la cartera de cada medio de pago.
- `MEDIO_LABELS` (`pwa/src/screens/ConfirmarScreen.tsx:7`) — el label que
  se muestra en la confirmación.

Si `MedioPago` pasa a tener 5 valores, TypeScript va a exigir una entrada
`anticipo` en los dos — pero "anticipo" no es una cartera real ni necesita
label propio en la confirmación de otro medio de pago, es un modificador
del flujo de venta, no un medio de cobro más. **Decisión**: `MedioPago` se
queda con sus 4 valores de siempre. Se agrega un schema nuevo, angosto,
solo para donde hace falta:

```ts
// packages/shared/src/schemas/order.ts
export const ventaLocalMedioPagoSchema = medioPagoSchema.or(z.literal("anticipo"));
export type VentaLocalMedioPago = z.infer<typeof ventaLocalMedioPagoSchema>;
```

Usado por `ventaLocalSchema.medioPago` (en vez de `medioPagoSchema` a
secas) y por el estado local de `medioPago` en `pwa/src/App.tsx:48` /
`CarritoScreen.tsx` / `ConfirmarScreen.tsx`. `cobrar-saldo` sigue usando
`medioPagoSchema` tal cual (su body explícitamente excluye "anticipo", ver
`analisis.md`) — no necesita este tipo nuevo.

### 2. `recordOrderCharge` es idempotente POR PEDIDO — no sirve para `cobrar-saldo`

`recordOrderCharge` (`backend/src/modules/finance/service.ts:139-170`)
chequea si **ya existe cualquier movimiento `income` para ese `orderId`** y,
si existe, no hace nada (`if (existing) return;`, línea 159) — pensado para
que un replay del webhook de MP no duplique el cobro. Correcto para
`venta-local` (pedido nuevo, cero movimientos previos), pero **rompe
`cobrar-saldo`**: el segundo cobro de un mismo pedido (el primero ya
insertó el anticipo) se comería el insert en silencio, sin error, sin
plata registrada. No es un detalle menor — es del mismo tipo de bug que
`recordOrderCharge` fue escrito para evitar, solo que en la dirección
contraria.

**Decisión**: `cobrar-saldo` inserta el `financialMovement` directo con
`tx.insert(financialMovements).values(...)`, sin pasar por
`recordOrderCharge` — no se toca esa función (la sigue usando
`venta-local` y el webhook de MP tal cual). El único resguardo contra
doble-click en `cobrar-saldo` es el mismo patrón que ya usa el resto de la
app: deshabilitar el botón mientras la request está en curso (`submitting`,
ver `CarritoScreen.tsx`/`OrderAdminDetailPage.tsx`), no un guard de
idempotencia en el backend — no hay replay automático de este endpoint
como sí lo hay con el webhook.

### 3. No existe forma de crear un cliente sin Google — gap real, no estaba en el análisis

`customers` (`backend/src/db/schema.ts:273-293`) tiene `googleSub`
(`uuid`, `NOT NULL`, único por org) y `email` (`text`, `NOT NULL`) —
estructuralmente atado al login con Google del checkout online. El único
endpoint que existe es `GET /admin/customers` (búsqueda) y `GET
/admin/customers/:id` — **no hay ningún `POST` para crear un cliente**. La
referencia del análisis a "mismo patrón que el alta manual del admin de
escritorio, T7" tampoco alcanza: `OrderNewPage.tsx:187-189` es un `<select>`
que lista TODOS los clientes existentes (sin búsqueda), no un buscador, y
tampoco permite crear uno nuevo — `customerId` ahí es opcional
(`customerId || null`, línea 157), así que T7 nunca necesitó resolver esto.

Para T34 esto sí es necesario: un anticipo puerta a puerta muy
frecuentemente es la **primera compra** de esa persona — nunca usó la
tienda online, no tiene cuenta de Google. Sin forma de crear el cliente,
el requisito "`customerId` obligatorio si `medioPago === anticipo`"
(`analisis.md` línea 46) no se puede cumplir en el caso común.

**Decisión**: migración que afloja `googleSub` y `email` a nullable (ambas
`NOT NULL` hoy) + endpoint nuevo `POST /admin/customers` (nombre
requerido, teléfono opcional, sin email) — ver Fase 2. Verificado que esto
no rompe nada existente: `notifyCustomer`
(`backend/src/modules/orders/routes.ts:68-87`) ya maneja `email` nulo con
un early-return (línea 78), así que un cliente sin email simplemente no
recibe emails de cambio de estado, sin excepción ni crash.

**Limitación conocida, fuera de alcance de T34 (charlado con el usuario)**:
los clientes son la misma tabla para PWA y tienda online — no se separan
en dos poblaciones (por eso la Fase 5 busca antes de ofrecer crear uno
nuevo). Pero el emparejamiento real de `resolveCustomer`
(`backend/src/plugins/auth.ts:99-102`) es por `googleSub`, no por
teléfono/nombre/email: si un cliente creado puerta a puerta (sin
`googleSub`) más adelante se loguea con Google en la tienda online, ese
`WHERE googleSub = identity.sub` no va a encontrar la fila walk-in
(`googleSub: null` nunca matchea) y va a insertar una **fila nueva** para
la misma persona — historial de compras partido en dos. No se resuelve en
T34 (la población puerta a puerta hoy probablemente no se solapa mucho con
la online); queda para retomar si aparece un caso real, con una decisión
de diseño propia (¿buscar también por teléfono/email al loguearse? ¿un
merge manual desde el admin?) — ver "Fuera de alcance" al final.

### 4. Buscador de cliente en la PWA: calcar `CustomersPage.tsx`, no T7

Ya que T7 no tiene búsqueda real (punto 3), el patrón a calcar es
`frontend/src/features/admin/pages/CustomersPage.tsx:14-31` — debounce de
300ms sobre `GET /admin/customers?search=`, que ya soporta filtro por
nombre/email (`backend/src/modules/customers/routes.ts:39-41`, no
filtra por teléfono todavía). Mejor ajuste para una pantalla de celular
que un `<select>` con todos los clientes de la org.

### Cartera del anticipo (pregunta abierta del análisis, decisión 4): sin selector en v1

El análisis deja esto marcado como no confirmado. Con la decisión del
punto 1 (arriba), la pregunta se resuelve sola: como `"anticipo"` no es
una clave real de `MedioPago`, no hay ningún lookup `LOCAL_SALE_WALLETS["anticipo"]`
ambiguo que resolver — el handler de `venta-local` simplemente usa
`LOCAL_SALE_WALLETS.efectivo` de forma explícita cuando `medioPago ===
"anticipo"`. Sin selector de cartera en esta versión, tal como asumía el
análisis; si en la práctica el anticipo también llega por transferencia,
es un cambio chico y acotado a esa única línea cuando aparezca el caso
real.

## Fase 1 — Modelo de datos y schemas compartidos

- Migración Drizzle (`npm run db:generate` desde `backend/`, próximo
  número `0027_*`):
  - `orderStatus` (`backend/src/db/schema.ts:22-29`) suma `"partial"`
    entre `"pending"` y `"paid"`.
  - `orders` (`backend/src/db/schema.ts:313-348`) suma columna
    `balanceDueDate: date("balance_due_date")` (nullable) — mismo helper
    `date(...)` que ya usa `financialMovements.date` (línea 425).
  - `customers` (`backend/src/db/schema.ts:273-293`): `googleSub` y
    `email` pasan de `.notNull()` a nullable (Hallazgo 3).
- `packages/shared/src/schemas/order.ts`:
  - `orderStatusSchema` (línea 3-10) suma `"partial"`.
  - `ORDER_TRANSITIONS` (línea 73-80) suma `partial: ["cancelled"]` — sin
    entrada que apunte a `partial` como destino desde ningún otro estado
    (mismo criterio que ya usa `paid`: se llega por un endpoint
    específico, `venta-local`, nunca por `PATCH /admin/orders/:id/status`;
    confirmado que ningún estado transiciona a `paid` vía `canTransition`
    hoy tampoco — mismo patrón, no uno nuevo).
  - `ventaLocalMedioPagoSchema` nuevo (Hallazgo 1, ver arriba).
  - `ventaLocalSchema` (línea 161-165): `medioPago` pasa a
    `ventaLocalMedioPagoSchema`; suma `montoPagado`, `customerId`,
    `balanceDueDate` (opcionales) + `.refine(...)` tal cual especifica
    `analisis.md`.
  - `cobrarSaldoSchema` nuevo: `{ monto: z.number().int().min(1), medioPago: medioPagoSchema }`.
- `frontend/src/features/admin/types.ts` (tipos **locales**, no
  importados de `@fabbric/shared` — hay que tocarlos aparte, fácil de
  saltear):
  - `AdminOrderStatus` (línea 167) suma `"partial"`.
  - `ADMIN_ORDER_STATUS` (línea 170-177) suma la entrada de `partial`
    (ámbar, mismo criterio que `pending` — ver `analisis.md`).
  - `AdminOrderDetail` (línea 224-245) suma `balanceDueDate: string | null`,
    `pagado: number`, `saldoPendiente: number`.

**Verificación**: `npx tsc --noEmit` limpio en los 3 workspaces antes de
seguir — a esta altura todavía no hay lógica nueva, solo tipos/schema/
migración, así que cualquier error acá es de sintaxis, no de negocio.

## Fase 2 — Backend: alta de cliente sin Google

Resuelve el Hallazgo 3.

- `createCustomerSchema` nuevo en `packages/shared/src/schemas/order.ts`
  (o un `customer.ts` si conviene separarlo — a criterio de quien
  implemente, no hay un archivo de schemas de cliente hoy): `{ name:
  z.string().min(1).max(200), phone: z.string().min(1).max(30).optional()
  }`.
- `POST /admin/customers` en `backend/src/modules/customers/routes.ts`
  (junto a los dos `GET` ya existentes, líneas 23-61): inserta con
  `googleSub: null`, `email: null`. Org-scoped (`requireOrgId`, mismo
  patrón que el resto del archivo).

**Verificación**: `tsc --noEmit` limpio; probado con `curl` contra el
backend real en Docker (mismo patrón que T11/T12/T16 en la memoria del
proyecto) — crear un cliente sin email/teléfono y confirmar que aparece en
`GET /admin/customers`.

## Fase 3 — Backend: `venta-local` con anticipo

`backend/src/modules/orders/routes.ts:419-...` (handler completo revisado,
el insert de la orden está en la línea ~498-507, el cálculo de `wallet` en
la línea 470, `recordOrderCharge` en la línea 525):

- El descuento de stock (líneas 479-492) **no se toca** — ya es
  incondicional, resuelve la decisión 3 del análisis sin cambios.
- `const wallet = LOCAL_SALE_WALLETS[medioPago]` (línea 470) pasa a
  condicional: `medioPago === "anticipo" ? LOCAL_SALE_WALLETS.efectivo :
  LOCAL_SALE_WALLETS[medioPago]` (ver Hallazgo 1 y "Cartera del anticipo"
  arriba).
- El insert de la orden (línea 498-507, hoy `status: "paid"` fijo) pasa a:
  - `medioPago !== "anticipo"` → igual que hoy.
  - `medioPago === "anticipo"` → `status: "partial"`, `customerId:
    body.customerId`, `balanceDueDate: body.balanceDueDate`.
- `recordOrderCharge` (línea 525-531, hoy siempre `amount: order.total`)
  pasa a `amount: medioPago === "anticipo" ? body.montoPagado :
  order.total` — sigue siendo el único movimiento del pedido en este
  punto (Hallazgo 2 no aplica acá, solo a `cobrar-saldo`).

**Verificación**: `tsc --noEmit` + probar con `curl` contra Docker (org de
prueba): una venta con `medioPago: "anticipo"` deja el pedido en
`partial`, con un solo movimiento financiero por `montoPagado` (no por el
total), y con `customerId`/`balanceDueDate` guardados.

## Fase 4 — Backend: `cobrar-saldo` + detalle de pedido

- `POST /admin/orders/:id/cobrar-saldo` (mismo archivo, junto al resto de
  los `app.post` de pedidos): valida `status === "partial"`, suma
  `financialMovements` existentes del pedido, rechaza con 400
  `overpayment` si se pasa del `total`, inserta el movimiento **directo**
  (Hallazgo 2 — no usar `recordOrderCharge`), pasa el pedido a `"paid"`
  si con este cobro se completa el `total`. Devuelve el pedido actualizado
  + `saldoPendiente`.
- `GET /admin/orders/:id` (`backend/src/modules/orders/routes.ts:150-200`)
  — hoy no trae movimientos financieros del pedido en absoluto. Sumar al
  `select`/response: `pagado` (suma de `financialMovements.amount WHERE
  orderId = :id AND type = 'income'`) y `saldoPendiente` (`order.total -
  pagado`) — los necesita la sección nueva de `OrderAdminDetailPage.tsx`
  (Fase 7) y de paso deja `AdminOrderDetail` (Fase 1) completo.

**Verificación**: `tsc --noEmit` + `curl`: cobrar de a partes hasta
completar el total confirma que pasa a `paid` solo, sin acción manual;
intentar cobrar de más devuelve 400 sin dejar movimientos a medias
(mismo pedido probado dos veces, un cobro parcial + uno que se pasa).

## Fase 5 — PWA: Carrito con anticipo

`pwa/src/screens/CarritoScreen.tsx` (después de T33: el selector de medio
de pago ya vive como pestaña segmentada dentro del tab "Forma de pago",
`MEDIOS: { value: MedioPago; label: string }[]`):

- `MEDIOS` pasa a tipar `VentaLocalMedioPago` (Hallazgo 1) y suma la
  entrada `{ value: "anticipo", label: "Anticipo" }`.
- Al elegir "Anticipo", debajo del selector:
  - Buscador de cliente (Hallazgo 4: debounce 300ms sobre `GET
    /admin/customers?search=`) con opción "Crear cliente nuevo" (nombre +
    teléfono, `POST /admin/customers` de la Fase 2) si la búsqueda no
    encuentra a nadie.
  - Input "Monto que paga ahora" (tope = `total`, muestra "Saldo
    pendiente: $X" en vivo, calculado en el cliente).
  - Selector de fecha "Fecha límite para el saldo" (`<input
    type="date">`, sin librería nueva).
- "Confirmar venta" deshabilitado hasta completar los 3 campos cuando
  `medioPago === "anticipo"` (mismo patrón de `disabled` que ya usa el
  botón para `facturaIncompleta`).
- `App.tsx` (`medioPago` state, línea 48) pasa a tipar
  `VentaLocalMedioPago`; el body que arma `confirmVenta()` (línea
  ~103-113) suma `montoPagado`/`customerId`/`balanceDueDate` cuando
  corresponde.
- `ConfirmarScreen.tsx` — `MEDIO_LABELS` (línea 7-12) suma `anticipo:
  "Anticipo"`; si `medioPago === "anticipo"`, el resumen muestra "Anticipo
  $X de $Y — saldo $Z" en vez de solo el total (dato ya disponible en el
  response de `venta-local`, no hace falta un fetch extra).

**Verificación**: en Docker local, venta con anticipo de punta a punta
—cliente nuevo creado en el momento, monto parcial, fecha límite— y
confirmar que la Ficha de "Venta registrada" refleja el saldo, no el
total.

## Fase 6 — PWA: pantalla de saldos pendientes

`pwa/src/`:

- `SaldosPendientesScreen.tsx` nuevo — lista pedidos `partial` de la org
  (nuevo `GET /admin/orders?status=partial` ya soportado por el `listQuery`
  existente, `backend/src/modules/orders/routes.ts:60-65`, no hace falta
  endpoint nuevo): cliente, saldo, fecha límite (resaltada si venció,
  cálculo client-side comparando con hoy). Tocar uno abre "Registrar
  cobro" (monto + medio de pago, sin "anticipo" en las opciones acá) →
  `cobrar-saldo` (Fase 4).
- `BottomNav.tsx` (después de T33: ya tiene `disabled`, `Dest` hoy es
  `"escanear" | "carrito"`, línea 3): suma tercer destino
  `"saldos"`/`"Saldos"`, con badge de cantidad si hay saldos vencidos —
  mismo patrón visual que el badge de `cartCount` ya existente (línea
  52-71).
- `App.tsx`: nuevo `Screen` kind, ruteo agregado al `switch` de pantallas
  (mismo patrón state-based que ya usa toda la PWA, sin router).

**Verificación**: en Docker local, un pedido `partial` real (de la Fase 5)
aparece en la lista, "Registrar cobro" lo completa y pasa a `paid` —
confirmar que desaparece de esta lista después.

## Fase 7 — Admin: cobrar saldo en detalle de pedido

`frontend/src/features/admin/pages/OrderAdminDetailPage.tsx`:

- Nueva sección "Saldo pendiente" (visible solo si `order.status ===
  "partial"`), junto a la sección "Acciones" existente (línea 235-289):
  total, `pagado`, `saldoPendiente`, `balanceDueDate` (en rojo si venció)
  — todos ya vienen en el response de `GET /admin/orders/:id` (Fase 4).
- Formulario "Cobrar saldo": monto + `<select>` de medio de pago
  (`efectivo`/`transferencia`/`tarjeta`/`mercadopago`, **no** un
  `<select>` de `walletId` como el de "Cobrar (venta manual)" de la línea
  245-253 — ese patrón resuelve una cartera elegida a mano, el de acá
  resuelve la cartera del lado del servidor a partir del medio de pago,
  igual que la PWA (mismo endpoint, mismo contrato — decisión 1 del
  análisis, no confundir los dos patrones).

**Verificación**: cobrar el saldo de un pedido `partial` desde el admin
(no la PWA) y confirmar que pasa a `paid`, con el mismo comportamiento que
la Fase 6 probó desde la PWA — es el mismo endpoint, así que alcanza con
un caso, no hace falta repetir toda la matriz.

## Fase 8 — Admin: filtro/badge + stat "Por cobrar"

- `OrdersPage.tsx` — el filtro (`Object.entries(ADMIN_ORDER_STATUS)`,
  línea 55) y el badge (`ADMIN_ORDER_STATUS[order.status]`, línea 102) ya
  son data-driven: con `ADMIN_ORDER_STATUS.partial` sumado en la Fase 1,
  esta pantalla queda resuelta **sin tocar su JSX** — confirmado
  explorando el archivo, coincide con lo que ya decía `analisis.md`.
- `DashboardPage.tsx` / `FinanzasPage.tsx` — nuevo stat "Por cobrar" = 
  suma de `saldoPendiente` de todos los pedidos `partial` de la org
  (nueva query agregada en el backend, o reuso de `GET
  /admin/orders?status=partial` sumando `total - pagado` en el cliente —
  a decidir según cuántos pedidos `partial` se esperan en régimen; con el
  volumen puerta a puerta de Eliathi Modas hoy, sumar en el cliente
  alcanza sin necesidad de una query agregada nueva).

**Verificación**: el número de "Por cobrar" coincide a mano con la suma
real de los pedidos `partial` visibles en `OrdersPage.tsx` filtrados por
ese estado.

## Fase 9 — Verificación end-to-end

- `tsc --noEmit` limpio en los 3 workspaces (repetir una vez más con todo
  junto, no solo por fase).
- Circuito completo real en Docker: PWA crea una venta con anticipo →
  aparece en `partial` tanto en la PWA (Fase 6) como en el admin (`OrdersPage`,
  Fase 8) → se cobra el resto **desde el admin** → pasa a `paid` → ya no
  aparece en ninguna lista de pendientes.
- Circuito inverso: crear otra venta con anticipo y cobrar el resto
  **desde la PWA** — confirma que de verdad es el mismo endpoint desde los
  dos lados (decisión 1), no dos caminos que casualmente se parecen.
- Intentar cobrar de más en cualquiera de los dos clientes → 400, sin
  romper nada.
- Revisar contra los "Criterios de aceptación" de `analisis.md` (sección
  final) uno por uno antes de cerrar la tarea.

## Fuera de alcance

**Heredado de `analisis.md`, sin cambios**: facturación AFIP sobre pedidos
`partial`, cuotas programadas, recordatorio proactivo por email/push,
cambios en Finanzas ("Nuevo movimiento") — ver "Fuera de alcance de T34"
en `analisis.md` para el detalle de cada uno.

**Nuevo, encontrado y charlado en esta sesión de planificación**: merge
automático de un cliente walk-in (creado puerta a puerta, sin `googleSub`)
con la cuenta de Google de esa misma persona si más adelante se loguea en
la tienda online — hoy quedan como dos filas separadas de `customers`, con
el historial de compras partido. Ver Hallazgo 3 arriba para el detalle
técnico completo.
