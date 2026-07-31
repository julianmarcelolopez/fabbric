# 05 — Alerta de zona de envío faltante en el Dashboard

**Estado:** ✅ Completa (2026-07-30)

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

## Resultado

Implementada según los criterios adicionales del usuario: reusa `.alert-warning` de `04` (no se creó una clase nueva), consulta `GET /admin/shipping-zones` directo (sin esperar el endpoint consolidado de `03`, que sigue sin hacerse).

- **`DashboardPage.tsx`**: nuevo `useEffect` gateado por `me.orgId` que pide `GET /admin/shipping-zones` y guarda el resultado en estado — no crítico, si falla no rompe el resto del dashboard (catch silencioso). `noActiveShippingZone = shippingZones !== null && shippingZones.filter(z => z.active).length === 0`, exactamente la condición que pidió el usuario. La alerta se renderiza entre el header (nombre de la org + selector de mes) y `DashboardCustomizable`, con el mismo `.alert-warning` de `04` y un `<Link to="/admin/shipping">`.
- `tsc --noEmit` y `vite build` limpios.

**Verificación real en navegador, los dos escenarios pedidos** — usando las 2 zonas reales de la org ("CABA" y "Gran Buenos Aires", ambas `active: true` desde antes de esta tarea):
1. Desactivé temporalmente las 2 zonas por API (`PATCH /admin/shipping-zones/:id { active: false }`) → el usuario confirmó en el navegador que la alerta apareció en el Dashboard.
2. Reactivé las 2 zonas por API, dejando el estado real exactamente como estaba antes de la prueba → el usuario confirmó que la alerta desapareció al recargar.
