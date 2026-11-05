# Status — T43 Color opcional en variantes

Ver el problema completo en
[`specs/T43_ColorOpcional.md`](specs/T43_ColorOpcional.md). Este
archivo es solo el estado.

## Estado general: ✅ Implementado y verificado en las 4 capas

| Paso | Estado |
|---|---|
| Diagnóstico (en qué 4 capas color es obligatorio hoy) | ✅ Hecho |
| Propuesta de alcance (opcional para todos, sin flag por categoría) | ✅ Hecha |
| Preguntas abiertas respondidas (formato de barcode `17006000.000`, talle libre) | ✅ Respondidas (2026-11-05) |
| Plan técnico detallado | ✅ Hecho — ver `plan.md` |
| **Implementación (4 tareas)** | ✅ **Hechas** — ver tabla abajo |
| **Verificación automatizada (Playwright)** | ✅ **Hecha** — Tarea 3 (10/10) + Tarea 4 (7/7) |

## Tareas (`tareas/`)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [Backend: color opcional (DB + Zod + rutas)](tareas/01-backend-color-opcional/01-backend-color-opcional.md) | — | ✅ Hecha |
| 2 | [Admin: `VariantEditor.tsx`](tareas/02-admin-variant-editor/02-admin-variant-editor.md) | 1 | ✅ Hecha (admin confirmado OK por el usuario) |
| 3 | [Storefront: ocultar selector de color](tareas/03-storefront-selector-color/03-storefront-selector-color.md) | 1 | ✅ Hecha — Playwright 10/10, capturas en `tareas/03.../test/` |
| 4 | [PWA: Alta y Ficha](tareas/04-pwa-alta-y-ficha/04-pwa-alta-y-ficha.md) | 1 | ✅ Hecha — Playwright 7/7, capturas en `tareas/04.../test/` |

**Hallazgos durante la implementación** (no estaban en `plan.md`
original, documentados en cada tarea):
- `altaRapidaSchema` (el endpoint real que usa la PWA, Tarea 1).
- 7 pantallas que armaban `"{talle}/{color}"` a mano y hubieran
  mostrado `/null` para un perfume (`OrderNewPage.tsx`,
  `StockPage.tsx`, `StoreProductPage.tsx`,
  `CartContext.tsx`/`CartDrawer.tsx`, `CheckoutPage.tsx`,
  `OrderDetailPage.tsx`, `CarritoScreen.tsx` de la PWA) — todas
  corregidas al propagar el tipo `string | null`.
- El botón de compra de la ficha pública decía "Elegí talle **y
  color**" aun sin eje de color (Tarea 3) — encontrado por el test
  automatizado, no a simple vista.
- Las 5 queries públicas de filtros de categoría/colección/marca/
  novedades/ofertas no excluían colores `null` (Tarea 3) — también
  encontrado por el test, hubiera mostrado un filtro de color
  "fantasma" para cualquier categoría con un perfume con stock.
- El contenedor Docker de `pwa` tenía `node_modules` desactualizado
  (le faltaba `react-easy-crop`) y tiraba 500 al cargar — sin
  relación con el código de T43, resuelto con
  `docker compose up -d --build -V pwa`.

## Verificación automatizada (Playwright)

Dos scripts, mismo patrón que los `.mjs` ya existentes en el repo
(`pwa/t29-04-pwa-marca.mjs`, etc.): org/usuario/productos
descartables, corren contra los servicios reales en Docker, capturan
pantallas y limpian todo al final.

- `frontend/t43-storefront-color-opcional.mjs` → **10 PASS, 0 FAIL**.
  Capturas en [`tareas/03-storefront-selector-color/test/`](tareas/03-storefront-selector-color/test/).
- `pwa/t43-pwa-alta-color-opcional.mjs` → **7 PASS, 0 FAIL**.
  Capturas en [`tareas/04-pwa-alta-y-ficha/test/`](tareas/04-pwa-alta-y-ficha/test/).

## Próximo paso

Ninguno pendiente de código. Si en algún momento se carga un perfume
real del cliente, confirmar una vez más a simple vista en producción
(mismo criterio de siempre: la automatización reduce pero no
reemplaza la mirada real sobre el caso real).
