# T6 — Portal cliente + Carrito + Checkout + Mercado Pago (Fase 6 de docs/plan.md)

## Objetivo de la fase

La tienda pasa de vidriera a **canal de venta real**: un comprador entra sin sesión, arma su carrito, se loguea con Google, elige zona de envío, paga con Mercado Pago (sandbox), y el webhook marca la orden como pagada descontando `stockOnline` — el único lugar del sistema donde eso pasa automáticamente (tipo de movimiento `sync`, reservado desde T4). Después ve su pedido en "Mis pedidos".

Criterio de verificación de la fase (de `docs/plan.md`): *carrito sin sesión → login Google → zona de envío → pago MP sandbox → webhook marca `paid` y descuenta `stockOnline` → orden en "Mis pedidos"*.

## Decisiones que marcan esta fase

- **Es la fase más grande — 9 tareas.** Se cobra todo lo diferido: Google OAuth (T1), el tipo `sync` (T4), el botón de carrito deshabilitado (T5).
- **El comprador es un principal distinto al admin**: fila en `customers` scoped por tenant (`unique(orgId, googleSub)`), login **solo Google**. El plugin `requireCustomerAuth` valida el mismo JWT de Supabase pero resuelve contra `customers`, haciendo **upsert en el primer uso** dentro de esa tienda (el mismo Google account es un customer distinto en cada tienda).
- **El portal del comprador vive dentro de la tienda**: rutas `/store/:slug/portal/*` (el tenant viene en la URL) y API `/portal/:slug/*` — desviación menor del plan (que decía `/portal/*` a secas) porque el customer necesita contexto de tienda; documentada acá.
- **El carrito es client-side** (localStorage, **por slug de tienda** — carritos independientes por tienda), se valida server-side en el checkout: precios y stock **siempre se releen de la DB** al crear la orden, jamás se confía en lo que manda el cliente.
- **La orden nace `pending` con snapshot** (nombre/talle/color/precio/costo por ítem — el patrón de bordart) y una preferencia de MP (Checkout Pro, redirect a `init_point`). **Solo el webhook la marca `paid`** y descuenta stock online con movimientos `sync` — nunca la vuelta del redirect (el usuario puede cerrar la pestaña).
- **El webhook es paranoico** (regla del plan): valida la firma de MP, consulta el pago real contra la API de MP (no confía en el payload), es **idempotente** (reintentos de MP no descuentan stock dos veces), y responde error si algo falla — nunca 200 silencioso.
- **El schema de `orders` nace completo** (incluye los campos bespoke de la Fase 7: `productId` nullable, `unitCostSnapshot`, `referenceImageUrl`) — una sola migración, T7 no toca el schema.
- **Webhook en dev**: MP no puede llamar a `localhost`. La verificación E2E usa un túnel (cloudflared/ngrok) **o** simulación firmada del webhook — se decide en la tarea 7 según qué tenga el usuario a mano.
- **Un solo token de MP (plataforma) en el MVP — deuda consciente**: en producción multi-tenant cada tienda debe cobrar en SU cuenta de MP (modo marketplace, OAuth por tenant). Anotado en la hoja de ruta SaaS de `docs/plan.md`; el diseño de T6 no lo bloquea (el token se lee de env hoy, de `catalog_configs` mañana). Google OAuth en cambio SÍ es de plataforma por diseño: un solo OAuth app para todos los tenants; el multi-tenancy del comprador es `unique(orgId, googleSub)`.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-setup-google-mp.md](01-setup-google-mp.md) — Google OAuth (diferido de T1) + credenciales MP (manual, usuario) | — | ✅ Hecha |
| 2 | [02-schema-checkout.md](02-schema-checkout.md) — `customers`, `shipping_zones`, `orders`, `order_items` + schemas | — | ✅ Hecha |
| 3 | [03-shipping-zones.md](03-shipping-zones.md) — Zonas de envío: CRUD admin + página + GET público | 2 | ✅ Hecha |
| 4 | [04-customer-auth.md](04-customer-auth.md) — `requireCustomerAuth` + login Google en la tienda | 1, 2 | ✅ Hecha |
| 5 | [05-cart-frontend.md](05-cart-frontend.md) — Carrito client-side + drawer + botón "Agregar" real | 2 | ✅ Hecha |
| 6 | [06-checkout-mp.md](06-checkout-mp.md) — `POST /public/:slug/checkout` + preferencia MP + página de checkout | 3, 4, 5 | ✅ Hecha |
| 7 | [07-webhook-mp.md](07-webhook-mp.md) — Webhook: firma, pago real, `paid`, stock `sync`, idempotencia | 6 | ✅ Hecha |
| 8 | [08-portal-cliente.md](08-portal-cliente.md) — "Mis pedidos" + detalle en la tienda | 4, 7 | ✅ Hecha |
| 9 | [09-verificacion-final.md](09-verificacion-final.md) — E2E completo con MP sandbox | 1-8 | ✅ Hecha (2 compras reales) |

Tareas 1 (manual tuya) y 2 son independientes — se pueden arrancar en paralelo. 3-5 tampoco se bloquean entre sí una vez cerrada la 2.

## Recordatorios operativos (gotchas acumulados)

- Schema → `db:generate` + `db:migrate`. Rutas nuevas → `schema` Swagger. Deps nuevas → rebuild + renew-anon-volumes. Mutaciones → probar en navegador (CORS). Tests con secrets → Node.
- `.env.local` suma `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` (tarea 1) → `env.ts` los exige recién cuando el módulo de pagos exista (no romper el boot de quien no los tenga: opcionales con warning hasta la tarea 6).
- Sin commits (decisión del usuario) — ofrecer de nuevo al cierre; con T6 el MVP vendible está cerca y el riesgo de pérdida es máximo.

## Próximo paso al cerrar T6

**T7 — Pedidos (Admin)**: gestión de órdenes desde el admin (lista/detalle/cambio de estado → email con Resend), alta manual con ítems de catálogo y personalizados/bespoke — el schema ya va a estar listo.
