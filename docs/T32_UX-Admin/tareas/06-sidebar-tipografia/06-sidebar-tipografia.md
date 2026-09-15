# Tarea 6 — Sidebar: nombre de la org en Cormorant Garamond

**Estado:** ⬜ Pendiente

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/06)

Único cambio tipográfico opcional que sugiere la spec — ya viene resuelto
en el CSS que adopta la Tarea 1
(`admin-redesign.css:20`:
`.sidebar-brand h2 { font-family: 'Cormorant Garamond', serif; }`). Esta
tarea es solo la verificación puntual, no requiere cambios de código
adicionales. Ver `analisis.md` sección 7.

## Pasos

- [ ] Verificar en vivo que `.sidebar-brand h2` (nombre de la
      organización) se renderiza en Cormorant Garamond tras la Tarea 1 —
      no debería requerir ningún cambio extra en `AdminLayout.tsx`.
- [ ] Probar con un nombre de org corto y uno largo (o forzar uno largo de
      prueba) para confirmar que no desborda ni corta el ancho del
      sidebar (220px, 240px en mobile).

## Definition of Done

- [ ] El nombre de la organización se ve en la tipografía serif, legible,
      sin desbordar el sidebar con nombres largos.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
