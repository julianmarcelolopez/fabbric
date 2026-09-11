# Plan de implementación — T25 Factura electrónica AFIP

Ver `overview.md` (contexto, decisiones y modelo de datos) y `analisis.md` (elección de Afip SDK como vía de integración) antes de arrancar.

## Resumen de lo que hay que desarrollar

En una frase: cuando se confirma una venta local desde la PWA con el toggle "Facturar" activado, el backend tiene que pedirle un CAE a AFIP (vía Afip SDK, con certificado y CUIT propios de Eliathi), guardar el comprobante, generar su PDF (con el QR que exige AFIP) y mandarlo por mail — sin que un fallo de AFIP eche atrás la venta ya cobrada.

Hay tres frentes de trabajo, todos nuevos (no hay nada de esto hoy en el código):

1. **Backend — emisión**: certificado/config AFIP por organización, tabla de comprobantes, módulo que habla con Afip SDK, lógica de reintento.
2. **Backend — entrega**: generación de PDF con QR válido y envío de email (cliente + copia a Eliathi).
3. **Frontend — dos puntos**: toggle y datos del cliente en la PWA (`pwa/`), y una forma de ver/reintentar facturas con error desde el admin de escritorio (`frontend/`).

## Stack tecnológico

| Capa | Elección | Motivo |
|---|---|---|
| Integración AFIP | SDK de Node de **Afip SDK** (afipsdk.com) | Directo (CUIT/certificado propios de Eliathi), sin costo recurrente dentro del plan gratuito (1.000 req/mes), sin mantener nosotros el cliente SOAP — ver `analisis.md` |
| Certificado | Certificado de homologación a nombre del desarrollador para esta etapa; certificado de producción de Eliathi cuando Edgar lo gestione | `overview.md`, nota sobre credenciales de prueba |
| Generación de PDF | Librería de PDF en Node ya evaluable al implementar (ej. `pdfkit` o similar, liviana, sin dependencias pesadas) | El PDF necesita layout simple + el QR obligatorio de AFIP, no hace falta un motor de reportes complejo |
| Envío de email | Mismo mecanismo que ya usa `backend/src/lib/email.ts` (`orderStatusEmail`/`sendEmail`) | Cero infraestructura nueva, mismo patrón que el resto de fabbric |
| Config AFIP por organización | Columnas nuevas en `catalogConfigs`, cifradas igual que `mpAccessToken`/`mpWebhookSecret` (`backend/src/lib/crypto.ts`) | Mismo patrón ya validado para credenciales sensibles de Mercado Pago |
| PWA | Cambios en `pwa/src/screens/CarritoScreen.tsx` y `ConfirmarScreen.tsx` | Extiende pantallas ya existentes de T23, no hay pantallas nuevas |
| Admin de escritorio | Cambio en `frontend/src/features/admin/pages/OrderAdminDetailPage.tsx` | Reusa la pantalla de detalle de pedido ya existente para mostrar estado de factura + reintento |

## Fase 0 — Prerrequisitos externos: **resuelta**

- [x] Certificado de **homologación** generado en AFIP con el CUIT del desarrollador (ver `overview.md`, nota sobre credenciales de prueba).
- [x] Confirmado que además del certificado hace falta el `access_token` propio de la plataforma afipsdk.com — dos credenciales separadas, ambas guardadas en la Fase 1.
- [x] **Hallazgo no previsto en este plan**: además del certificado y la autorización WSFE, AFIP exige un punto de venta dado de alta **de tipo "Web Services"** (portal "Puntos de Venta y Domicilios") antes de poder pedir un CAE — se descubrió recién en la Fase 1, Tarea 2, al intentar la primera emisión real. Aplica también para producción con el CUIT de Edgar. Ver `tareas/00-prerrequisitos-externos/README.md` y `tareas/01-config-afip-org/02-modulo-servicio-afip/README.md` para el detalle completo.

## Fase 1 — Backend: config AFIP por organización

- Migración Drizzle: columnas nuevas en `catalogConfigs` — CUIT emisor, punto de venta, ambiente (`homologacion`/`produccion`), y las credenciales que pida Afip SDK (certificado + clave privada, o su token de plataforma — según lo que resuelva Fase 0), cifradas igual que `mpAccessToken`.
- Nunca exponer estas columnas en `updateCatalogConfigSchema` (mismo criterio que ya usa Mercado Pago) — se cargan aparte, no desde un formulario genérico del admin.
- Módulo nuevo `backend/src/modules/afip/` (o `invoicing/`): wrapper delgado sobre el SDK de Afip SDK, con una función que reciba los datos de una venta (importe, fecha) y devuelva `{ cae, caeVencimiento, numeroComprobante }` o lance un error tipado.

## Fase 2 — Backend: tabla de comprobantes y emisión al confirmar la venta

- Migración Drizzle: tabla nueva `invoices` — `orderId` (FK a `orders`), `orgId`, tipo de comprobante (`C`, fijo por ahora), número, CAE, vencimiento de CAE, estado (`pendiente`/`emitida`/`error`), nombre/email/DNI del cliente, mensaje de error si corresponde, timestamps.
- Extender el body de `POST /admin/orders/venta-local` (`ventaLocalSchema` en `@fabbric/shared`) con un bloque opcional `factura: { nombre, email, dni }` — presente solo si el vendedor activó el toggle.
- En la transacción de `venta-local`: si viene `factura`, además de lo que ya hace (stock, pedido, cartera), insertar una fila en `invoices` en estado `pendiente`.
- **Fuera de la transacción de venta** (ver decisión #6 de `overview.md` — un fallo de AFIP no revierte la venta): después de confirmada la venta, intentar la emisión contra AFIP. Si sale bien, actualizar la fila a `emitida` con CAE/número. Si falla, queda en `error` con el motivo, para reintentar.
- Endpoint nuevo `POST /admin/invoices/:id/retry` — reintenta la emisión de una factura en estado `error` (o `pendiente` si quedó a medias por un corte). Mismo `orgId`-scoping que el resto del admin.

## Fase 3 — Backend: PDF y envío de email

- Generación del PDF del comprobante: datos fiscales de Eliathi (razón social, CUIT, punto de venta), datos del pedido, CAE y su vencimiento, y el **QR obligatorio de AFIP** (RG 4892) con los datos codificados según la especificación oficial — sin este QR el comprobante no es válido, aunque tenga CAE.
- Endpoint nuevo `GET /admin/invoices/:id/pdf` — genera (o sirve cacheado) el PDF, para que la PWA lo pueda descargar.
- Envío de email al confirmarse la emisión (estado pasa a `emitida`): al cliente si dejó email, y **siempre** una copia a `catalogConfigs.email` (Eliathi) — mismo mecanismo que `sendEmail`/`orderStatusEmail` ya usa para las notificaciones de pedido.

## Fase 4 — PWA: toggle y datos del cliente

- `CarritoScreen.tsx`: toggle "Facturar esta venta" (default apagado), debajo del selector de medio de pago.
- Si se activa: mini-formulario con nombre, email y DNI — bloquea "Confirmar venta" si falta el email (necesario para poder enviar la factura).
- `App.tsx` (`confirmVenta`): si el toggle está activo, agrega el bloque `factura` al body de `POST /admin/orders/venta-local` (Fase 2).

## Fase 5 — PWA: descarga y estado en la confirmación

- `ConfirmarScreen.tsx`: si la venta se facturó, mostrar el estado (`emitida`/`pendiente`) y, cuando esté `emitida`, un botón "Descargar factura (PDF)" contra el endpoint de Fase 3.
- Si quedó `pendiente`/`error`, mensaje claro de que la venta se concretó igual y la factura se va a reintentar — sin bloquear al vendedor.

## Fase 6 — Admin de escritorio: ver y reintentar facturas con error

- `OrderAdminDetailPage.tsx`: si el pedido tiene una fila en `invoices`, mostrar su estado (emitida/pendiente/error) y, si está en `error`, un botón "Reintentar" contra `POST /admin/invoices/:id/retry` (Fase 2).
- No hace falta una pantalla nueva de listado de facturas — alcanza con el detalle del pedido, ya que cada factura está 1 a 1 con un pedido.

## Fase 7 — Pulido y pruebas (contra homologación)

- Prueba end-to-end con el toggle **apagado**: confirmar que el comportamiento es idéntico al de T23, cero regresión.
- Prueba end-to-end con el toggle **activado** y AFIP respondiendo bien: CAE obtenido, PDF descargable con QR válido, email recibido (cliente + copia a Eliathi).
- Prueba forzando un fallo de AFIP (ej. desconectando temporalmente o con un dato inválido): confirmar que la venta se concreta igual, la factura queda en `error`, y el reintento desde el admin la resuelve.
- Validar el QR generado contra el verificador oficial de comprobantes de AFIP (no alcanza con que el PDF "se vea bien" — el QR tiene que decodificar correctamente).

## Fuera de alcance (igual que `overview.md`)

- Notas de crédito o débito.
- Facturación de pedidos del checkout online (`channel: online`).
- Factura A/B — solo Factura C (Eliathi es monotributista).
- Diseño multi-tenant genérico (UI de configuración AFIP por organización en el admin) — la config vive scoped por `orgId` en la base, pero se carga a mano para Eliathi, no hay pantalla de alta.
- Puesta en producción con el CUIT real de Eliathi — depende del trámite externo de Edgar (Fase 0 de producción, no de este plan).
