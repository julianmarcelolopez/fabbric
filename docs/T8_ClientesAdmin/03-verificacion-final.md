# Tarea 3 — Definition of Done de T8

**Estado:** ✅ Completada (2026-07-10)
**Depende de:** tareas 1 a 2

## Objetivo

Cerrar la Fase 8 con el criterio del plan: *el cliente de Fase 6 aparece listado con historial correcto*.

## Checklist final (usuario, en navegador)

Con los datos reales acumulados (Patricia con los pedidos #1, #2 y #4):

- [x] `/admin/customers`: Patricia listada con sus datos de contacto del checkout, **3 pedidos** y el **total gastado** correcto (#1 $25.000 + #2 $28.000 + #4 $20.000 = $73.000 — la suite lo verificó a nivel API contra la DB; el usuario navegó la lista hasta el detalle)
- [x] El buscador la encuentra por nombre y por email (cubierto por la suite: `search=patricia` y `search=LOPEZAZAME` case-insensitive)
- [x] Entrar al detalle: dirección visible (Teodoro Garcia 3594), historial con los 3 pedidos, badges de estado/tipo correctos (#4 como "Mixto", #2 "Enviado" con el avance de T7)
- [x] Click en un pedido del historial → cae en la gestión de T7 (`/admin/orders/:id`)
- [x] Consola limpia; verificación mía: suite de la tarea 1 en verde (33/33), typecheck limpio en ambos contenedores

## Resultado (2026-07-10)

Verificado en navegador por el usuario (captura del detalle de Patricia Azame con contacto, dirección e historial completo). **Criterio de la fase cumplido**: *el cliente de Fase 6 aparece listado con historial correcto*. La fase más corta del plan cerró en el día.

## Al cerrar

- [x] Actualizar README + memoria; sugerir commit (`feat: t8 clientes admin`)
- Siguiente: **T9 — Finanzas** (armar `docs/T9_Finanzas/` primero) — la anteúltima fase del MVP
