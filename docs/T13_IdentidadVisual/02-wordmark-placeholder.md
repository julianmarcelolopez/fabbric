# Tarea 2 — Wordmark de texto como logo placeholder

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** [01-tipografia-y-paleta.md](01-tipografia-y-paleta.md)

## Objetivo

Que una tienda sin logo cargado se vea prolija igual, con un tratamiento visual en vez de texto plano — fallback genérico, no necesario para Eliathi Modas (que ya tiene logo real) pero sí para cualquier otra org sin `logoUrl`.

## Pasos

- [x] `frontend/src/features/store/StoreLayout.tsx`: cuando no hay `logoUrl`, se muestra un `.store-brand-badge` — círculo con la inicial del `storeName` en mayúscula, fondo `accentColor` de esa org, texto blanco — en vez de la imagen.
- [x] Con `logoUrl` cargado, el comportamiento no cambia (la imagen sigue teniendo prioridad, `? img : badge`).

## Definition of Done

- [x] `tsc --noEmit` limpio; `vite build` compila sin errores.
- [x] Verificación en navegador: se probó de verdad, no solo en teoría — se puso `logoUrl = null` en la org demo directo en la DB, se confirmó el badge (círculo naranja con "E") viéndose prolijo junto al nombre "Eliathi Modas", y se repuso el logo real al terminar.
