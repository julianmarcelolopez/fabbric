# T35 — Vista diaria en Finanzas

## Contexto

`FinanzasPage.tsx` (`frontend/src/features/admin/pages/FinanzasPage.tsx`) solo filtra por mes completo hoy: un `<input type="month">` (línea 280) alimenta `month`, y tanto `/admin/finance/movements` como `/admin/finance/summary` resuelven ese mes contra `resolveMonth()` (`backend/src/modules/finance/routes.ts:37`), que a su vez llama a `monthRange()` (`backend/src/modules/finance/service.ts:20`). Cada movimiento ya trae su fecha y la tabla "Movimientos del mes" (línea 369) los lista ordenados por día (`orderBy(desc(financialMovements.date), desc(financialMovements.createdAt))`), pero no hay forma de aislar un solo día ni de ver subtotales por día — ninguna de las dos cosas existe.

**Esta tarea no tiene relación con T34 (venta con anticipo)** — es un pedido aparte, sin dependencia entre ambas. Tampoco toca el saldo inicial de cada cartera (`wallets.initialBalance`), que ya existe y funciona.

## Decisiones resueltas

1. **Las dos cosas a la vez, no una sola**: filtro de un día puntual **y** subtotales por día dentro de la vista mensual — confirmado con el usuario.
2. El subtotal por día se calcula igual en las dos vistas (mes completo o un día puntual) — en la vista de un día puntual, el subtotal del único grupo coincide con el total del período, y sirve como chequeo cruzado.

## Backend

Nuevo helper en `backend/src/modules/finance/service.ts`, mismo patrón que `monthRange` (línea 20):

```ts
/** Rango [desde, hasta) de un único día calendario */
export function dayRange(date: string): { from: string; to: string } {
  const [y, m, d] = date.split("-").map(Number);
  const from = date;
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const to = next.toISOString().slice(0, 10);
  return { from, to };
}
```

En `backend/src/modules/finance/routes.ts`:

- `monthQuery` (línea 27, usado por ambos endpoints) gana un campo opcional: `day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`.
- `resolveMonth()` (línea 37) pasa a `resolveRange()`: si `query.day` está presente, devuelve `dayRange(query.day)`; si no, el mismo comportamiento de siempre. Un solo punto de cambio — ambos endpoints (`/admin/finance/movements` línea 141/187, `/admin/finance/summary` línea 252) ya llaman a esta función en las líneas 153 y 264, así que heredan el filtro de día sin tocarlos de nuevo:

```ts
function resolveRange(query: { year?: number; month?: number; day?: string }) {
  if (query.day) return dayRange(query.day);
  const now = currentArYearMonth();
  return monthRange(query.year ?? now.year, query.month ?? now.month);
}
```

## Frontend (`FinanzasPage.tsx`)

- Nuevo estado `const [day, setDay] = useState<string>("")` (vacío = sin filtro, vista mensual de siempre).
- Junto al `<input type="month">` (línea 280), un `<input type="date">` "Ver un día puntual". Al elegir una fecha: se manda como `day` en `loadMonth()` (línea 59-60, y el fetch de `summary` en línea 65) — `if (day) params.set("day", day)`. El selector de mes queda deshabilitado mientras haya un día elegido, para no tener los dos filtros activos a la vez.
- Botón "Ver todo el mes" al lado, visible solo cuando `day` no está vacío, que limpia `day` y vuelve a la vista mensual.
- El título "Movimientos del mes" (línea 369) pasa a ser condicional según haya o no un `day` activo.
- En la tabla de movimientos (desde la línea 398, cabecera "Fecha"; el `.map` sobre `movements` en la línea 408): agrupar por `date` (ya vienen ordenados por fecha desc, alcanza con detectar cuándo cambia el valor entre un movimiento y el siguiente) e insertar una fila de subtotal entre cada grupo — suma de `income` menos suma de `expense` de ese grupo, mismo signo que ya usa el balance de cada cartera.

## Qué NO cambia

- El cálculo de `balance` de cada cartera (`initialBalance + ingresos − egresos`) no se toca.
- `/admin/finance/summary` sigue calculando igual, solo que ahora puede resolver un día en vez de un mes si se le pasa `day`.
- Nada de esto afecta el alta de un movimiento nuevo (`POST /admin/finance/movements`) ni su borrado.
- No tiene relación con T34 — se puede implementar en cualquier orden respecto a esa tarea.

## Fuera de alcance de T35

- Vista por rango de fechas arbitrario (ej. "última semana") — solo mes completo o un día puntual, nada intermedio.
- Exportar el detalle diario a PDF/Excel — no pedido, no se incluye.

## Criterios de aceptación

- Elegir un día puntual filtra la tabla y el resumen a ese solo día, en ambos endpoints.
- "Ver todo el mes" vuelve a la vista mensual sin recargar la página.
- La tabla mensual muestra un subtotal por cada día con movimientos, sin romper el orden ni los filtros por cartera/tipo ya existentes.
- `tsc --noEmit` limpio en `backend/` y `frontend/`.
