# Tarea 9 — Definition of Done de T6 (E2E con MP sandbox)

**Estado:** ✅ Hecha (2026-07-10) — DOS compras reales en sandbox completadas
**Depende de:** tareas 1 a 8

## Objetivo

El criterio de la fase, entero y de corrido: *carrito sin sesión → login Google → zona de envío → pago MP sandbox → webhook marca `paid` y descuenta `stockOnline` → orden en "Mis pedidos"*.

## Checklist final — completado con DOS compras reales

- [x] Compra #1: carrito → login Google → zona CABA → pago con **dinero en cuenta** ($25.000, pago MP `168173382512`)
- [x] Compra #2: pago con **tarjeta de test Visa/APRO** ($28.000, pago MP `167322226877`)
- [x] Webhooks reales de MP recibidos **por el túnel cloudflared** (verificado en logs: requests desde los servers de MP)
- [x] Ambos pedidos `paid`, stock descontado exactamente (M/Negro 10→9, L/Verde 15→14), movimientos `sync` "venta online #1/#2"
- [x] Mis pedidos: ambos en "Pagado"; carrito vaciado; consola limpia (usuario)
- [x] Replay sin doble descuento (suite tarea 7); suites 2-8 en verde; typecheck limpio

## Incidencias encontradas y resueltas (el valor de la E2E real)

1. **Bug real de firma del webhook**: el manifest de MP **omite** los componentes ausentes (no los incluye vacíos) y el formato IPN legacy (`?topic=payment&id=`) llega **sin firma**. Con la simulación del panel esto no se veía; con webhooks reales, todos rebotaban 401. Fix: manifest condicional + solo se procesa el formato firmado (`type=payment&data.id`), el IPN se reconoce con 200. **En producción esto habría bloqueado todas las ventas** — la opción B (túnel) pagó el peaje.
2. **Los quick tunnels de cloudflare se caen solos**: el primero murió entre las dos compras (webhook #2 no llegó hasta reponer el túnel y reenviar la notificación firmada — que MP igual habría reintentado). Con deploy real desaparece.
3. **`auto_return` de MP no acepta URLs http/localhost** (probado contra la API): quedó condicional a `FRONTEND_URL` https — en producción el redirect post-pago es automático; en dev es manual.

## Al cerrar

- Actualizar tabla del README + memoria + `docs/plan.md` si hubo desvíos
- Ofrecer commit — **fuerte**: con T6 cerrada hay un e-commerce multi-tenant funcional sin un solo commit
- Siguiente fase: **T7 — Pedidos (Admin)** (armar `docs/T7_PedidosAdmin/` primero)
