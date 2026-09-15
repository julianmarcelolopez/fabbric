# Tarea 2 — Limpieza: colores viejos hardcodeados inline

**Estado:** ⬜ Pendiente

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

- [ ] `MyStorePage.tsx:404,483,577,765` — `#e5e7eb` → `#E8E4DF` (el `#fff`
      que acompaña a algunos de estos no cambia).
- [ ] `TaxonomyManager.tsx:259` — `#e5e7eb` → `#E8E4DF`.
- [ ] `StockPage.tsx:246` — `#f9fafb` → `#F8F7F5` (si la Tarea 4 ya movió
      este bloque fuera de la fila expandible, este paso puede no aplicar
      — verificar orden de ejecución).
- [ ] `FinanzasPage.tsx:205,222,413` — `#9ca3af` → `#8A8278`, o reemplazar
      por la clase `.muted` donde el elemento lo permita en vez de repetir
      el hex una cuarta vez.
- [ ] `DashboardPage.tsx:216` — se resuelve en la Tarea 3 (es parte del
      panel de 2 series, requiere una decisión de color, no un reemplazo
      mecánico) — no tocar acá para evitar pisarse con esa tarea.
- [ ] **No tocar** (semánticos, confirmados en `analisis.md` sección 4b):
      `StockPage.tsx:107`, `FinanzasPage.tsx` vía `MOVEMENT_TYPE_UI`
      (`types.ts:325-326`), `ProductsPage.tsx:192`,
      `ProductEditPage.tsx:244`.
- [ ] **No tocar** (fuera de alcance, dato de usuario):
      `FinanzasPage.tsx:40` (`#fcc424`, default del color picker de una
      cartera nueva).

## Definition of Done

- [ ] `grep -rnoE "#[0-9a-fA-F]{3,6}" frontend/src/features/admin/pages/
      frontend/src/features/admin/components/` no devuelve ningún valor de
      la paleta vieja (`#e5e7eb`, `#9ca3af`, `#f9fafb`, `#2563eb`,
      `#1d4ed8`, `#111827`, `#1f2937`).
- [ ] Los hits que queden son solo los semánticos listados arriba y el
      `#fcc424` de usuario.
- [ ] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
