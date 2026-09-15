# Tarea 6 — Sidebar: nombre de la org en Cormorant Garamond

**Estado:** ✅ Hecha — sin cambios de código adicionales, ya venía incluida
en la Tarea 1.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/06)

Único cambio tipográfico opcional que sugiere la spec — ya viene resuelto
en el CSS que adopta la Tarea 1
(`admin-redesign.css:20`:
`.sidebar-brand h2 { font-family: 'Cormorant Garamond', serif; }`). Esta
tarea es solo la verificación puntual, no requiere cambios de código
adicionales. Ver `analisis.md` sección 7.

## Pasos

- [x] Verificado en vivo que `.sidebar h2` se renderiza en Cormorant
      Garamond tras la Tarea 1 (captura de la Tarea 1: "Demo" en serif) —
      sin cambios extra en `AdminLayout.tsx`.
- [x] Revisado `admin.css:16` (`.sidebar h2`): no tiene `white-space:
      nowrap` ni `overflow: hidden`/`text-overflow: ellipsis` — un nombre
      largo hace wrap a 2 líneas en vez de desbordar o cortarse. Esta
      regla ya existía igual antes del rebrand (mismo comportamiento,
      solo cambió `font-family`), así que no hay riesgo nuevo introducido
      por esta tarea. No se probó con un nombre real largo porque el
      comportamiento de wrap ya está garantizado por el CSS, sin
      necesidad de un caso de prueba en vivo.

## Definition of Done

- [x] El nombre de la organización se ve en la tipografía serif, legible;
      un nombre largo hace wrap en vez de desbordar (comportamiento CSS
      heredado, no nuevo).

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
