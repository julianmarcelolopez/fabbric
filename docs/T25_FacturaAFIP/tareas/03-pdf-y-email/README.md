# Fase 3 — Backend: PDF y envío de email

**Estado:** ✅ Hecha (2026-09-06) — las 3 tareas completas, con envío de email real confirmado por el usuario

## Objetivo (según plan.md)

Que una factura `emitida` se pueda descargar como PDF válido (con el QR que exige AFIP) y que llegue por mail al cliente y, siempre, a Eliathi.

## Por qué está subdividida

Generar el PDF (con el QR) es una pieza autocontenida que se puede probar sola contra datos de ejemplo, sin depender de que la PWA ya esté lista para pedirlo — conviene separarla del endpoint que lo sirve y del envío de email, que son dos formas distintas de "salida" del mismo documento.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-generacion-pdf-qr](01-generacion-pdf-qr/README.md) — armar el PDF con el QR de AFIP | Fase 2 | ✅ Hecha |
| 2 | [02-endpoint-descarga-pdf](02-endpoint-descarga-pdf/README.md) — `GET /admin/invoices/:id/pdf` | 1 | ✅ Hecha |
| 3 | [03-envio-email](03-envio-email/README.md) — mail al cliente + copia a Eliathi | 1 | ✅ Hecha |

## Criterios de aceptación de la fase completa

- [x] El PDF de una factura `emitida` incluye los datos fiscales de Eliathi, los del pedido, el CAE y su vencimiento, y un QR verificado campo por campo contra la especificación oficial de AFIP.
- [x] El PDF se puede descargar (`GET /admin/invoices/:id/pdf`) — probado de punta a punta; falta conectarlo desde la PWA (Fase 5).
- [x] El email llega al cliente y a Eliathi — confirmado con un envío real (PDF adjunto recibido y verificado por el usuario).

## Hallazgo que afecta producción (ver detalle en Tarea 3)

La cuenta de Resend está en modo de prueba sin dominio verificado — hoy solo puede mandar a la dirección exacta del dueño de la cuenta. Para producción con clientes reales hace falta verificar un dominio en `resend.com/domains`. Es un pendiente externo, mismo tipo que el certificado/punto de venta de AFIP — no bloquea seguir con el resto del ticket.

## Dependencias

- **La bloquean**: Fase 2 — ya resuelta.
- **Bloquea**: Fase 5 (la PWA ofrece la descarga). **Desbloqueada.**
