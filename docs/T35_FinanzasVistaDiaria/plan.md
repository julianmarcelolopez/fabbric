# Plan — Vista diaria en Finanzas (T35)

Basado en `analisis.md` (diagnóstico, las dos decisiones confirmadas —
filtro de día puntual y subtotales por día, ambas a la vez— y el cambio de
backend y frontend ya resueltos ahí, citados contra el código real). Este
plan solo ordena el trabajo en dos fases por dependencia; no repite el
análisis. Todas las líneas citadas abajo fueron reverificadas contra el
código actual del repo antes de escribir este plan — coinciden con las de
`analisis.md`, sin cambios.

| # | Fase | Depende de |
|---|---|---|
| 1 | Backend: `dayRange` + `resolveRange` | nada |
| 2 | Frontend: filtro de día + subtotales en `FinanzasPage.tsx` | 1 |

## Desglose en tareas

Cada fase baja a una tarea propia en `tareas/`, mismo formato que ya usa
`docs/T34_VentaConAnticipo/tareas/` (Objetivo/Alcance/Criterio de
aceptación/Dependencias).

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-dia-range](tareas/01-backend-dia-range/01-backend-dia-range.md) | nada | ✅ |
| 2 | [02-frontend-filtro-dia](tareas/02-frontend-filtro-dia/02-frontend-filtro-dia.md) | 1 | ✅ |

## Fase 1 — Backend: `dayRange` + `resolveRange`

- `backend/src/modules/finance/service.ts`: nuevo helper `dayRange(date)`,
  junto a `monthRange` (línea 20) — tal cual el bloque de código de
  `analisis.md`.
- `backend/src/modules/finance/routes.ts`:
  - `monthQuery` (línea 27) suma el campo opcional `day`.
  - `resolveMonth()` (línea 37) se reemplaza por `resolveRange()` (mismo
    cuerpo que propone `analisis.md`) — único punto de cambio.
  - Los dos call sites ya existentes se actualizan para llamar a la función
    renombrada, sin más cambios: `GET /admin/finance/movements` (línea 141,
    llamada en línea 153) y `GET /admin/finance/summary` (línea 252,
    llamada en línea 264) heredan el filtro de día automáticamente.

**Verificación**: `tsc --noEmit` limpio en `backend/`; `curl` contra el
backend en Docker con `?day=YYYY-MM-DD` en ambos endpoints y confirmar que
devuelven solo ese día (comparar contra el mismo rango pedido por
`?year=&month=`).

## Fase 2 — Frontend: filtro de día + subtotales (`FinanzasPage.tsx`)

- Nuevo estado `const [day, setDay] = useState<string>("")` junto a `month`
  (línea 35).
- Junto al `<input type="month">` (línea 280), `<input type="date">` "Ver un
  día puntual" — deshabilita el selector de mes mientras `day` no esté
  vacío. Botón "Ver todo el mes" al lado, visible solo con `day` activo,
  que limpia `day`.
- `loadMonth()` (línea 59): agrega `if (day) params.set("day", day)` al
  armado de `params` (línea 60-62) y al querystring del fetch de `summary`
  (línea 65) — mismo patrón que ya usa con `walletId`/`type`. `day` entra
  a las dependencias del `useCallback` (línea 69).
- Título "Movimientos del mes" (línea 369) pasa a condicional según `day`.
- Tabla de movimientos (cabecera "Fecha" en línea 398, `.map` sobre
  `movements` en línea 408): agrupar por `date` (ya vienen ordenados desc)
  e insertar una fila de subtotal entre cada grupo — ingresos menos
  egresos del grupo, mismo signo que ya usa `MOVEMENT_TYPE_UI` para el
  monto de cada fila (línea 435-437).

**Verificación**: en Docker local (`docker compose up -d backend frontend`),
probar en el navegador: elegir un día puntual filtra tabla y resumen; "Ver
todo el mes" vuelve sin recargar; la tabla mensual muestra subtotales por
día sin romper los filtros de cartera/tipo existentes; `tsc --noEmit`
limpio en `frontend/`.

## Criterios de aceptación y fuera de alcance

Ver `analisis.md` — no se repiten acá, no hay adiciones nuevas encontradas
durante este plan.
