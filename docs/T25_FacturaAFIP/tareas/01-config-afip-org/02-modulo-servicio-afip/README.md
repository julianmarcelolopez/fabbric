# Tarea 2 — Módulo `afip/`: wrapper del SDK de Afip SDK

**Estado:** ✅ Hecha (2026-09-03) — CAE real obtenido contra homologación

**Depende de:** Tarea 1 (migración de config)

## Objetivo

Un módulo nuevo en `backend/src/modules/afip/` que aísle todo el conocimiento de Afip SDK: autenticación con la config de la organización, y el pedido de CAE vía WSFEv1 para comprobante tipo `C`. Nadie fuera de este módulo debería importar el SDK de Afip SDK directamente.

## Pasos

- [x] Instalado `@afipsdk/afip.js` en `backend/` (paquete oficial del proveedor elegido en `analisis.md`; solo trae `axios` como dependencia nueva, sin vulnerabilidades introducidas).
- [x] `backend/src/modules/afip/service.ts`: `solicitarCae(orgId, { importeTotalCents, fecha, dniComprador? })` → `{ cae, caeVencimiento, numeroComprobante }`.
- [x] Resuelve la config de la organización (Tarea 1), descifra certificado/clave/token, arma `new Afip({ CUIT, cert, key, access_token, production })` — `production` sale de `afipAmbiente === "produccion"` (confirmado en el código fuente de la librería: `production` es `boolean`, default `false` = homologación). Nada hardcodeado de Eliathi.
- [x] `AfipEmisionError` — envuelve cualquier fallo de `createNextVoucher` (rechazo de AFIP, red, timeout) en un tipo reconocible para que la Fase 2 lo capture sin que rompa la venta.
- [x] Probado de forma aislada, sin pasar por `venta-local`: `solicitarCae` contra homologación con la config real de Eliathi devolvió `{ cae: '86360849284689', caeVencimiento: '2026-09-13', numeroComprobante: 1 }`.

## Hallazgo durante la prueba (no estaba en el plan): falta un punto de venta

Al probar por primera vez, `solicitarCae` rechazó con `afip_not_configured` porque `afipPuntoVenta` seguía `null` (pendiente desde la Fase 0). Al intentar diagnosticar si existía alguno vía `FEParamGetPtosVenta`, AFIP devolvió `(602) Sin Resultados` — pero resultó ser una consulta con matices, no la respuesta definitiva: **el punto de venta 1 sí existía**, dado de alta por vos en el portal de AFIP ("Puntos de Venta y Domicilios") como *"Factura Electrónica - Monotributo - Web Services"* (distinto del punto 2, *"Factura en Línea"*, que es manual y no sirve para WSFE). Se cargó `afipPuntoVenta: 1` en la config de Eliathi y ahí sí funcionó.

**Para producción con el CUIT de Edgar**: va a hacer falta este mismo paso — dar de alta un punto de venta tipo "Web Services" en el AFIP de Eliathi antes de poder emitir, no alcanza con el certificado y la autorización WSFE de la Fase 0.

## Definition of Done

- [x] El módulo pide un CAE real contra homologación y lo obtiene, para un comprobante tipo `C`.
- [x] Un error de AFIP no tira una excepción no controlada — `AfipEmisionError` la envuelve, capturable y distinguible.
- [x] Ningún otro módulo del backend necesita saber que existe Afip SDK — solo `afip/service.ts` importa el paquete.
- [x] `tsc --noEmit` limpio en `backend/`.

## Dependencias

- **La bloquean**: Tarea 1 — ya resuelta.
- **Bloquea**: Fase 2 — ya puede usar `solicitarCae`. **Desbloqueada.**
