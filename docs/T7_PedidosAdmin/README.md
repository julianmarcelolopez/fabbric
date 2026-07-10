# T7 — Pedidos (Admin) (Fase 7 de docs/plan.md)

## Objetivo de la fase

El vendedor gestiona sus ventas: lista de pedidos con filtros, detalle, **cambio de estado que dispara email al comprador**, tracking, y **alta manual de pedidos** (venta telefónica/presencial) con ítems de catálogo y/o **personalizados/bespoke** — el patrón validado por bordart. El schema ya está listo desde T6 (una migración menos).

Criterio de verificación de la fase (de `docs/plan.md`): *cambio de estado dispara email y se refleja en "Mis pedidos" con tracking* + *alta manual de un pedido con un ítem de catálogo y un ítem personalizado en la misma orden; la clasificación Catálogo/Personalizado/Mixto se calcula bien*.

## Decisiones que marcan esta fase

- **Máquina de estados con transiciones explícitas**: `pending → cancelled` (lo único que el admin puede hacer con una orden no pagada); `paid → preparing → shipped → delivered`; `cancelled` y `delivered` terminales. **`paid` no se alcanza por PATCH**: llega por el webhook de MP o por "marcar como cobrado" (endpoint aparte).
- **"Marcar como cobrado (manual)" en dos etapas**: T7 crea el endpoint que pasa `pending → paid` para ventas fuera de MP (teléfono/local); en T9 ese mismo endpoint se refuerza creando el `financial_movement` vinculado (regla bordart "cobrado antes de completado"). Documentado como decisión escalonada.
- **Emails con Resend, con modo degradado**: si `RESEND_API_KEY` no está configurada, el email se **loguea en vez de enviarse** (el flujo no se rompe en dev). Se manda email al comprador en cada cambio de estado visible (paid/preparing/shipped/delivered/cancelled) si la orden tiene customer con email.
- **Alta manual y stock**: los ítems **de catálogo** en un pedido manual piden **canal** (online/local) y registran movimiento `venta` al marcarse cobrado (no al crearse — coherente con el checkout online, donde el stock baja al pagar). Los ítems **bespoke** (sin `productId`) no tocan stock; llevan precio y costo manuales + imagen de referencia opcional (upload al bucket, patrón T2).
- **Clasificación derivada, no persistida**: Catálogo (todos los ítems con `productId`) / Personalizado (ninguno) / Mixto — calculada al consultar, igual que bordart.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-email-resend.md](01-email-resend.md) — Cuenta Resend (usuario) + plugin de email con modo degradado | — | ⬜ Pendiente |
| 2 | [02-endpoints-pedidos.md](02-endpoints-pedidos.md) — Lista/detalle/estados/tracking/cobro manual + emails | 1 | ⬜ Pendiente |
| 3 | [03-alta-manual.md](03-alta-manual.md) — POST pedido manual (catálogo + bespoke + imagen de referencia) | 2 | ⬜ Pendiente |
| 4 | [04-orders-pages.md](04-orders-pages.md) — `OrdersPage` (lista+detalle+estados) y `OrderNewPage` (alta manual) | 2, 3 | ⬜ Pendiente |
| 5 | [05-verificacion-final.md](05-verificacion-final.md) — Definition of Done de T7 | 1-4 | ⬜ Pendiente |

## Recordatorios operativos (gotchas acumulados)

- Schema: **no hay migraciones en esta fase** (T6 dejó todo listo, incluidos los campos bespoke).
- Rutas nuevas → `schema` Swagger. Mutaciones → probar en navegador. Tests con secrets → Node. Deps nuevas → rebuild + renew-anon-volumes.
- El túnel de cloudflared solo hace falta para E2E de pagos — esta fase no lo necesita (los cambios de estado son del admin).
- Sin commits (decisión del usuario) — ofrecer al cierre.

## Próximo paso al cerrar T7

**T8 — Clientes (Admin)**: lista de compradores con historial — fase corta. Después T9 (Finanzas) y T10 (Métricas/Dashboard), y el MVP queda completo.
