# Tarea 4 — Definition of Done de T5

**Estado:** ⬜ Pendiente
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar la Fase 5 con el criterio del plan verificado: */store/<slug> sin sesión refleja el orden/visibilidad configurados* — y el contrato de seguridad de los endpoints públicos comprobado.

## Checklist final (usuario, en navegador)

- [ ] En `/admin/config`: poné nombre real a la tienda, color de acento y subí un logo → guardar
- [ ] Abrí **`/store/demo` en ventana de incógnito** (Ctrl+Shift+N — sin sesión): la portada muestra el nombre/logo/color y las secciones del home en el orden que configuraste en T3
- [ ] Click en la Remera Oversize → detalle con galería, talles/colores, stock y precio (el override de L/rojo se refleja)
- [ ] **El cambio en admin se refleja en la tienda**: en la ventana normal reordená las secciones del home → F5 en la incógnito → orden nuevo
- [ ] Ocultá una sección en el admin → F5 incógnito → desaparece de la tienda
- [ ] Poné un producto en estado `Pausado` → F5 incógnito → desaparece del home y su URL de detalle da "no encontrado"; volvelo a `Activo`
- [ ] **Contrato de seguridad a ojo**: F12 → pestaña Network → mirá la respuesta de `/public/demo/home` y del detalle → no aparecen `costPrice` ni `stockLocal` (verificación mía también, por suite)
- [ ] Consola sin errores en las páginas de la tienda
- [ ] Verificación mía: suites de las tareas 1-2 en verde; `tsc --noEmit` limpio

## Al cerrar

- Actualizar tabla del README + memoria de sesión
- Ofrecer commit (T0-T5 sin respaldo)
- Siguiente fase: **T6 — Portal cliente + Carrito + Checkout + Mercado Pago** (armar `docs/T6_Checkout/` primero — es la fase más grande del MVP: retoma Google OAuth de T1 y el tipo `sync` de T4)
