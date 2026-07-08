# Tarea 5 — Definition of Done de T3

**Estado:** ✅ Hecha (2026-07-08)
**Depende de:** tareas 1 a 4

## Objetivo

Cerrar la Fase 3 con el criterio del plan verificado por el usuario en navegador: *lista de home mezclando categorías/colecciones, reorder, toggle, preview en vivo, persistencia tras recargar*.

## Checklist final (usuario, en navegador)

Con los contenedores corriendo y los datos de T2 (categorías `Remeras`/`Remeras Nuevas`, colecciones `Verano 2027`/`Ofertas`, producto con imágenes):

- [x] Secciones agregadas mezclando categoría y colecciones; el usuario además cargó un segundo producto (`Remera Boxy Fit Roja`) y la sección Remeras muestra ambos
- [x] El preview muestra cada sección con productos, imagen y precio
- [x] Drag & drop: el preview reacomoda al instante y el orden persiste tras F5
- [x] Toggle visible: desaparece del preview al instante y persiste tras F5
- [x] Quitar una sección la devuelve al dropdown
- [x] Desactivar la categoría → aviso ámbar + fuera del preview; reactivarla la restaura
- [x] Consola del navegador sin errores
- [x] `tsc --noEmit` limpio en los tres workspaces
- [x] Suite de backend de la tarea 2: 20/20 PASS

## Al cerrar

- Actualizar la tabla de estado del README de esta carpeta y la memoria de sesión
- Sugerir el commit (pendiente desde T0) — con T3 cerrada serían 4 fases sin respaldo
- Siguiente fase: **T4 — Stock** — armar `docs/T4_Stock/` con este mismo formato antes de arrancar
