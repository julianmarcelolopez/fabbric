# Fase 1 — Backend: config AFIP por organización

**Estado:** ✅ Hecha (2026-09-03) — las 2 tareas completas, CAE real obtenido contra homologación

## Objetivo (según plan.md)

Dejar guardado, por organización, todo lo que hace falta para poder facturar contra AFIP (CUIT, punto de venta, ambiente, credenciales), siguiendo el mismo patrón de campos cifrados que ya usa fabbric para Mercado Pago — y un módulo delgado que envuelva el SDK de Afip SDK, sin exponer sus detalles al resto del backend.

## Por qué está subdividida

Igual criterio que T23 (`tareas/01-extender-backend/README.md`): separar el cambio de schema (bajo riesgo, mecánico) del módulo que efectivamente habla con un servicio externo (mayor riesgo — es la primera vez que el backend integra un SOAP/AFIP, conviene que quede aislado y verificable por separado antes de conectarlo a `venta-local` en la Fase 2).

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-migracion-config-afip](01-migracion-config-afip/README.md) — columnas nuevas en `catalogConfigs`, cifradas | Fase 0 | ✅ Hecha |
| 2 | [02-modulo-servicio-afip](02-modulo-servicio-afip/README.md) — wrapper del SDK de Afip SDK | 1 | ✅ Hecha |

## Criterios de aceptación de la fase completa

- [x] La config AFIP de una organización (CUIT, punto de venta, ambiente, credenciales) se guarda cifrada y nunca aparece en un endpoint de lectura genérico del admin (mismo criterio que `mpAccessToken`).
- [x] El módulo `afip/` puede, dado un importe y una fecha, devolver `{ cae, caeVencimiento, numeroComprobante }` contra el ambiente de homologación — probado de forma aislada, sin pasar todavía por `venta-local`. CAE real: `86360849284689`.
- [x] Un error de AFIP (rechazo, timeout) se propaga como un error tipado (`AfipEmisionError`) y reconocible, no como una excepción genérica.

## Hallazgo que no estaba en el plan original

Hizo falta un paso adicional no contemplado al escribir `plan.md`: además del certificado y la autorización WSFE (Fase 0), AFIP exige tener un **punto de venta de tipo "Web Services"** dado de alta (portal "Puntos de Venta y Domicilios") antes de poder pedir cualquier CAE — no alcanza con el certificado solo. Se resolvió porque el punto 1 ya existía con el tipo correcto; el detalle completo queda en `02-modulo-servicio-afip/README.md`. **Esto aplica también para producción con el CUIT de Edgar** — hay que agregarlo como paso explícito cuando se gestione ese certificado.

## Dependencias

- **La bloquean**: Fase 0 — ya resuelta.
- **Bloquea**: Fase 2 (necesita el módulo de emisión) y Fase 3 (necesita los datos fiscales de la organización para el PDF). **Ambas desbloqueadas.**
