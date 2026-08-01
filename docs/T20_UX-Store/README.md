# T20 — Rediseño visual de la tienda pública

## Qué es esto y por qué existe

`T18_UX-Revision` diagnosticó la fricción de uso (heuristic evaluation sobre el código). `T19_UX-Fixes` implementó los arreglos de flujo y de estructura del **panel admin** a partir de ese diagnóstico. T20 es el paso que faltaba del lado de la **tienda pública**: hasta ahora, la tienda de Eliathi Modas usa el catálogo funcional construido en el MVP (T2-T5) con un estilo visual mínimo (T13 aplicó paleta y tipografía, pero sobre la estructura original) — nunca hubo un rediseño real pensado como identidad de marca completa.

T20 parte de 5 mockups HTML (`mockups/`) que definen esa identidad — paleta, tipografía, y el layout de cada pantalla de la tienda — y los lleva a producción con fidelidad exacta.

## Contexto: de dónde viene esto

- **T18** encontró que el catálogo público tenía un techo estructural (sin buscador, sin paginación real) y una identidad visual mínima, heredada de la demo original.
- **T19** resolvió los problemas de flujo (`06-auto-home-section`, `10-buscador-catalogo`, etc.) tanto en el admin como en la tienda pública, pero mantuvo el estilo visual existente (`catalog.css`) — el foco era la fricción de uso, no la estética.
- **T20** ataca lo que queda: el diseño visual completo de la tienda pública, con un sistema de diseño reutilizable — no solo "repintar Eliathi Modas", sino dejar la base para que cualquier tenant futuro entre con su propia identidad sin tener que rediseñar de nuevo.

## Alcance

Rediseño visual completo de la tienda pública (`/store/:slug/*`), usando **Eliathi Modas como tenant de referencia** — los mockups están hechos con su contenido real (nombre, categorías, productos), pero el sistema que se construye acá es genérico: **cada tenant futuro solo cambia logo, color principal y tipografía** — la estructura, el resto de la paleta (neutros) y los componentes son los mismos para todos.

Páginas cubiertas (una por mockup, ver `mockups/`):
1. Home (`mockup_eliathi_home.html`)
2. Categorías — índice de categorías/colecciones (`mockup_eliathi_categorias.html`) — **página nueva, no existe hoy**
3. Categoría individual (`mockup_eliathi_categoria.html`)
4. Producto (`mockup_eliathi_producto.html`)
5. Checkout — carrito, formulario, confirmación (`mockup_eliathi_checkout.html`)

## Lo que NO entra en T20

- **Cambios de backend o de esquema de base de datos.** Si un elemento del mockup necesita un dato que hoy no existe (por ejemplo, foto de categoría), se implementa la UI preparada para recibirlo, pero la carga real del dato queda para después — ver `analisis.md` para el detalle de cada gap encontrado.
- **Lógica de negocio.** No se cambia cómo se calculan precios, stock, envíos ni pagos — solo cómo se ven.
- **Panel admin**, salvo la tarea `08-admin-configurable.md`, que es la única que toca pantallas de `/admin` (y solo para exponer los campos nuevos que el diseño necesita, cuando ya existen en el backend — los que no existen quedan marcados como pendientes, no se agregan acá).

## Cómo se relaciona con T18/T19

`analisis.md` es el puente: lee los 5 mockups y los compara contra el código real de la tienda pública (no contra suposiciones) para decidir qué se crea, qué se adapta y qué directamente no se puede hacer sin tocar backend. Cada tarea de `tareas/` referencia qué mockup implementa y qué parte de `analisis.md` la origina.

## Cómo trabajamos esta carpeta

Mismo patrón que el resto del proyecto (`docs/T<N>_*/`): cada tarea se implementa una por vez, se verifica de verdad (no solo `tsc --noEmit`) antes de pasar a la siguiente, y el archivo de tarea se actualiza con una sección de Resultado al cerrarla.

**Orden y dependencias:**
- `01-design-tokens` es prerequisito de todas las demás — define la paleta, tipografía y variables CSS que el resto usa.
- `02-header-footer` es prerequisito de `03` a `07` — todas las páginas de la tienda comparten el mismo header/footer.
- `03` a `07` son independientes entre sí una vez que `01` y `02` están listas — se pueden hacer en cualquier orden.
- `08-admin-configurable` puede hacerse en paralelo con `03`-`07`, pero algunos de sus campos requieren tocar backend — está marcado explícitamente en esa tarea cuáles.

## Estado — T20 completo (2026-08-01)

| # | Tarea | Estado |
|---|---|---|
| 1 | [01-design-tokens.md](tareas/01-design-tokens.md) — paleta, tipografía, variables CSS | ✅ Completa |
| 2 | [02-header-footer.md](tareas/02-header-footer.md) — header/footer nuevos, announcement bar | ✅ Completa |
| 3 | [03-home.md](tareas/03-home.md) — hero, categorías, secciones de producto, mid-banner | ✅ Completa |
| 4 | [04-pagina-categorias.md](tareas/04-pagina-categorias.md) — índice de categorías/colecciones (página nueva) | ✅ Completa |
| 5 | [05-pagina-categoria.md](tareas/05-pagina-categoria.md) — categoría individual, paginación numerada | ✅ Completa |
| 6 | [06-pagina-producto.md](tareas/06-pagina-producto.md) — ficha de producto, galería, relacionados | ✅ Completa |
| 7 | [07-checkout.md](tareas/07-checkout.md) — carrito, formulario, confirmación | ✅ Completa (pago real de punta a punta pendiente de una pasada manual del usuario) |
| 8 | [08-admin-configurable.md](tareas/08-admin-configurable.md) — verificación + backend pendiente consolidado | ✅ Completa |

La lista de "backend pendiente" para una fase futura queda consolidada en el Resultado de `08-admin-configurable.md`.
