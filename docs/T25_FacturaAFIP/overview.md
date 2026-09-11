# T25 — Factura electrónica AFIP desde la venta presencial (PWA)

## Contexto

`docs/T24_CircuitoCompleto/diagnostico.md` (funcionalidad #9) confirmó que hoy no existe ningún tipo de integración con AFIP en `backend/` ni en `pwa/` — está diferida desde que se armó el catálogo de funcionalidades, sin ticket activo. Este documento abre ese ticket.

El pedido concreto: cuando un vendedor confirma una venta presencial desde la PWA de T23 (`POST /admin/orders/venta-local`), tiene que poder generar la factura electrónica correspondiente contra los servicios de AFIP, pero **solo si el cliente la pide** — no es un paso obligatorio de la venta.

fabbric es multi-tenant, pero esta integración se diseña **solo para Eliathi Modas** por ahora (ver "Decisiones resueltas"). Eliathi (Edgar) es monotributista, por lo que el comprobante a emitir es **Factura C**.

**Nota importante sobre las credenciales de prueba**: no se cuenta todavía con el CUIT ni el certificado digital de Edgar. Para poder probar el circuito técnico completo contra el entorno de homologación de AFIP, se va a usar el CUIT del desarrollador (Julian), que también es monotributista. Esto sirve para validar que el circuito funciona de punta a punta (WSAA, obtención de CAE, generación de PDF, envío de mail), pero **no reemplaza el trámite real**: un certificado está atado a un CUIT específico, así que antes de pasar a producción con Eliathi hace falta gestionar el certificado y la clave fiscal con el CUIT real del negocio. Eso queda como bloqueante de producción, no de esta etapa de desarrollo/homologación.

## Objetivo

Agregar, en la pantalla de Carrito de la PWA (`pwa/src/screens/CarritoScreen.tsx`), un toggle opcional **"Facturar esta venta"** (default apagado). Si el vendedor lo activa antes de confirmar:

1. Se le piden los datos mínimos del cliente que hacen falta para el comprobante (ver "Modelo de datos").
2. Al confirmar la venta, además de lo que ya hace `venta-local` (crear el pedido, descontar stock, registrar el cobro), el backend solicita el comprobante a AFIP y obtiene su CAE.
3. El vendedor puede **descargar el PDF de la factura desde la PWA** en el momento, y el sistema **envía una copia por email**: al cliente (si dejó su email) y siempre una copia a Eliathi (usando el email de contacto que ya tiene configurado en `catalogConfigs.email`).

Si el toggle queda apagado, la venta se comporta exactamente igual que hoy — sin ningún cambio de comportamiento para el caso no facturado.

## Decisiones resueltas

1. **El toggle es por venta, no por organización.** Lo decide el vendedor en el momento, en la pantalla de Carrito — no hay una config global que facture todo automáticamente. Coincide con lo que ya decía el catálogo de funcionalidades original ("generar factura solo cuando el cliente la pide, no automática").
2. **Condición fiscal: monotributista → Factura C.** Eliathi es monotributista, así que el comprobante siempre es Factura C a consumidor final. No hace falta pedir CUIT del comprador (a diferencia de Factura A/B). Esto simplifica bastante el alcance — no hay que resolver la lógica de elegir tipo de comprobante según la condición fiscal del cliente.
3. **Entorno: homologación primero.** Todo el desarrollo y las pruebas de este ticket apuntan al entorno de homologación (testing) de AFIP, con el CUIT del desarrollador. El pase a producción (CUIT y certificado reales de Eliathi) es un paso aparte, posterior al cierre de este ticket, y depende de que Edgar tramite su certificado y clave fiscal.
4. **Alcance: solo Eliathi Modas.** No se diseña como feature multi-tenant genérica todavía — no hay que resolver una UI de configuración AFIP por organización en el admin. Dicho esto, para no reescribir el modelo de datos si en algún momento se generaliza, la config (CUIT, certificado, punto de venta, ambiente) se guarda igual **scoped por `orgId`**, siguiendo el mismo patrón que ya existe para Mercado Pago (`catalogConfigs.mpAccessToken`/`mpWebhookSecret`, cifrados — ver `backend/src/lib/crypto.ts`) — simplemente hoy solo se carga la fila de Eliathi.
5. **Salida del comprobante: PDF descargable + email.** La PWA ofrece descargar el PDF en el momento (para mostrárselo o pasárselo al cliente ahí mismo) y el backend envía el comprobante por mail: al cliente si dejó su dirección, y **siempre** una copia a Eliathi (reutilizando `catalogConfigs.email`, que ya existe para otros fines de contacto).
6. **Si AFIP falla o no responde al confirmar la venta, la venta se concreta igual.** No se aplica el criterio "todo o nada" que usa `venta-local` para el stock — acá el cobro y el stock ya se resolvieron, y la factura queda en estado `pendiente`/`error` para reintentar después (ver "Preguntas abiertas" para el diseño de ese reintento). Priorizamos no trabar una venta ya cobrada por un problema de AFIP.
7. **Datos del cliente a pedir en la PWA: nombre, email y DNI.** Los tres se piden cuando el toggle está activo — el DNI no es obligatorio para AFIP en Factura C a consumidor final, pero se pide igual porque en la práctica se lo suelen pedir al cliente y conviene tenerlo en el comprobante.
8. **Punto de venta AFIP: confirmado como requisito — y más específico de lo que se pensaba.** No alcanza con el certificado y la autorización WSFE (eso solo habilita *poder* facturar): además hace falta un punto de venta dado de alta en el portal "Puntos de Venta y Domicilios" de AFIP, y tiene que ser específicamente de tipo **"Web Services"** — un punto de tipo "Factura en Línea" (el portal manual de AFIP) no sirve para WSFE, aunque figure activo. Confirmado en homologación (Fase 1, Tarea 2): sin este alta, `FECAESolicitar` no funciona sin importar cuán bien esté configurado el certificado. Edgar va a necesitar este mismo trámite para producción — es un paso más, aparte del certificado.

## Preguntas abiertas — a resolver en el análisis técnico antes de implementar

Ver `analisis.md` para la resolución de la vía de integración con AFIP (directo vs. tercero). Quedan dos puntos de diseño más finos, a definir recién al escribir el plan de implementación (no bloquean el análisis):

1. **Diseño exacto del reintento de facturación fallida** (ver decisión #6): ¿el admin de escritorio necesita una pantalla nueva para ver facturas en estado `error` y reintentarlas, o alcanza con un botón en el detalle del pedido (`OrderAdminDetailPage.tsx`) ya existente?
2. **Formato exacto del PDF** (logo, datos fiscales de Eliathi, layout) — detalle de implementación, no de arquitectura.

## Modelo de datos (propuesta, a confirmar en el análisis)

No hay nada de esto today en `backend/src/db/schema.ts` — es todo trabajo nuevo:

- **Config AFIP por organización** (nuevas columnas, mismo patrón cifrado que `mpAccessToken`): CUIT emisor, punto de venta, certificado, clave privada, ambiente (`homologacion`/`produccion`). Vive scoped por `orgId`, aunque por ahora solo se cargue la fila de Eliathi (ver decisión #4).
- **Tabla nueva `invoices`** (o `facturas`), vinculada a `orders` por `orderId`: tipo de comprobante (`C`), número, CAE, fecha de vencimiento del CAE, estado (`pendiente`/`emitida`/`error`), y los datos del comprador que se hayan pedido (nombre, email, DNI opcional).
- **Datos del comprador en `venta-local`**: cuando el toggle está activo, la PWA manda nombre/email (y DNI si se decide pedirlo) junto con el resto del payload de `POST /admin/orders/venta-local` — a definir si es el mismo endpoint extendido o uno nuevo que lo envuelve.

## Pantallas / flujo (borrador)

1. **Carrito** (`pwa/src/screens/CarritoScreen.tsx`): nuevo toggle "Facturar esta venta" debajo del selector de medio de pago, apagado por default.
2. Si se activa: aparece un mini-formulario (nombre, email del cliente) antes de poder tocar "Confirmar venta" — bloquea el submit si falta el email, porque sin eso no se puede cumplir "envío por mail".
3. Al confirmar: la venta se procesa igual que hoy (stock, cobro, cartera) y además se dispara la solicitud del comprobante a AFIP.
4. **Pantalla de confirmación** (`ConfirmarScreen.tsx`, ya existe): agrega, cuando corresponda, un botón "Descargar factura (PDF)" y un mensaje de que se envió copia por mail — o el error correspondiente si la emisión falló (ver pregunta abierta #2).

## Fuera de alcance de T25

- Notas de crédito o débito (solo facturas de venta).
- Facturación de pedidos del checkout online (`orders` con `channel: online`) — este ticket cubre únicamente la venta presencial desde la PWA (`venta-local`).
- Factura A/B para responsables inscriptos — Eliathi es monotributista, solo Factura C.
- Diseño multi-tenant genérico (UI de configuración AFIP por organización en el admin) — ver decisión #4.
- Puesta en producción con el CUIT real de Eliathi — depende de un trámite externo (certificado + clave fiscal) que no controla este ticket.

## Stack (a definir en el análisis)

Depende de la pregunta abierta #1 (directo vs. terceros). Si es directo: cliente SOAP para WSAA/WSFEv1 en `backend/` (nuevo módulo `afip/`), certificado gestionado igual que otros secretos de organización. Si es tercero: cliente HTTP a la API elegida, mismo patrón que ya usa `payments/service.ts` para Mercado Pago.

## Criterios de aceptación (borrador)

- Con el toggle apagado, una venta presencial se comporta exactamente igual que hoy — cero regresión sobre T23.
- Con el toggle activado y los datos del cliente completos, al confirmar la venta se genera un comprobante válido en homologación de AFIP (CAE obtenido), descargable como PDF desde la PWA.
- El comprobante llega por email al cliente (si dejó su dirección) y siempre una copia a Eliathi.
- Si AFIP rechaza o no responde, el vendedor recibe un mensaje claro sobre qué pasó con la venta (ver pregunta abierta #2 — el comportamiento exacto depende de esa decisión).
- Ningún dato de facturación se pide ni se muestra cuando el toggle está apagado.
