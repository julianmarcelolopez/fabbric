# Fase 0 — Gaps abiertos (previo a escribir código)

**Estado: resuelta**, en dos vueltas. Ver `overview.md`, secciones "Decisión de arquitectura" y "Decisiones resueltas", y `diagnostico.md` para el detalle completo de cómo se llegó a cada una.

## Objetivo (según plan.md)

Cerrar, antes de escribir código, los puntos que un prompt de implementación daría por sentado sin especificar — para no repetir el patrón detectado en la revisión de T22 vs. T23.

## Historia de esta fase (por qué hubo una segunda vuelta)

La primera vuelta (`diagnostico.md`) resolvió 8 gaps + 2 decisiones de negocio asumiendo un proyecto Supabase nuevo, con tablas propias (`productos`/`movimientos`/`ventas`) y una función RPC de Postgres. Al revisar `backend/src/db/schema.ts` se descubrió que **Eliathi Modas ya es un tenant real de fabbric**, con catálogo, stock por canal y pedidos manuales ya construidos (T2/T4/T6/T7/T9) — construir un sistema paralelo hubiera duplicado ese trabajo y desconectado el stock del local del que ve la tienda online. Se revirtió esa decisión y se rediseñó la Fase 1 para **extender** el backend existente en vez de crear uno nuevo.

## Checklist (estado final, tras la segunda vuelta)

- [x] **Proyecto Supabase**: el mismo que ya usa `backend/`/`frontend/` (`fabbric-dev`). Revertido respecto de la primera vuelta.
- [x] **Modelo de datos**: se reusan `products`/`productVariants`/`stockMovements`/`orders`. Única columna nueva: `barcode` en `productVariants`.
- [x] **Transacción atómica de venta**: no es una función RPC de Postgres — es el endpoint nuevo `POST /admin/orders/venta-local` en el backend existente, pensado como "pistola de POS" (un solo toque).
- [x] **Login**: Supabase Auth real, mismo usuario que el panel admin (`admin_users`, roles `owner`/`staff`). Se descarta el mapeo `<usuario>@eliathi.local` de la primera vuelta — ya no hace falta.
- [x] **RLS**: no aplica — la autorización sigue en el backend (`requireAdminAuth`/`requireOrgId`).
- [x] **Contrato de stock**: no hace falta una función/vista propia — se usa `productVariants.stockLocal`, ya mantenido por el backend existente.
- [x] **Medios de pago → cartera**: `efectivo`, `transferencia`, `tarjeta`, `mercadopago` — 4 carteras separadas, resueltas automáticamente por el backend (`ensureMpWallet`-like) a partir del medio de pago elegido. No hace falta columna `medio_pago` en `orders`.
- [x] **Mismatches del mockup** (medio de pago, cantidad en "Registrar entrada", y ahora selector de categoría en el alta): agregados a `mockups.html`.
- [x] **Nombre de la carpeta de la PWA**: `pwa/`, sumada a los `workspaces` del `package.json` raíz.
- [x] **Carga masiva por CSV**: se difiere (no es un gap sin resolver — es una decisión consciente de no implementarla en esta pasada). El diseño (upsert, sanitización, columna `stock`) queda documentado en `tareas/06-carga-masiva/` para retomar más adelante.

## Criterios de aceptación de esta fase

- Todas las decisiones de `overview.md` ("Decisión de arquitectura" + "Decisiones resueltas") están reflejadas sin contradicciones en `analisis.md`, `plan.md` e `implementacion.md`.
- No queda ningún punto de `diagnostico.md` sin una decisión explícita, incluyendo los que cambiaron de respuesta en la segunda vuelta.

## Dependencias

- **La bloquean**: ninguna.
- **Bloquea**: todas las fases siguientes (01 a 07).
