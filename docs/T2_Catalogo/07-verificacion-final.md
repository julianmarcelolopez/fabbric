# Tarea 7 — Definition of Done de T2

**Estado:** ✅ Hecha (2026-07-08)
**Depende de:** tareas 1 a 6

## Objetivo

Cerrar la Fase 2 con el criterio del plan verificado de punta a punta: *2 categorías, 2 colecciones, producto en ambas colecciones con variantes talle/color y stock online/local distinto; preview en vivo*.

## Checklist final

Con los contenedores corriendo (`docker compose up`):

- [x] En el navegador, como owner de `demo`: categorías, colecciones (`Verano 2027`, `Ofertas`), producto `Remera Oversize Negra` con precio en ambas colecciones, variantes talle/color con stock online/local distinto, imágenes ordenadas — todo desde el admin (verificado por el usuario, con capturas)
- [x] El preview en vivo refleja edición de campos, variante seleccionada e imágenes sin guardar
- [x] Recargar la página: todo persistido correctamente
- [x] **Aislamiento multi-tenant end-to-end**: cubierto por las suites de las tareas 2-4 (staff de org temporal: listas vacías y 404 en cada recurso de demo)
- [x] Constraints en DB: verificadas con inserts directos en la tarea 1 (23505/23502) además de la validación de app
- [x] Consola del navegador limpia en todas las páginas nuevas
- [x] `tsc --noEmit` limpio en los tres workspaces
- [x] Los datos de prueba del criterio quedan en `demo` (base para T3 — secciones del home)

## Incidencias encontradas y resueltas durante la verificación

- **CORS bloqueaba PATCH/PUT/DELETE desde el navegador** (default de `@fastify/cors`) — fix en `index.ts`, detalle en la tarea 5. Los tests server-to-server no lo detectan: quedó como lección de proceso.
- Confusión de UX detectada: el usuario creó primero el producto como "colección" — señal de que la diferencia categoría/colección necesita un texto de ayuda en la UI (anotado como mejora menor para T3/T5, no bloquea).

## Al cerrar

- Actualizar la tabla de estado del README de esta carpeta
- Sugerir (de nuevo) el primer commit si sigue pendiente
- Siguiente fase: **T3 — Secciones del home** — armar `docs/T3_HomeSections/` con este mismo formato antes de arrancar
