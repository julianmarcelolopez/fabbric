# Análisis — T25 Factura electrónica AFIP

Ver `overview.md` para el contexto completo y las decisiones ya resueltas. Este análisis se enfoca en la única pregunta abierta que quedaba pendiente de investigación técnica: **vía de integración con AFIP — directo vs. servicio de terceros.**

## Opciones evaluadas

### 1. Directo contra los web services de AFIP (WSAA + WSFEv1), con librería de la comunidad

Node tiene varias librerías open source que envuelven el SOAP de AFIP (`afipjs`, `facturajs`, `AFIP-API`, entre otras). Todas resuelven lo mismo: autenticación WSAA (firma con certificado X.509 + clave privada, obtiene un token/sign de 12hs) y el método `FECAESolicitar` de WSFEv1 para pedir el CAE.

**Problema encontrado:** la librería más conocida (`afipjs`, de `egnuez`) tiene su última versión publicada hace ~4 años — riesgo de mantenimiento si AFIP cambia algo en el WSDL o en las reglas de validación (no sería la primera vez). Las alternativas (`facturajs`, `AFIP-API`) tienen tracción bastante menor. Ir por este camino implica asumir nosotros mismos el mantenimiento de esa capa si la librería elegida queda abandonada, además de programar a mano toda la gestión de certificado (generación de CSR, renovación de token WSAA cada 12hs, parseo de la respuesta SOAP).

### 2. Servicio de terceros con API REST propia (tusfacturas.app, Facturante)

Ambos son servicios establecidos en Argentina que abstraen completamente AFIP: vos les pedís "facturame esto" por REST y ellos devuelven el CAE y el PDF ya armado, gestionando su propio certificado (no hace falta tramitar nada con AFIP más que estar dado de alta como monotributista).

**Costo relevado (tusfacturas.app, agosto 2026):** los planes de acceso a la API arrancan en **$34.980 ARS/mes para 1.000 requests** — es un piso fijo mensual, independiente de cuánto factures. Para un negocio que factura *solo cuando el cliente lo pide* (uso opcional, volumen bajo e impredecible, ver decisión #1 de `overview.md`), ese piso mensual es un costo fijo que no se correlaciona con el uso real: en un mes de pocas ventas facturadas, terminás pagando lo mismo que en uno con muchas. Facturante no publica precios públicos (apunta a empresas más grandes — MercadoLibre, YPF, bancos — no encontré un plan de entrada comparable al de un comercio chico).

### 3. Directo contra AFIP, pero con "Afip SDK" (afipsdk.com) como capa de abstracción

Encontré una tercera opción que es, en la práctica, un punto intermedio entre las dos anteriores: **Afip SDK** es una plataforma (con SDKs oficiales para Node.js, Python, .NET) que sigue usando **tu propio certificado y tu propio CUIT** — es decir, seguís siendo vos quien factura directamente contra AFIP, no un intermediario que emite en su nombre — pero resuelve toda la fricción técnica de la opción 1: genera el certificado por vos (vía API, sin lidiar con OpenSSL a mano), maneja la renovación del token WSAA, y expone la llamada a WSFEv1 como un método simple, con soporte activo y documentación mantenida (a diferencia de `afipjs`).

**Costo relevado:** tiene un **plan gratuito con 1.000 requests/mes**, que para un volumen de facturación opcional y bajo (como el de Eliathi) alcanza con margen de sobra. Los planes pagos existen para volumen alto o múltiples CUIT, pero no aplican al caso de uso de este ticket.

**Detalle importante para homologación:** Afip SDK permite arrancar en modo desarrollo con un CUIT de prueba compartido (`20-40937847-2`) sin certificado propio, para probar el circuito rápido — pero para las pruebas reales de este ticket conviene igual generar el certificado propio de homologación con el CUIT del desarrollador (ver `overview.md`, nota sobre credenciales de prueba), porque el objetivo es validar el circuito completo tal cual va a funcionar en producción, no solo el llamado a la API.

## Recomendación

**Opción 3 — directo contra AFIP vía Afip SDK.** Razones:

- Costo: el plan gratuito (1.000 req/mes) cubre cómodamente un uso opcional y bajo volumen; evita el piso fijo mensual de ~$35.000 ARS de tusfacturas.app, que no tiene sentido pagar para una función que el cliente activa "a veces".
- Sigue siendo, técnicamente, integración directa: el certificado y el CUIT son de Eliathi, no hay un tercero facturando "en nombre de" — más alineado con el criterio de mantener el control del dato fiscal dentro del propio sistema, coherente con cómo fabbric ya maneja las demás integraciones sensibles (Mercado Pago con credenciales propias por organización).
- Evita el riesgo de mantenimiento de las librerías comunitarias sin actividad reciente (`afipjs`), sin perder la flexibilidad de una integración propia.

**Queda como alternativa de respaldo**, si en la implementación Afip SDK resultara no viable por algún motivo no anticipado (límites del plan gratuito, cambios en su servicio): evaluar `facturajs` como segunda opción directa, o tusfacturas.app como opción de tercero si el negocio prefiere pagar por simplicidad antes que mantener una integración propia — pero no hay indicios hoy de que haga falta llegar a ese punto.

## Impacto en el diseño

- El módulo nuevo en `backend/` (`afip/` o similar) usa el SDK de Node de Afip SDK, no un cliente SOAP propio.
- La config por organización (ver `overview.md`, "Modelo de datos") guarda CUIT, punto de venta y las credenciales que pida el SDK (certificado/clave, o el token de la plataforma Afip SDK si el flujo de autenticación con ellos lo requiere en vez de exponer el certificado crudo — a confirmar en la implementación, es un detalle de integración, no de arquitectura).
- Sin costo recurrente adicional para el negocio mientras el volumen de facturas opcionales se mantenga dentro del plan gratuito (1.000/mes) — muy por encima de lo que un comercio de este tamaño factura por mes.

## Resumen de bloqueos/pendientes

| # | Ítem | Tipo | Bloquea implementación |
|---|---|---|---|
| 1 | Certificado de homologación a nombre del desarrollador, para probar el circuito completo | Insumo técnico | No — se puede gestionar como primer paso de la implementación |
| 2 | Certificado y punto de venta reales de Eliathi (CUIT de Edgar) | Trámite externo | Sí, para producción — no para desarrollo/homologación |
| 3 | Confirmar si Afip SDK requiere pasar por su propia autenticación (API key de su plataforma) además del certificado AFIP, o si opera solo con el certificado | Detalle de integración | No bloquea el análisis, se resuelve al implementar (leer su documentación de integración Node.js al arrancar) |
| 4 | Diseño del reintento de facturas en estado `error` (ver `overview.md`, pregunta abierta #1) | Detalle de diseño | No bloquea el plan general, sí antes de implementar esa parte puntual |

## Conclusión

La pregunta abierta de `overview.md` sobre la vía de integración queda **resuelta**: se implementa directo contra AFIP usando Afip SDK como capa de abstracción, sin costo recurrente esperado para el volumen de uso de este ticket. Con esto, `overview.md` ya no tiene preguntas de arquitectura pendientes — lo que sigue es escribir el plan de implementación (migraciones, endpoints, cambios en la PWA).
