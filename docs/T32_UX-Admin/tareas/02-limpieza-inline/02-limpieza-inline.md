# Tarea 2 — Limpieza: colores viejos hardcodeados inline

**Estado:** ✅ Hecha — verificada en vivo por el usuario en `/admin/store` y
`/admin/finance`.

**Depende de:** Tarea 1 (necesita el fondo/paleta nueva para poder ver las
fugas por contraste).

## Objetivo (según `plan.md`, T32/02)

El grep que sugiere la spec (`#2563eb|#1d4ed8|#111827|#1f2937`) solo cubre
el azul viejo. Un grep más amplio sobre `admin/pages/` y `admin/components/`
encontró fugas de grises/violetas viejos en `style={{}}` inline que ese
patrón no detecta (`analisis.md` sección 4a) — hay que barrerlas para que
el DoD general ("las 13 páginas con paleta nueva") no quede roto por 6
archivos sueltos.

## Pasos

- [x] `MyStorePage.tsx:404,483,577,765` — `#e5e7eb` → `#E8E4DF` (el `#fff`
      que acompaña a algunos de estos no cambia).
- [x] `TaxonomyManager.tsx:259` — `#e5e7eb` → `#E8E4DF`.
- [x] `StockPage.tsx:246` — `#f9fafb` → `#F8F7F5`.
- [x] `FinanzasPage.tsx:205,222,413` — `#9ca3af` → `#8A8278`. **Corrección
      sobre el plan original**: no es texto muted, son los 3 lugares donde
      `wallet.color ?? "#9ca3af"` / `mov.walletColor ?? "#9ca3af"` definen
      el color del punto de una "cartera" sin color propio asignado —
      mismo criterio de limpieza igual, solo se corrige la descripción.
- [x] `DashboardPage.tsx:216` — se deja intacto, se resuelve en la Tarea 3.
- [x] **No se tocó** (semánticos, confirmados en `analisis.md` sección 4b):
      `StockPage.tsx:107`, `FinanzasPage.tsx` vía `MOVEMENT_TYPE_UI`
      (`types.ts:325-326`), `ProductsPage.tsx:192`,
      `ProductEditPage.tsx:244`.
- [x] **No se tocó** (fuera de alcance, dato de usuario):
      `FinanzasPage.tsx:40` (`#fcc424`, default del color picker de una
      cartera nueva).

## Cómo se verificó

`grep -rnoE "#[0-9a-fA-F]{3,6}"` sobre `admin/pages/` y `admin/components/`
tras el cambio: el único hit de la paleta vieja que queda es
`DashboardPage.tsx:216` (`#2563eb`), diferido a la Tarea 3 a propósito.
`npx tsc --noEmit` limpio. Verificación visual en vivo por el usuario:
`/admin/store` (bordes de logo/hero/banner, sin diferencia visible ya que
el cambio es sutil, sin nada roto) y `/admin/finance` (carteras "Tarjeta" y
"Transferencia", sin color propio asignado, muestran el punto gris nuevo
`#8A8278` en vez del gris viejo — consistente con la paleta).

## Definition of Done

- [x] `grep -rnoE "#[0-9a-fA-F]{3,6}" frontend/src/features/admin/pages/
      frontend/src/features/admin/components/` no devuelve ningún valor de
      la paleta vieja (`#e5e7eb`, `#9ca3af`, `#f9fafb`, `#2563eb`,
      `#1d4ed8`, `#111827`, `#1f2937`) salvo el diferido de la Tarea 3.
- [x] Los hits que quedan son solo los semánticos listados arriba y el
      `#fcc424` de usuario.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
