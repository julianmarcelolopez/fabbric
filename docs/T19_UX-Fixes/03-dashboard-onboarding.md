# 03 — Checklist de onboarding en el Dashboard

**Estado:** ✅ Completa (2026-07-30)

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

## Resultado

Decisiones del usuario antes de implementar: endpoint nuevo `GET /admin/onboarding-status` (no extender `metrics/overview`); Mercado Pago queda "Recomendado", no bloqueante — el banner desaparece con 3/3 pasos core, sin importar MP.

- **`backend/src/modules/onboarding/routes.ts`** (nuevo módulo, registrado en `index.ts`): `GET /admin/onboarding-status` devuelve `{ hasCategory, hasProductWithVariant, hasActiveShippingZone, hasMercadoPago }` con 4 consultas en paralelo (`Promise.all`), cada una un `select ... limit 1` — sin traer filas de más. `hasProductWithVariant` es un `inner join products↔product_variants`, no alcanza con que el producto exista. `hasMercadoPago` lee `catalogConfigs.mpAccessToken` directo (sin `ensureConfig`, a propósito: es un endpoint de solo lectura, no debe crear una fila como efecto secundario).
- **`DashboardPage.tsx`**: nuevo fetch a `/admin/onboarding-status` + componente `OnboardingBanner` con la checklist de 4 ítems (check circle relleno si `done`, tachado, tag "Recomendado" en el de MP, link "→" solo en los pendientes). Condición de visibilidad: `!(hasCategory && hasProductWithVariant && hasActiveShippingZone)` — MP fuera de esa cuenta, tal como se pidió.
- **`admin.css`**: clases nuevas `.onboarding-banner`/`.onboarding-list`/`.onboarding-item`/`.onboarding-check`/`.onboarding-tag`/`.onboarding-link` (celeste, distinto del ámbar de `.alert-warning` que ya comparten `04`/`05`).
- **Desviación menor**: el link de "Conectar Mercado Pago" apunta a `/admin/settings` (tab "Usuario" por default) y no directo a la tab "Integraciones", porque `SettingsPage` maneja sus tabs con estado local, no con query param — habría que tocar ese componente para deep-linkear, fuera del alcance de esta tarea puntual.

**Verificación real, backend primero** (script temporal con una org creada vía superadmin — mismo patrón que `t10b-test.mjs` — probando los 3 escenarios pedidos con datos reales, no mockeados, y limpiada sin dejar residuos): **17/17 checks ✅**, cubriendo 0/3 (org recién creada, las 4 flags en `false`), 2/3 (categoría + producto con variante, sin envío → `hasActiveShippingZone: false`) y 3/3 con MP pendiente (`hasMercadoPago: false` no afecta el resto).

**Verificación visual en navegador** (usuario, con la org real): como Eliathi Modas ya estaba en 3/3 con MP pendiente, confirmar la ausencia del banner no probaba que funcionara — así que desactivé temporalmente las 2 zonas de envío reales por API (mismo mecanismo que en `05`) para forzar que apareciera: el banner se vio con los pasos 1 y 2 tachados, 3 y 4 pendientes con sus links, apilado correctamente arriba de la alerta de `05`. Reactivé las zonas después y el usuario confirmó que banner y alerta volvieron a desaparecer juntos, sin dejar la org real alterada.

`tsc --noEmit` y `vite build` limpios en frontend; `tsc --noEmit` limpio en backend.
