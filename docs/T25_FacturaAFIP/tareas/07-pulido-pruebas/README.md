# Fase 7 — Pulido y pruebas (contra homologación)

**Estado:** pendiente

## Objetivo (según plan.md)

Cerrar el ticket verificando los tres escenarios reales contra el ambiente de homologación de AFIP, con el mismo nivel de rigor que T23 (`tareas/07-pulido-pruebas/README.md`) — no alcanza con que el código compile, hay que probarlo contra AFIP de verdad.

## Checklist

- [ ] **Toggle apagado**: confirmar una venta local y verificar que el comportamiento es idéntico al de T23 — sin fila en `invoices`, sin cambios visibles en ninguna pantalla.
- [ ] **Toggle activado, AFIP responde bien**: CAE obtenido, factura `emitida`, PDF descargable con QR válido (verificado contra el verificador oficial de comprobantes de AFIP, no solo "que se vea un QR"), email recibido tanto por el cliente de prueba como por la copia a Eliathi.
- [ ] **Toggle activado, AFIP falla** (forzar el fallo: desconexión temporal, o un dato que AFIP rechace en homologación): la venta se concreta igual (stock descontado, cobro registrado), la factura queda en `error` con un motivo legible, y el reintento desde el admin de escritorio (Fase 6) la resuelve.
- [ ] **Aislamiento por organización**: los endpoints nuevos (`by-barcode` ya lo tenía T23, ahora sumar `invoices` y su PDF/retry) no permiten leer ni operar sobre datos de otra organización.
- [ ] Contrastar el comportamiento real contra `overview.md` (criterios de aceptación) antes de dar por cerrado el ticket.

## Criterios de aceptación (de `overview.md`)

- Con el toggle apagado, una venta presencial se comporta exactamente igual que hoy — cero regresión sobre T23.
- Con el toggle activado y los datos del cliente completos, al confirmar la venta se genera un comprobante válido en homologación de AFIP (CAE obtenido), descargable como PDF desde la PWA.
- El comprobante llega por email al cliente (si dejó su dirección) y siempre una copia a Eliathi.
- Si AFIP rechaza o no responde, el vendedor recibe un mensaje claro sobre qué pasó con la venta, y la venta no se pierde.
- Ningún dato de facturación se pide ni se muestra cuando el toggle está apagado.

## Dependencias

- **La bloquean**: Fases 1 a 6, todas completas.
- **Bloquea**: el cierre del ticket T25. La puesta en producción con el CUIT real de Eliathi queda fuera de este ticket (ver `plan.md`, "Fuera de alcance").
