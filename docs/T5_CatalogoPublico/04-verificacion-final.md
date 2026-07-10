# Tarea 4 — Definition of Done de T5

**Estado:** ✅ Hecha (2026-07-08)
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar la Fase 5 con el criterio del plan verificado: */store/<slug> sin sesión refleja el orden/visibilidad configurados* — y el contrato de seguridad de los endpoints públicos comprobado.

## Checklist final (usuario, en navegador)

- [x] `/admin/config`: nombre "Tienda Demo", descripción, logo subido → "Guardado ✓" (captura del usuario)
- [x] `/store/demo` sin sesión (incógnito): portada con nombre/logo y secciones en el orden configurado
- [x] Detalle de la Remera Oversize: galería, talle/color, "Stock disponible (10)", botón de carrito deshabilitado (captura)
- [x] Cambios admin→tienda (reorder, sección oculta, producto pausado → 404): verificados por la suite 20/20 de la tarea 2 contra los mismos endpoints + confirmación del usuario
- [x] Contrato de seguridad: sin `costPrice`/`stockLocal`/`orgId` en las respuestas públicas (suite, por ausencia en el body crudo)
- [x] Consola sin errores (usuario)
- [x] Suites de las tareas 1 (11/11) y 2 (20/20) en verde; `tsc --noEmit` limpio

## Al cerrar

- Actualizar tabla del README + memoria de sesión
- Ofrecer commit (T0-T5 sin respaldo)
- Siguiente fase: **T6 — Portal cliente + Carrito + Checkout + Mercado Pago** (armar `docs/T6_Checkout/` primero — es la fase más grande del MVP: retoma Google OAuth de T1 y el tipo `sync` de T4)
