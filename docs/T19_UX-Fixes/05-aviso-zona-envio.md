# 05 — Alerta de zona de envío faltante en el Dashboard

## Qué se cambia

El Dashboard muestra una alerta persistente ("Tu tienda todavía no puede recibir pagos — falta configurar al menos una zona de envío") mientras la org no tenga ninguna zona de envío activa, con un link directo a Envíos. La alerta desaparece automáticamente en cuanto se crea la primera zona activa.

## Referencia visual

Pantalla 1 (Dashboard) — banda ámbar debajo del banner de onboarding: "⚠️ Tu tienda todavía no puede recibir pagos — falta configurar al menos una zona de envío. Configurar envíos →".

## Referencia en T18

- `02-panel-admin.md` 🔴 — "Sin zona de envío, la tienda no puede vender — y 'Envíos' está al final del sidebar, sin ninguna señal".

## Archivos a modificar

- `frontend/src/features/admin/pages/DashboardPage.tsx` — bloque de alerta, consultando `GET /admin/shipping-zones` (ya existe, sin cambios de backend necesarios) y filtrando por `active`.
- `frontend/src/features/admin/admin.css` — clase de alerta ámbar (compartir estilo con `04-aviso-sin-variantes.md` si aplica).

## Criterio de completado

- La alerta aparece cuando `shippingZones.filter(z => z.active).length === 0` y desaparece al crear la primera zona activa, verificado con datos reales.
- `tsc --noEmit` limpio; verificado en navegador con una org sin zonas y con una org con al menos una zona activa.

## Notas

- Es, junto con `04`, uno de los cambios más baratos de todo T19 (una consulta que ya existe + un componente de alerta) — buen candidato para hacerse temprano.
- Si `03-dashboard-onboarding.md` ya resuelve un endpoint consolidado de estado de la org (que incluya zonas de envío), esta alerta puede consumir ese mismo dato en vez de hacer una consulta aparte — coordinar el orden de implementación entre ambas si se hacen en la misma sesión.
