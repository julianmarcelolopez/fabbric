# T27 — Análisis: PWA actual vs. mockup v5

Alcance de este análisis: **capa visual/interacción**. El modelo de datos, los endpoints (`by-barcode`, `venta-local`, `stock-movements`, `alta-rapida`, etc.) y la lógica de negocio de `docs/T23-App_ingreso_egreso_productos/overview.md` no se tocan ni se cuestionan acá, salvo un punto puntual señalado al final (campo "Cantidad recibida") que sí roza el backend y se deja marcado como pendiente de decisión, no como parte del alcance visual.

Comparación de referencia: código real en `pwa/src/` vs. `docs/T27_UX-PWA/mockups/mockups_v5.html`.

**Por qué v5 y no v3:** v5 reemplaza la paleta terracota + Playfair Display inventada de v3 por la identidad **real** ya usada en la tienda online (`frontend/src/features/catalog/catalog.css`): navy `#1E2A4A` + coral `#FF6B4A` (el mismo acento que la PWA ya usa hoy), `Cormorant Garamond` para títulos, `DM Sans` para texto, y suma `Alex Brush` para el logotipo tipo firma ("Eliathi") que la tienda ya usa en su hero. Además, v5 agrega un elemento de interacción que v3 no tenía: un **toggle de modo "Vender" / "Recibir mercadería"** en la pantalla de Escanear — se incorpora al alcance de este análisis y del plan porque cambia una parte real del circuito, no solo el estilo (decisión tomada explícitamente para este documento, ver Hallazgo 2).

---

## Hallazgo 1 — Sin confirmación visible al "Registrar entrada" y "Agregar a la venta"

Sin cambios respecto al análisis de v3 en cuanto al problema — v5 resuelve el mismo hallazgo con la misma estructura de pantallas, solo que con la paleta e íconos nuevos y textos ajustados al modo.

**Hoy (`pwa/`):** ambas acciones ejecutan y vuelven directo a Escanear, sin ningún estado intermedio.

- [FichaScreen.tsx:19-33](../../pwa/src/screens/FichaScreen.tsx#L19-L33) — `handleEntrada()` hace el `await apiJson(...)` y, si sale bien, llama a `onDone()` en la misma línea (línea 27), que es `backToEscanear` ([App.tsx:112](../../pwa/src/App.tsx#L112)). No hay paso intermedio.
- [App.tsx:43-66](../../pwa/src/App.tsx#L43-L66) — `addToCart()` actualiza el carrito y en la línea 66 hace `setScreen({ kind: "escanear" })` sin mostrar nada. La única señal es el badge numérico de la bottom nav ([BottomNav.tsx:40-59](../../pwa/src/BottomNav.tsx#L40-L59)).

**Mockup v5:** mismas dos pantallas de confirmación de pantalla completa que v3, con la paleta nueva y textos que ahora dependen del modo activo (ver Hallazgo 2):

- `data-screen="entrada-ok"` ([mockups_v5.html:146-155](mockups/mockups_v5.html#L146-L155)) — círculo verde con check, "Entrada registrada", detalle "+1 unidad · Stock ahora: 3", botón **"Seguir recibiendo"** (antes "Seguir escaneando" en v3 — el texto ahora refleja la acción específica, no un genérico).
- `data-screen="venta-agregada-ok"` ([mockups_v5.html:157-167](mockups/mockups_v5.html#L157-L167)) — círculo coral con ícono de bolsa, "Agregado al carrito", botón **"Seguir vendiendo"** + link "Ir al carrito".
- `showConfirm()` ([mockups_v5.html:235-238](mockups/mockups_v5.html#L235-L238)) mantiene el mismo patrón: muestra la confirmación y a los ~1.9s vuelve sola a Escanear.

**Distancia:** igual que en el análisis de v3 — faltan los dos estados de pantalla en `pwa/src/screens/`. El copy específico por acción ("Seguir recibiendo" / "Seguir vendiendo" en vez de un genérico "Seguir escaneando") es un detalle nuevo de v5 a adoptar, no depende de que exista el toggle de modo.

---

## Hallazgo 2 — Desbalance de peso visual entre "Registrar entrada" y "Agregar a la venta" (y el toggle de modo que lo resuelve distinto en v5)

En v3, ambos botones convivían siempre en la Ficha y el desbalance se resolvía dándole al botón secundario una variante "soft" del mismo acento. **v5 resuelve el mismo problema de otra forma, con un cambio de interacción real:**

### 2.1 — Dos colores sólidos por rol, no un acento fuerte + uno débil

En [mockups_v5.html:133-143](mockups/mockups_v5.html#L133-L143):

- "Registrar entrada" ([línea 140](mockups/mockups_v5.html#L140)): `background: var(--b-navy)` sólido, texto blanco, ícono de camión (`ti-truck-delivery`) — navy es el color que la tienda real usa para navegación/estructura, no para llamar a la venta.
- "Agregar a la venta" ([línea 143](mockups/mockups_v5.html#L143)): `background: var(--b-accent)` (coral) sólido, texto blanco, ícono de bolsa.

Los dos son botones sólidos, mismo padding, mismo peso tipográfico — la diferencia es de **color por rol** (navy = operación interna de stock, coral = acción de venta), no de intensidad. Esto ya es distinto de la solución "soft vs. sólido" que proponía v3, y hay que decidir con cuál de las dos quedarse en la Fase A del plan (ver `plan.md`).

### 2.2 — Las dos acciones ya no conviven siempre: dependen del modo

Esto es lo nuevo y lo que más se aleja del circuito actual. v5 agrega un selector en la pantalla de Escanear:

- Toggle "Vender" / "Recibir mercadería" ([mockups_v5.html:64-67](mockups/mockups_v5.html#L64-L67)), estado global de la sesión de escaneo (`currentMode`, [mockups_v5.html:222](mockups/mockups_v5.html#L222)).
- El título de Escanear cambia según el modo (`setMode()`, [mockups_v5.html:240-248](mockups/mockups_v5.html#L240-L248)): "Escanear para vender" / "Escanear para recibir mercadería".
- En la Ficha, `openFicha()` ([mockups_v5.html:250-259](mockups/mockups_v5.html#L250-L259)) muestra **una sola acción según el modo activo**: si el modo es "entrada", se ve el bloque de cantidad + "Registrar entrada" y se oculta "Agregar a la venta"; si el modo es "vender", es al revés. Un tag visible arriba ("Modo: Vender" / "Modo: Recibir mercadería", [línea 118](mockups/mockups_v5.html#L118)) contextualiza cuál es.
- En modo "Vender", escanear un código que no existe **ya no lleva a Alta**: muestra un banner de advertencia ("Código no encontrado. Cambiá a 'Recibir mercadería' para darlo de alta.", [mockups_v5.html:42-44](mockups/mockups_v5.html#L42-L44) y handler en [líneas 291-299](mockups/mockups_v5.html#L291-L299)) y se queda en Escanear. En modo "Recibir mercadería", el mismo código inexistente sí lleva a Alta, igual que hoy.

**Contra `overview.md` (punto 4 de "Pantallas/flujo"):** hoy el documento de referencia dice "Dos acciones, ambas vuelven a Escanear al ejecutarse" — asume que las dos conviven siempre en la Ficha, sin concepto de modo. v5 introduce ese concepto nuevo. **Esto se incorpora al alcance del plan como su propia fase (Fase B), separada de los quick wins de paleta**, porque es un cambio de interacción real (qué acción está disponible y cuándo se puede dar de alta un producto), aunque no toca ningún endpoint ni tabla — el modo vive enteramente en el estado de la PWA (front-end), igual que hoy vive el carrito.

**Distancia:** hoy no existe ningún estado de "modo" en `pwa/` (ni en `App.tsx` ni en `EscanearScreen.tsx`/`FichaScreen.tsx`) — es un estado y una rama de UI completamente nuevos, no una variación de estilos sobre algo que ya existe.

### 2.3 — Detalle fuera de alcance visual: campo "Cantidad recibida" en Alta

El formulario de Alta de v5 suma un input nuevo, "Cantidad recibida" (valor por defecto `1`, [mockups_v5.html:104](mockups/mockups_v5.html#L104)), que no existe en [AltaScreen.tsx](../../pwa/src/screens/AltaScreen.tsx) (los campos hoy son marca, modelo, categoría, talle, color, precio — sin cantidad). Se marca como **fuera del alcance visual** porque el backend real (`POST /admin/products/alta-rapida`, [backend/src/modules/products/routes.ts:155-180](../../backend/src/modules/products/routes.ts#L155-L180)) fija `stockLocal: 1` de forma hardcodeada en la transacción — no acepta ninguna cantidad inicial. Agregar el campo a la UI sin tocar el backend dejaría un input que el vendedor completa pero que no hace nada (o peor: sugiere que cargó 5 unidades cuando el sistema solo registró 1). **No se incluye en el plan de esta tarea** — queda anotado para una decisión de producto/backend aparte, no para T27.

---

## Hallazgo 3 — Colores y tipografía inconsistentes

Sigue siendo el hallazgo más grande en superficie, pero ahora la comparación es contra la identidad **real** de la tienda, no una inventada.

**Hoy (`pwa/`):** sin cambios respecto al análisis anterior —

- 8 grises/neutros distintos sin relación declarada entre sí (`#888780`, `#5f5e5a`, `#201f1c`, `#eeece6`, `#F7F3EC`, `#cac7ba`, `#e2e0d8`, `#fff`), repartidos sin un archivo de tokens (`grep` no encuentra `colors.ts`/`theme.ts` en `pwa/src/`).
- **Tipografía:** solo [LoginScreen.tsx:34](../../pwa/src/LoginScreen.tsx#L34) fija `fontFamily: "system-ui, sans-serif"`; las otras 6 pantallas (`EscanearScreen`, `FichaScreen`, `AltaScreen`, `CarritoScreen`, `ConfirmarScreen`, `BottomNav`, el layout de `App.tsx`) no fijan ninguna fuente, y [pwa/index.html](../../pwa/index.html) no importa ningún CSS ni tiene un `<style>` — sin reset, esas pantallas dependen del serif por defecto del navegador.
- Acento único (`#FF6B4A`) sin variante suave ni un segundo color de marca (navy) para diferenciar acciones internas de acciones de venta.
- Radios casi todos en `8px` (19 ocurrencias), estética de esquinas apenas redondeadas.

**Mockup v5, calcado 1:1 de la identidad real de la tienda ([mockups_v5.html:9-15](mockups/mockups_v5.html#L9-L15)):**

```css
--b-navy:#1E2A4A; --b-accent:#FF6B4A; --b-accent-soft:#FDE1D8; --b-off:#F8F7F5; --b-white:#FFFFFF;
--b-gray:#E8E4DF; --b-text:#2C2C2C; --b-muted:#8A8278;
--b-green:#16A34A; --b-green-bg:#F0FDF4;
--b-warning:#B8792F; --b-warning-bg:#F6E9D3;
--b-danger:#DC2626; --b-danger-bg:#FEE2E2;
```

Estos tokens **no son una paleta nueva inventada para la PWA** — coinciden con los que ya existen en `frontend/src/features/catalog/catalog.css:14-29` (`--navy`, `--tenant-primary` = `#FF6B4A` de Eliathi, `--gray`, `--muted`, `--green`/`--green-bg`), con nombres de variable distintos pero los mismos valores. Adoptarlos en la PWA acerca la app de stock a la identidad real del negocio, no a una estética paralela.

Tipografía dual, igual que en la tienda real (`frontend/index.html:16`):

- `body { font-family: "DM Sans", system-ui, sans-serif; }` ([mockups_v5.html:17](mockups/mockups_v5.html#L17)) — texto general.
- `.e-display { font-family: "Cormorant Garamond", Georgia, serif; }` ([mockups_v5.html:18](mockups/mockups_v5.html#L18)) — títulos, nombre de producto, montos (mismo rol que `--tenant-font-display` en `catalog.css:17`).
- `.e-script { font-family: "Alex Brush", cursive; }` ([mockups_v5.html:19](mockups/mockups_v5.html#L19)) — **nuevo respecto a v3**: el logotipo "Eliathi" como firma cursiva, usado en el login ([mockups_v5.html:48](mockups/mockups_v5.html#L48)) y en el header de Escanear ([línea 60](mockups/mockups_v5.html#L60)). Es el mismo tratamiento que la tienda real le da al nombre de marca (Google Fonts carga `Alex+Brush` también en `frontend/index.html:16`).

**Login rediseñado como el hero de la tienda:** en v3 el login era un formulario neutro sobre fondo crema; en v5 ([mockups_v5.html:46-56](mockups/mockups_v5.html#L46-L56)) es fondo navy de borde a borde, con el logotipo en Alex Brush en blanco — calcado del tratamiento de marca que ya usa `StoreLayout.tsx`, no un estilo nuevo para la PWA.

**Radios:** v5 usa `8px` en casi todos los inputs/botones/tarjetas (ver por ejemplo [mockups_v5.html:51-53](mockups/mockups_v5.html#L51-L53), [96-104](mockups/mockups_v5.html#L96-L104)) — **no** son "pill" (999px) como en v3. Esto es una buena noticia para la distancia de implementación: el radio de 8px que ya usa casi toda la PWA hoy queda validado, no hace falta migrar a un estilo de píldora.

**Nav:** [BottomNav.tsx:36](../../pwa/src/BottomNav.tsx#L36) ya fija colores explícitos (no son colores de link de navegador sin estilar); el mockup v5 lleva el fondo de la barra a navy sólido ([mockups_v5.html:199](mockups/mockups_v5.html#L199)) con el ítem activo en coral y el inactivo en blanco semitransparente — más alineado a la paleta de marca que el fondo blanco/gris actual.

**Distancia:** sigue faltando la capa de tokens en sí — pero ahora los valores a extraer son exactamente los que ya vive `frontend/src/features/catalog/catalog.css`, así que además de crear el archivo de tokens (Fase C del plan), conviene decidir si se referencian los mismos valores que usa `frontend/` o se duplican en `pwa/` con nombres propios (ver `plan.md`).

---

## Resumen de brecha por hallazgo

| Hallazgo | Tipo de brecha | Esfuerzo relativo |
|---|---|---|
| 1. Sin confirmación de acción | Faltan 2 estados de pantalla completos | Medio (nuevo componente + espera real al backend) |
| 2.1 Desbalance de peso visual | Definir 2 colores sólidos por rol (navy/coral) en vez de sólido/soft | Bajo (quick win) |
| 2.2 Toggle de modo Vender/Recibir | Estado nuevo + ramas de UI en Escanear y Ficha | Alto (cambio de interacción real, fase propia) |
| 2.3 Campo "Cantidad recibida" | Requiere cambio de backend — fuera de este plan | N/A (no incluido) |
| 3. Colores/tipografía inconsistentes | Falta capa de tokens; migrar ~7 archivos | Alto (toca toda la app) |

Ver `docs/T27_UX-PWA/plan.md` para el orden de implementación propuesto.
