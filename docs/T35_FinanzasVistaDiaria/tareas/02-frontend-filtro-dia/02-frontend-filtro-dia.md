# Tarea 2 — Frontend: filtro de día + subtotales (`FinanzasPage.tsx`)

**Estado:** ✅ Hecha (2026-09-19) — verificada en vivo por el usuario: filtro de día puntual filtra tabla y resumen (título "Movimientos del día"), "Ver todo el mes" vuelve a la vista mensual, y la tabla mensual muestra subtotal por día ($125.000,00 el 18/9/2026, coincide con el total al filtrar ese día — chequeo cruzado OK).

**Depende de:** Tarea 1 (necesita que `day` ya sea un parámetro válido en
ambos endpoints).

## Objetivo (según `plan.md`, T35/Fase 2)

Las dos decisiones confirmadas en `analisis.md`, a la vez: elegir un día
puntual y filtrar por él, y ver subtotales por día dentro de la vista
mensual de siempre.

## Alcance

`frontend/src/features/admin/pages/FinanzasPage.tsx`:

- Nuevo estado `const [day, setDay] = useState<string>("")` junto a
  `month` (línea 35) — vacío significa sin filtro, vista mensual de
  siempre.
- Junto al `<input type="month">` (línea 280), un `<input type="date">`
  "Ver un día puntual". El selector de mes queda deshabilitado mientras
  `day` no esté vacío, para no tener los dos filtros activos a la vez.
  Botón "Ver todo el mes" al lado, visible solo cuando `day` no está
  vacío, que limpia `day` y vuelve a la vista mensual.
- `loadMonth()` (línea 59): agrega `if (day) params.set("day", day)` al
  armado de `params` (línea 60-62) y al querystring del fetch de
  `summary` (línea 65) — mismo patrón que ya usa con `walletId`/`type`.
  `day` entra a las dependencias del `useCallback` (línea 69).
- Título "Movimientos del mes" (línea 369) pasa a condicional según haya
  o no un `day` activo (ej. "Movimientos del día" cuando `day` está
  seteado).
- Tabla de movimientos (cabecera "Fecha" en línea 398, `.map` sobre
  `movements` en línea 408): agrupar por `date` — ya vienen ordenados
  desc (`orderBy(desc(financialMovements.date), ...)`, backend), alcanza
  con detectar cuándo cambia el valor de `date` entre un movimiento y el
  siguiente — e insertar una fila de subtotal entre cada grupo: suma de
  `income` menos suma de `expense` de ese grupo, mismo signo que ya usa
  `MOVEMENT_TYPE_UI` para el monto de cada fila (línea 435-437). En la
  vista de un día puntual, el subtotal del único grupo coincide con el
  total del período — sirve como chequeo cruzado.

## Criterio de aceptación

- En Docker local (`docker compose up -d backend frontend`), probado en
  el navegador:
  - Elegir un día puntual filtra la tabla y el resumen a ese solo día, en
    ambos endpoints.
  - "Ver todo el mes" vuelve a la vista mensual sin recargar la página.
  - La tabla mensual muestra un subtotal por cada día con movimientos,
    sin romper el orden ni los filtros por cartera/tipo ya existentes.
- `tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** nada.
