# Tarea 3 — `HomeSectionsPage` (lista drag & drop + toggle)

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [02-endpoints-home-sections.md](02-endpoints-home-sections.md)

## Objetivo

La pantalla de administración del home: agregar secciones desde lo que existe (categorías y colecciones aún no agregadas), reordenarlas arrastrando, mostrarlas/ocultarlas y quitarlas.

## Pasos

- [x] Entrada "Home" en el sidebar del admin (`AdminLayout`), ruta `/admin/home`
- [x] `HomeSectionsPage.tsx`:
  - Dropdown "Agregar sección" con lo no-agregado, etiquetado "Categoría: X" / "Colección: Y" → POST
  - Fila por sección: grip ⠿, badge de tipo, nombre, conteo de productos, toggle visible, quitar (con confirm)
  - **Drag & drop nativo HTML5**: la lista se reordena en vivo mientras arrastrás (`onDragOver` mueve el ítem), al soltar persiste con `PUT /order`; si el PUT falla, rollback al orden previo + error visible
  - Indicador ámbar para refs desactivados ("categoría desactivada — no se muestra en la tienda") y filas atenuadas cuando `visible=false`
- [x] Estados de carga/error consistentes (ApiError → mensaje)

## Definition of Done

- [ ] Agregar una categoría y una colección al home desde el dropdown → aparecen; el dropdown ya no las ofrece
- [ ] Arrastrar para intercalar el orden → persiste tras F5
- [ ] Toggle visible y quitar funcionan (verificar también que POST/PATCH/PUT/DELETE pasan CORS en navegador — gotcha de T2)
- [ ] Consola sin errores; `tsc --noEmit` limpio

(La verificación fina en navegador puede diferirse a la tarea 5 junto con el preview, como se hizo en T2.)
