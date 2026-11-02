# Tarea 3 — Frontend: detección de host + helper de links

**Estado:** ✅ Hecha. `tsc --noEmit` y `vite build` limpios; los ~52 call
sites se redujeron a 2 intencionales (`AdminLayout.tsx` y `MyStorePage.tsx`,
que siguen apuntando siempre a la URL canónica `/store/<slug>` a
propósito). Falta la verificación visual en navegador con el dominio
propio real (requiere el dominio ya resuelto por DNS/EasyPanel o editar
el `hosts` local — ver Tarea 4).

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T38/Fase 3)

Que entrar a un dominio propio muestre la tienda directamente en `/`, con
todas sus rutas internas sin el prefijo `/store/<slug>`, sin romper el
modo existente (`/store/<slug>` bajo el dominio principal).

## Alcance

- Dominio principal de la plataforma configurable por env var (ej.
  `VITE_PLATFORM_HOST`, default `fabbric.aivance.cloud`).
- Lógica de arranque (antes o junto a `router.tsx`): si
  `window.location.hostname` no es el dominio principal, llamar a
  `GET /public/stores/by-domain?host=...` (Tarea 1); si matchea, montar
  las rutas de la tienda en `/`; si no matchea, mostrar una página de
  error clara ("este dominio no está configurado").
- El redirect hardcodeado `<Navigate to="/store/eliathi-modas" />`
  (`router.tsx:32`) pasa a ser condicional — solo corre en el dominio
  principal.
- `StoreLayout.tsx:173` (hoy `const { slug } = useParams()`) deja de
  asumir que el slug siempre viene de la URL — lo toma del modo resuelto
  al arrancar (dominio propio) o del param de siempre (dominio principal),
  sin duplicar el resto de la lógica de `StoreLayout`.
- Nuevo helper único (ej. `frontend/src/lib/storeLinks.ts`) que arma cada
  link de la tienda según el modo activo (con `/store/<slug>` en el
  dominio principal, sin prefijo en un dominio propio). Reemplaza los ~52
  call sites hardcodeados listados en `analisis.md`, en estos 15 archivos:
  `StoreLayout.tsx`, `CatalogHomePage.tsx`, `CategoriesIndexPage.tsx`,
  `CategoryPage.tsx`, `StoreProductPage.tsx`, `CheckoutResultPage.tsx`,
  `OrderDetailPage.tsx`, `MyOrdersPage.tsx`, `CheckoutPage.tsx`,
  `SearchBar.tsx`, `CartDrawer.tsx`, `HomeSectionsRenderer.tsx`,
  `AdminLayout.tsx`, `MyStorePage.tsx`, `router.tsx`.
- `AdminLayout.tsx` (link "Ver tienda") y `MyStorePage.tsx` (URL pública
  mostrada/copiada) deben seguir señalando SIEMPRE a
  `fabbric.aivance.cloud/store/<slug>` (la URL "canónica" del admin), no al
  dominio propio — a definir si además se muestra el dominio propio como
  dato informativo ahí (no bloqueante para cerrar la tarea).

## Criterio de aceptación

- `tsc --noEmit` limpio en `frontend/`.
- `fabbric.aivance.cloud/store/eliathi-modas` sigue funcionando
  exactamente igual que hoy (cero regresión).
- Simulando el dominio propio localmente (ver Tarea 4), la tienda carga en
  `/`, y cada link interno (categorías, producto, checkout, portal de
  pedidos, compartir) respeta el modo activo sin mezclar prefijos.
- Un host no registrado muestra la página de error, no una pantalla rota.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 4.
