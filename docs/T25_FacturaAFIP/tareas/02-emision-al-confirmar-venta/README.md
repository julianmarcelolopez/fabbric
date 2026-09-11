# Fase 2 — Backend: tabla de comprobantes y emisión al confirmar la venta

**Estado:** ✅ Hecha (2026-09-03) — las 3 tareas completas, 32/32 checks PASS entre las 3 suites (`t25-02-venta-local-con-factura.mjs` 13/13, `t25-02b-venta-local-factura-emitida.mjs` 10/10, `t25-03-invoice-retry.mjs` 9/9)

## Objetivo (según plan.md)

Que `POST /admin/orders/venta-local` acepte, opcionalmente, los datos de facturación del cliente, registre el comprobante en estado `pendiente`, e intente emitirlo contra AFIP **sin que un fallo eche atrás la venta ya cobrada** (decisión #6 de `overview.md`). Sumar el endpoint de reintento para cuando la emisión falla.

## Por qué está subdividida

La pieza de más riesgo es que la emisión contra AFIP queda **fuera** de la transacción de Drizzle de `venta-local` — a propósito, porque la venta (stock + cobro) ya se resolvió y no debe revertirse por un problema ajeno (AFIP caído, dato inválido). Eso es una decisión de control de flujo distinta a cualquier otro endpoint de fabbric hasta ahora (todo lo demás es "todo o nada" en una sola transacción), así que conviene que quede aislada de la migración simple y del endpoint de reintento, cada una verificable por separado.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-migracion-invoices](01-migracion-invoices/README.md) — tabla nueva `invoices` | Fase 1 | ✅ Hecha |
| 2 | [02-extender-venta-local](02-extender-venta-local/README.md) — captura de datos + emisión post-transacción | 1, Fase 1 (módulo `afip/`) | ✅ Hecha |
| 3 | [03-endpoint-retry](03-endpoint-retry/README.md) — `POST /admin/invoices/:id/retry` | 2 | ✅ Hecha |

## Criterios de aceptación de la fase completa

- [x] Confirmar una venta con el toggle de facturación **apagado** no crea ninguna fila en `invoices` — cero cambio de comportamiento respecto de T23.
- [x] Confirmar una venta con el toggle **activado** y AFIP respondiendo bien: la venta queda `paid` (igual que siempre) y la factura queda `emitida` con CAE y número — CAE real verificado: `86360849328179`.
- [x] Confirmar una venta con el toggle activado y AFIP fallando: la venta igual queda `paid` con su stock descontado y su cobro registrado — la factura queda en `error`, no se pierde nada de la venta.
- [x] El reintento sobre una factura en `error` la deja `emitida` si AFIP responde bien la segunda vez; sobre una ya `emitida` devuelve 409 sin volver a llamar a AFIP.

Todas las pruebas usaron organizaciones descartables (creadas y borradas por los propios scripts) — en los casos que necesitaban credenciales AFIP reales, se copió (solo lectura) la config de Eliathi hacia la org de prueba, sin tocar nunca la organización real ni sus pedidos/facturas.

## Dependencias

- **La bloquean**: Fase 1 — ya resuelta.
- **Bloquea**: Fase 3 (PDF necesita el CAE ya emitido), Fase 4/5 (la PWA manda y lee estos datos), Fase 6 (el admin reintenta contra esta fase). **Las tres desbloqueadas.**
