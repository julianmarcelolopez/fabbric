# 02 — Panel admin

## Objetivo del usuario

Que el dueño del local pueda gestionar su día a día (stock, pedidos, clientes, plata) sin tener que entender conceptos técnicos ni saltar entre pantallas más de lo necesario.

Categorías, Productos y Home ya se cubrieron en profundidad en `01-flujo-critico.md` — acá el foco es el resto del panel: Dashboard, Stock, Pedidos, Clientes, Finanzas, Envíos y Configuración.

## Mapa del flujo actual

- **Dashboard** (`/admin`, índice del panel): al loguearse, cae directo acá. Muestra 9 tarjetas de métrica (pedidos del mes, ingresos, egresos, balance, ganancia bruta/neta, clientes nuevos, por cobrar, ticket promedio) + 5 paneles (últimos pedidos, más vendidos, catálogo vs personalizado, ventas por canal, gráfico de 6 meses) — todo reordenable/ocultable (drag & drop). Con la cuenta recién creada, todo está en cero.
- **Stock** (`/admin/stock`): tabla de variantes con Online/Local/Total + botones "Mover" (form con Tipo=entrada/venta/ajuste, Canal=online/local, Cantidad) y "Historial", expandidos inline en la misma fila.
- **Pedidos** (`/admin/orders` → `/admin/orders/:id`): listado con filtros (estado/tipo/fecha), "+ Nuevo pedido" para carga manual (venta local/telefónica), detalle con transición de estado y "Cobrar a cartera" (requiere elegir una cartera existente).
- **Clientes** (`/admin/customers` → `/admin/customers/:id`): listado con búsqueda, solo lectura — sin edición de datos ni notas desde acá (decisión de v1, no un bug).
- **Finanzas** (`/admin/finance`): Carteras (crear/editar/activar-desactivar) + resumen del mes + alta de movimiento manual (ingreso/egreso) + tabla de movimientos del mes con filtros.
- **Envíos** (`/admin/shipping`): alta/edición de zonas de envío (nombre, costo, monto de envío gratis) — **sin ninguna zona activa, el checkout de la tienda no puede completarse** (ver `04-checkout.md`).
- **Configuración** (`/admin/settings`): tabs Usuario (cambiar contraseña) e Integraciones (conectar Mercado Pago propio, T16).

## Puntos de fricción

### 🔴 [ALTO] Sin zona de envío, la tienda no puede vender — y "Envíos" está al final del sidebar, sin ninguna señal
**Dónde:** `ShippingZonesPage.tsx` (`/admin/shipping`) vs `backend/src/modules/payments/routes.ts` (`if (!zone) throw new AppError(400, "invalid_zone"...)`).
**Qué pasa:** el checkout público exige una zona de envío activa de la org — si no existe ninguna, cualquier intento de compra falla. No hay ningún indicador en el Dashboard, en Productos o en Home que avise "todavía no configuraste envíos, tu tienda no puede vender".
**Por qué importa:** es un segundo prerequisito silencioso (además del de Home, ver 01) que puede hacer que la tienda se vea perfecta — productos, fotos, precios — y aun así sea imposible de comprar, sin ningún error visible hasta que un cliente real lo intenta.
**Solución propuesta:** mismo patrón que ya funciona bien para categorías (bloqueo con mensaje + link) pero aplicado antes de que sea el cliente quien lo descubre: un aviso persistente en el Dashboard ("Configurá al menos una zona de envío para poder vender") mientras no haya ninguna zona activa.

### 🟡 [MEDIO] "Cobrar a cartera" en un pedido manual puede quedar bloqueado sin explicación clara
**Dónde:** `OrderAdminDetailPage.tsx` (`walletId`, botón "Cobrar (venta manual)" con `disabled={busy || !walletId}`) vs `FinanzasPage.tsx` (alta de cartera).
**Qué pasa:** si todavía no se creó ninguna cartera (Efectivo, Banco...), el selector de "Cobrar a cartera" queda vacío y el botón de cobro directamente no se puede tocar — sin ningún mensaje en esa pantalla que diga "andá primero a Finanzas y creá una cartera".
**Por qué importa:** solo afecta ventas manuales/locales (las ventas online por Mercado Pago crean su cartera automáticamente) — pero para un local que también vende en el mostrador, es otro prerequisito oculto que se descubre a mitad de un cobro, con el cliente esperando.
**Solución propuesta:** si `walletId` está vacío por falta de carteras (no por falta de selección), mostrar un mensaje explícito con link a Finanzas en vez de un botón simplemente deshabilitado.

### 🟡 [MEDIO] Dashboard con 9 métricas + 5 paneles desde el primer login, sin distinguir "cuenta nueva" de "cuenta con historia"
**Dónde:** `DashboardPage.tsx`.
**Qué pasa:** la densidad de información (14 bloques reordenables) es la misma para una cuenta recién creada, todo en cero, que para una tienda con meses de operación — no hay un estado vacío distinto que oriente a la primera tarea real.
**Por qué importa:** la primera pantalla que ve cualquier admin nuevo es la más cargada de todo el panel, y no contiene ningún llamado a la acción — la métrica que más le importa al negocio ("tiempo hasta primera venta") no tiene ninguna ayuda activa acá para acortarse.
**Solución propuesta:** cuando no hay ningún pedido registrado todavía, reemplazar las 14 tarjetas por un estado de arranque simple con los próximos pasos (ver mejora estructural de onboarding en `01-flujo-critico.md`).

### 🟢 [BAJO] Stock: "entrada / venta / ajuste" + "online / local" son dos conceptos superpuestos, sin ayuda contextual
**Dónde:** `StockPage.tsx` (`MoveForm`).
**Qué pasa:** para registrar un movimiento hay que elegir Tipo (entrada/venta/ajuste, con signo implícito o explícito según el tipo) Y Canal (online/local) — dos selects con lógica cruzada, sin ningún texto de ayuda sobre qué significa cada combinación.
**Por qué importa:** para un local que recién arranca y probablemente solo vende online al principio, el concepto de "stock local" separado puede no aplicar todavía y generar dudas sobre cuál elegir.
**Solución propuesta:** un texto de ayuda breve bajo el formulario ("Local es lo que tenés en el mostrador, Online es lo que se vende desde la tienda") o preseleccionar "online" por default ya que es el canal principal del negocio objetivo.

### 🟢 [BAJO] Finanzas concentra mucha terminología contable en una sola pantalla
**Dónde:** `FinanzasPage.tsx`.
**Qué pasa:** "Ganancia bruta", "Ganancia neta", "Balance", categorías de movimiento con datalist — todo en una sola vista, sin agrupar ni progresar de lo simple a lo avanzado.
**Por qué importa:** no es parte del camino crítico de la primera venta, pero es la pantalla con más carga cognitiva de todo el panel para un usuario sin formación contable.
**Solución propuesta:** dejar "Ganancia bruta/neta" con tooltip explicativo más visible (ya existe un `title=` en el HTML, pero no es descubrible en mobile — sin hover no hay forma de verlo).

## Quick wins

- Aviso persistente en el Dashboard mientras no haya ninguna zona de envío activa ("tu tienda no puede vender todavía").
- Mensaje explícito (no solo botón deshabilitado) en el detalle de pedido cuando falta crear una cartera para poder cobrar.
- Preseleccionar canal "Online" por default en el formulario de movimiento de stock.
- Reemplazar los `title=` (tooltip solo-hover) de Ganancia bruta/neta por un ícono con texto explicativo visible también al tocar, no solo al pasar el mouse.

## Mejoras estructurales

- Un panel de "salud de la tienda" en el Dashboard que consolide los prerequisitos silenciosos detectados (sin categoría, sin sección en Home, sin zona de envío, sin cartera) en una sola checklist accionable, en vez de que cada uno se descubra en su propia pantalla en un momento distinto.
- Repensar el Dashboard como dos experiencias distintas según el estado de la cuenta: "arranque" (sin ventas todavía, foco en next steps) vs "operación" (con historia, foco en métricas) — no la misma pantalla densa para los dos casos.
- Simplificar el modelo Online/Local de stock para el caso común de una tienda que solo vende online al principio (ver también la nota de Stock arriba).
