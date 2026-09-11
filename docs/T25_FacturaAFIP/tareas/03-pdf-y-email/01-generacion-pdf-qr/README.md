# Tarea 1 — Generación del PDF con el QR de AFIP

**Estado:** ✅ Hecha (2026-09-04) — PDF real generado y QR verificado contra la spec oficial (16/16 checks)

**Depende de:** Fase 2 (factura `emitida`, con CAE)

## Objetivo

Armar el documento del comprobante: sin el QR que exige AFIP (RG 4892/2020), el PDF no es un comprobante válido aunque tenga CAE — no es un detalle estético, es un requisito legal.

## Pasos

- [x] Librerías elegidas: `pdfkit` (layout) + `qrcode` (imagen del QR) — sin vulnerabilidades nuevas introducidas (confirmado con `npm audit`, ambas solo dependen de `axios`/paquetes ya limpios).
- [x] Layout en `backend/src/modules/invoices/pdf.ts` (`generarInvoicePdf`): razón social/CUIT/punto de venta/"Monotributo", "FACTURA C", número formateado `PPPP-NNNNNNNN`, fecha, cliente (o "Consumidor Final" si no se cargó), detalle de ítems del pedido, total, CAE y vencimiento, QR.
- [x] `buildQrText` — JSON armado siguiendo **la especificación oficial descargada de AFIP** (`QRespecificaciones.pdf`, RG 4892): `ver`, `fecha`, `cuit`, `ptoVta`, `tipoCmp` (11, Factura C), `nroCmp`, `importe` (en pesos, no centavos), `moneda: "PES"`, `ctz: 1`, `tipoDocRec`/`nroDocRec` (**omitidos** si no hay DNI del comprador — "de corresponder", según la spec), `tipoCodAut: "E"`, `codAut` = CAE. Codificado en base64 dentro de `https://www.arca.gob.ar/fe/qr/?p=...`.
- [x] `generarInvoicePdf(orgId, invoiceId)` no depende de HTTP — función pura sobre la base, lista para que la Tarea 2 la exponga.

## Cómo se implementó

- `buildQrText` se exporta aparte de `generarInvoicePdf` justamente para poder probar la codificación del QR de forma aislada (decodificando el base64 de vuelta a JSON) sin tener que generar un PDF completo.
- Al armar `generarInvoicePdf` apareció un gap que el plan original no había previsto: para el QR hace falta la **fecha exacta** (`CbteFch`) que se le mandó a AFIP en el comprobante, y `invoices` no la guardaba — solo el resultado (CAE, número, vencimiento). Se agregó una columna nueva `invoices.fecha` (migración `0022_salty_piledriver.sql`) y se completa en `intentarEmision` (Fase 2) junto con el resto, usando un helper nuevo `formatFechaISO` en `afip/service.ts` (mismo `Date`, dos formatos: `AAAAMMDD` para WSFE, `AAAA-MM-DD` para el QR).

## Definition of Done

- [x] El PDF generado para una factura real de homologación muestra todos los datos esperados — verificado visualmente (ver captura en el chat de este ticket): razón social, CUIT, punto de venta, número `0001-00000006`, cliente, ítem, total, CAE `86360850243234`, vencimiento, y el QR.
- [x] El JSON del QR verificado campo por campo contra la especificación oficial de AFIP (16/16 checks: formato de URL, todos los campos con su tipo/valor correcto, y que `tipoDocRec`/`nroDocRec` se omiten cuando no hay DNI y aparecen correctos cuando sí lo hay). No se hizo un escaneo óptico del QR (no hace falta: la librería `qrcode` es una dependencia madura y ampliamente usada para la rasterización; el riesgo real estaba en el mapeo de datos, que es lo que se verificó exhaustivamente).

## Dependencias

- **La bloquean**: Fase 2 — ya resuelta.
- **Bloquea**: Tarea 2 (`02-endpoint-descarga-pdf`) y Tarea 3 (`03-envio-email`). **Ambas desbloqueadas.**
