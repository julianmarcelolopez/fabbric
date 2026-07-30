# UX Review Consolidado — Plataforma fabbric

> Heuristic evaluation (ver método en `README.md`): análisis experto sobre el código real, sin datos de usuarios reales. Los hallazgos de mobile (`05-mobile.md`) están inferidos del CSS, pendientes de verificación en un dispositivo real antes de priorizarlos en un sprint — se incluyen acá igual, marcados explícitamente.

## Resumen ejecutivo

fabbric tiene un MVP funcional y bien construido — todo lo que hace, lo hace correctamente (verificado en sesiones previas con HTTP real, no solo lectura de código). El problema que encuentra esta revisión no es de features rotas, sino de **prerequisitos silenciosos**: hay al menos tres pasos que un admin nuevo tiene que descubrir por su cuenta, sin que el sistema se los anuncie, y que si se saltea dejan la tienda con productos cargados pero **invisibles o incomprables** sin ningún error explícito:

1. Un producto no aparece en la tienda pública sin agregar su categoría a "Home" — pantalla separada, sin ningún link desde Productos.
2. Un producto sin al menos una variante (talle/color) no se puede comprar — sin aviso hasta que un cliente real lo intenta.
3. Sin ninguna zona de envío configurada, el checkout falla siempre — sin aviso hasta que un cliente real lo intenta.

Contando el camino real en el código (`01-flujo-critico.md`), un admin nuevo necesita **11 pasos** repartidos en 4 pantallas no consecutivas para tener su primer producto visible y compartible — muy por encima del principio de "máximo 3 pasos para cualquier tarea crítica" que guía este análisis. No hay datos reales de cuánto tarda esto en minutos (no hay analytics ni tests de usuario — ver método), pero el conteo de pasos y prerequisitos ocultos es, en sí mismo, la señal más clara de fricción alta.

Del lado del comprador, el hallazgo más fuerte es que **el login con Google es obligatorio para comprar** (no hay checkout como invitado) y que **la confirmación por email prometida después de pagar no le llega a compradores reales** en el estado actual — dos golpes directos a la confianza justo en el momento más sensible de la compra.

Los hallazgos de mobile (sidebar admin fijo de 220px sin colapsar, tablas sin scroll horizontal) son los de mayor impacto potencial de todo el review si se confirman — porque el propio contexto de negocio dice que el admin usa iPhone como dispositivo principal — pero siguen siendo una inferencia del CSS, no una observación real, y no deberían priorizarse en un sprint sin antes abrir el panel en un dispositivo real.

## Top 10 problemas por impacto

| # | Problema | Módulo | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| 1 | Producto no aparece en la tienda sin agregarlo a "Home" (paso oculto, desconectado) | Flujo crítico | Alto | Bajo | 🔴 Ya |
| 2 | Sin zona de envío activa, el checkout falla siempre, sin aviso previo | Panel admin / Checkout | Alto | Bajo | 🔴 Ya |
| 3 | Producto sin variante no se puede comprar, aviso recién en la tienda pública | Flujo crítico | Alto | Bajo | 🔴 Ya |
| 4 | Confirmación por email prometida al comprador, pero no entregada hoy | Checkout | Alto | Bajo (copy) | 🔴 Ya |
| 5 | Login con Google obligatorio para comprar — no hay checkout como invitado | Checkout | Alto | Alto | 🟡 Próximo sprint |
| 6 | Sidebar admin fijo de 220px, sin colapsar en mobile *(inferido, verificar antes)* | Mobile | Alto* | Medio | 🟡 Próximo sprint |
| 7 | Tablas del admin sin scroll horizontal ni alternativa mobile *(inferido, verificar antes)* | Mobile | Alto* | Bajo | 🔴 Ya (bajo riesgo aun sin verificar) |
| 8 | Sin buscador/filtros — techo de 8 productos por sección en la tienda | Catálogo público | Alto | Medio-Alto | 🟢 Más adelante |
| 9 | Estado vacío del home es un callejón sin salida para el visitante | Catálogo público | Medio | Bajo | 🔴 Ya |
| 10 | "Cobrar a cartera" queda bloqueado sin explicación si no hay cartera creada | Panel admin | Medio | Bajo | 🔴 Ya |

\* Impacto marcado como Alto condicionado a confirmación visual en dispositivo real (ver `05-mobile.md`).

## Hallazgos por módulo

**`01-flujo-critico.md`** — El hallazgo central de todo T18: 11 pasos reales, en 4 pantallas no consecutivas, para tener el primer producto visible y compartible. Dos prerequisitos ocultos (Home, variantes) son responsables de la mayor parte de esa fricción. Hallazgos menores: terminología técnica ("slug") expuesta sin necesidad, categoría como prerequisito silencioso de producto, dashboard vacío sin CTA, talle/color sin sugerencias.

**`02-panel-admin.md`** — Un tercer prerequisito silencioso (zona de envío) se suma a los de la tarea 1. El Dashboard es denso (14 bloques) desde el primer login, sin distinguir cuenta nueva de cuenta con historia. Cobrar un pedido manual puede quedar bloqueado sin explicación si falta una cartera. Hallazgos menores en Stock (conceptos online/local superpuestos) y Finanzas (terminología contable, tooltips no accesibles en mobile).

**`03-catalogo-publico.md`** — No existe ningún mecanismo de búsqueda, filtro, ni forma de ver más de 8 productos por sección — un techo estructural que no se nota con el catálogo chico de la demo pero limita a cualquier tenant que crezca. El estado vacío del home (cuando falta el paso de Home de la tarea 1) es un callejón sin salida sin contacto destacado. Hallazgos menores de accesibilidad y orden de lectura en la ficha de producto.

**`04-checkout.md`** — Los dos hallazgos más fuertes de todo el review del lado comprador: login con Google obligatorio (sin checkout como invitado) y una promesa de email de confirmación que no se cumple hoy. Ambos golpean la confianza en el momento más sensible del flujo — justo antes y justo después de pagar. Sin zona de envío, el comprador también queda sin salida (mismo problema que en 02, visto del otro lado).

**`05-mobile.md`** — Todo inferido del CSS, pendiente de confirmación real. El hallazgo de mayor impacto potencial de todo T18: el sidebar admin fijo de 220px sin colapsar, que si se confirma haría el panel casi inusable en el dispositivo que el admin objetivo realmente usa (iPhone). Las tablas del admin tampoco tienen scroll horizontal. Del lado tienda, el riesgo es menor — el checkout ya tiene su propio breakpoint y las grillas de catálogo son responsive por diseño — salvo el topbar, que podría desbordar con un cliente logueado.

## Plan de acción sugerido

### Sprint 1 — Quick wins (esta semana)
- Auto-crear la `home_section` (visible) al crear la primera categoría de la org.
- Aviso persistente en el Dashboard mientras no haya ninguna zona de envío activa.
- Aviso inline en `ProductEditPage` cuando el producto no tiene ninguna variante.
- Ajustar el copy de `CheckoutResultPage` para no prometer un email que hoy no llega; destacar "Mis pedidos" en su lugar.
- Envolver las tablas del admin en un contenedor con `overflow-x: auto` (mitiga el hallazgo mobile 🔴 sin necesitar verificación previa — cambio de bajo riesgo).
- Destacar WhatsApp/Instagram en el estado vacío del home y en el error de checkout sin zona de envío.
- Mensaje explícito (no solo botón deshabilitado) cuando falta una cartera para poder cobrar un pedido manual.
- Datalist de talles sugeridos en `VariantEditor`; colapsar el campo "Slug" detrás de un link opcional.

### Sprint 2 — Mejoras estructurales (próximas 2 semanas)
- Verificar en un iPhone real los dos hallazgos de `05-mobile.md` marcados como pendientes, y recién ahí priorizar el sidebar colapsable.
- Checklist de onboarding real en el Dashboard vacío (Categoría → Producto → Home → Envíos), consolidando los prerequisitos silenciosos detectados en 01 y 02.
- Link "Ver todos en [categoría]" cuando una sección supera los 8 productos, como paso intermedio hacia un catálogo paginado.
- Evaluar (sin implementar todavía) el rediseño del checkout como invitado — research de cuánto cambiaría el flujo actual.

### Sprint 3 — Rediseño de flujos críticos (mes siguiente)
- Checkout como invitado, con el login de Google como opción para historial de pedidos — el cambio de mayor impacto potencial en conversión de todo el review.
- Endpoint público de catálogo con paginación real, resolviendo el techo de 8 productos por sección de fondo.
- Resolver la entrega real de emails transaccionales a compradores.
- Vista de tarjetas para Stock y Pedidos en mobile (si el sidebar colapsable del Sprint 2 confirma que hace falta).
- Unificar Categorías, Colecciones y Home en un único flujo guiado de "publicar mi tienda".
