# 03 — Checklist de onboarding en el Dashboard

## Qué se cambia

El Dashboard muestra, mientras la cuenta esté "arrancando", un banner con una checklist de 4 pasos (Crear una categoría / Cargar tu primer producto / Configurar una zona de envío / Conectar Mercado Pago), cada uno marcado como hecho o pendiente según el estado real de la org, con un link directo a la pantalla que corresponde. Cuando todos los pasos están completos, el banner deja de mostrarse (o se reemplaza por el dashboard de métricas normal).

## Referencia visual

Pantalla 1 (Dashboard) — banner azul superior con ícono 🚀, título "Completá estos pasos para empezar a vender" y 4 ítems de checklist, los dos primeros tachados/hechos (✓) y los dos siguientes con número + link "Configurar →" / "Conectar →".

## Referencia en T18

- `01-flujo-critico.md` 🟢 — "Dashboard vacío sin ningún llamado a la acción" — "la primera pantalla que ve el usuario... no lo dirige a la tarea #1".
- `01-flujo-critico.md` (mejora estructural) y `02-panel-admin.md` (mejora estructural) — "Checklist de onboarding real en el Dashboard... consolidando los prerequisitos silenciosos detectados".

## Archivos a modificar

- `frontend/src/features/admin/pages/DashboardPage.tsx` — banner + checklist, lógica de qué mostrar según estado.
- Backend: se necesita saber, en una sola consulta, si la org ya tiene (a) al menos 1 categoría, (b) al menos 1 producto con al menos 1 variante, (c) al menos 1 zona de envío activa, (d) Mercado Pago propio conectado. Candidato: extender `backend/src/modules/metrics/routes.ts` (`GET /admin/metrics/overview`) con un bloque `onboarding` en la respuesta, o crear un endpoint nuevo si mezclar esto con métricas no es prolijo — **decisión de diseño a tomar al implementar, no resuelta acá**.

## Criterio de completado

- El banner aparece para una org nueva (sin categoría/producto/zona de envío/MP) y desaparece a medida que se completan los pasos, verificado con datos reales (no solo mockeado).
- Cada link del checklist navega a la pantalla correcta.
- `tsc --noEmit` limpio; verificado en navegador con una org de prueba en distintos estados de completitud.

## Notas

- El paso "Conectar Mercado Pago" es opcional en términos de negocio (la org puede vender con el token de plataforma sin conectar nada propio, ver T16) — hay que decidir si este paso del checklist se marca como "hecho" por default (porque no es realmente necesario) o si se dirige a Integraciones como una opción, no como un bloqueante. El mockup lo muestra como paso 4 sin resolver esa ambigüedad — **confirmar con el usuario antes de implementar**.
- Esta tarea depende de que exista una forma de consultar el estado de zona de envío — ya existe (`GET /admin/shipping-zones`), no hace falta nada nuevo para ese punto puntual.
