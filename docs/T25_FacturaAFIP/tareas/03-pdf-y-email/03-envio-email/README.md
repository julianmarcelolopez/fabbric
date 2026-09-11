# Tarea 3 — Envío de email (cliente + copia a Eliathi)

**Estado:** ✅ Hecha (2026-09-06) — email real recibido con el PDF adjunto, confirmado por el usuario

**Depende de:** Tarea 1 (generación del PDF)

## Objetivo

Que el comprobante llegue por mail apenas se emite, sin que el vendedor tenga que hacer nada extra — reusando el mecanismo de envío de mail que ya existe en fabbric.

## Pasos

- [x] `sendEmail` (`backend/src/lib/email.ts`) extendido con `attachments?: { filename, content }[]` (content en base64) — Resend los soporta en todos sus planes, incluido el gratuito, sin tocar el resto de sus llamadas existentes (parámetro opcional).
- [x] Plantilla nueva `invoiceEmail` (mismo archivo, mismo criterio que `orderStatusEmail`) — asunto con el número formateado, cuerpo simple, CAE visible.
- [x] Módulo nuevo `backend/src/modules/invoices/email.ts` (`enviarFacturaPorEmail`): genera el PDF (Tarea 1), arma los destinatarios (`invoice.clienteEmail` + `catalogConfigs.email`, deduplicados), y envía uno por uno.
- [x] Sin email de cliente: no rompe nada, simplemente ese destinatario no entra a la lista.
- [x] Se dispara desde `intentarEmision` (`invoices/service.ts`) justo después de marcar `estado: emitida` — cubre tanto el primer intento (`venta-local`, Fase 2) como un reintento exitoso (`retry`, Fase 2 Tarea 3), sin duplicar la llamada en cada lugar.

## Hallazgo de infraestructura (no es un bug de esta tarea, pero bloquea producción)

Al probar con envíos reales apareció algo que no estaba previsto: **la cuenta de Resend está en modo de prueba, sin dominio verificado** — Resend rechaza (403) cualquier destinatario que no sea la dirección exacta con la que se registró la cuenta. Se confirmó primero con dos alias de Gmail (`+clientefactura`/`+eliathicopia`, rechazados) y después contra la dirección exacta registrada, que sí funcionó — email real recibido con el PDF adjunto (asunto "Tu factura 0001-00000009 — Eliathi Modas (prueba T25/05)").

**Esto es una limitación real que ya existía desde T7** (los emails de cambio de estado de pedido tienen la misma restricción) — no es nuevo de T25, simplemente no se había notado porque nunca se probó contra un destinatario real distinto del dueño de la cuenta. **Para producción con clientes reales de Eliathi, hace falta verificar un dominio propio en Resend** (`resend.com/domains`) antes de que estos emails puedan llegarle a cualquier cliente — mismo tipo de bloqueo externo que el certificado/punto de venta de AFIP, no algo que se resuelva con código.

## Cómo se implementó

- La generación del PDF ya existía (Tarea 1); acá solo se reusa vía `generarInvoicePdf`, no se duplica lógica.
- `enviarFacturaPorEmail` está envuelto en un único `try/catch` que traga cualquier error (generar el PDF, Resend caído, sin destinatarios) y solo loguea — nunca se propaga hacia `intentarEmision`, así que jamás puede revertir el estado `emitida` ya guardado.

## Definition of Done

- [x] Una factura que pasa a `emitida` dispara el envío de mail con el PDF adjunto, sin intervención manual — confirmado con un envío real, recibido por el usuario.
- [x] Sin email de cliente: la lógica de destinatarios lo maneja sin fallar (no probado con un envío real sin cliente, pero el código está cubierto — solo depende de que `invoice.clienteEmail` sea `null`).
- [x] Un fallo en el envío de mail no revierte el estado `emitida` — confirmado en la práctica: cuando Resend rechazó los alias con 403, la factura ya `emitida` (con CAE real) no se vio afectada, solo quedó un `log.warn`.

## Dependencias

- **La bloquean**: Tarea 1 — ya resuelta.
- **Bloquea**: nada directamente — cierra la Fase 3.
