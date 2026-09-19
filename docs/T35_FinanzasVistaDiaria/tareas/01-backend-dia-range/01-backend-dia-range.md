# Tarea 1 — Backend: `dayRange` + `resolveRange`

**Estado:** ✅ Hecha (2026-09-19).

**Depende de:** nada.

## Objetivo (según `plan.md`, T35/Fase 1)

Habilitar el filtro por día puntual en los dos endpoints de finanzas, sin
tocarlos de nuevo después — un solo punto de cambio (`resolveMonth` →
`resolveRange`) que ambos heredan.

## Alcance

- `backend/src/modules/finance/service.ts`: nuevo helper `dayRange(date)`,
  junto a `monthRange` (línea 20) — tal cual el bloque de código de
  `analisis.md`:

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

- `backend/src/modules/finance/routes.ts`:
  - `monthQuery` (línea 27) suma el campo opcional
    `day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`.
  - `resolveMonth()` (línea 37) se reemplaza por `resolveRange()`:

```ts
function resolveRange(query: { year?: number; month?: number; day?: string }) {
  if (query.day) return dayRange(query.day);
  const now = currentArYearMonth();
  return monthRange(query.year ?? now.year, query.month ?? now.month);
}
```

  - Los dos call sites ya existentes solo cambian el nombre de la función
    que invocan, sin más: `GET /admin/finance/movements` (línea 141,
    llamada en línea 153) y `GET /admin/finance/summary` (línea 252,
    llamada en línea 264) heredan el filtro de día automáticamente.

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- `curl` contra el backend en Docker con `?day=YYYY-MM-DD` en ambos
  endpoints (`/admin/finance/movements` y `/admin/finance/summary`) y
  confirmar que devuelven solo movimientos/resumen de ese día —
  comparado contra el mismo rango pedido con `?year=&month=`, el
  subconjunto de un día coincide.
- Sin `day` en el querystring, el comportamiento es idéntico al de antes
  (mes contable actual AR o el `year`/`month` pedido) — `resolveRange` sin
  `query.day` es el mismo cuerpo que tenía `resolveMonth`.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
