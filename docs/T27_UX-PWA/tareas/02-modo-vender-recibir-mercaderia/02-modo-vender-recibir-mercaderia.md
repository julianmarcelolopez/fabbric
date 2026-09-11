# Fase 2 — Toggle de modo "Vender" / "Recibir mercadería"

**Estado:** ✅ Hecha — verificada con Playwright (14/14 PASS, `pwa/t27-02-modo-vender-recibir.mjs`).

**Depende de:** nada técnicamente (es estado nuevo, no requiere los tokens de la Fase 3), pero es un cambio de interacción real — revisar el punto "A confirmar antes de implementar" abajo antes de empezar.

## Objetivo (según `plan.md`, Fase B / Hallazgo 2.2 de `analisis.md`)

Hoy la Ficha de producto muestra siempre las dos acciones juntas ("Registrar entrada" y "Agregar a la venta"), y escanear un código inexistente siempre lleva a Alta. El mockup v5 agrega un selector de modo en Escanear que cambia ese comportamiento: en modo "Vender", un código no encontrado no lleva a Alta (se avisa con un banner); en modo "Recibir mercadería", sí. Y en la Ficha, solo se ve la acción relevante al modo activo, no las dos juntas.

Esto es más que estilo — cambia una parte real del circuito descrito en `docs/T23-App_ingreso_egreso_productos/overview.md` (punto 4 de "Pantallas/flujo"). No toca ningún endpoint ni tabla: el modo vive enteramente en el estado de la PWA, igual que el carrito.

## Pasos

- [x] Estado nuevo en `pwa/src/App.tsx`: `const [modo, setModo] = useState<"venta" | "entrada">("venta")` — mismo nivel que `cart`/`medioPago`, no se persiste ni se manda al backend.
- [x] `EscanearScreen.tsx` suma el segmented control "Vender" / "Recibir mercadería", recibido como prop `modo`/`onModoChange` desde `App.tsx`.
- [x] El título de Escanear cambia según el modo: "Escanear para vender" / "Escanear para recibir mercadería".
- [x] Ramificado `EscanearScreen.handleCode()` según el modo:
  - Modo "Recibir mercadería": 404 → sigue yendo a Alta, sin cambios.
  - Modo "Vender": 404 → **no** navega a Alta. Banner de advertencia in-place ("Código no encontrado. Cambiá a 'Recibir mercadería' para darlo de alta."), se queda en Escanear, con auto-ocultado a los ~2.2s (timeout limpiado en un `useEffect` de cleanup).
  - 200 (encontrado): en ambos modos va a Ficha igual que antes.
- [x] `FichaScreen.tsx` recibe prop `modo` y muestra una sola acción según corresponda: modo "entrada" → bloque de cantidad + "Registrar entrada" visible, "Agregar a la venta" oculto; modo "vender" → al revés (sin qty stepper, no aplica a esa acción).
- [x] Tag visible arriba a la derecha de la Ficha con el modo activo ("Modo: Vender" / "Modo: Recibir mercadería").
- [x] Los endpoints que dispara cada acción no cambiaron — el modo solo decide qué botón se muestra y a dónde navega un 404.
- [x] El Carrito/Confirmar venta no depende del modo — no se tocó ese código en esta fase.

## A confirmar antes de implementar

`docs/T23-App_ingreso_egreso_productos/overview.md` (punto 4 de "Pantallas/flujo") describe hoy la Ficha con las dos acciones siempre disponibles, sin concepto de modo. Si se implementa esta fase, hay que actualizar esa sección de `overview.md` para que documente el modo como parte del circuito real — es un cambio a la documentación de T23, no a su lógica de negocio ni a sus endpoints.

**Resuelto:** se actualizaron los puntos 2 ("Escanear") y 4 ("Ficha de producto") de `overview.md` para documentar el modo y su efecto en el ruteo del 404 y en qué acción se muestra — sin tocar ninguna mención a los endpoints existentes.

## Definition of Done

- [x] El toggle "Vender" / "Recibir mercadería" existe en Escanear y determina el título de la pantalla.
- [x] En modo "Vender", un código no encontrado muestra el banner y no navega a Alta.
- [x] En modo "Recibir mercadería", un código no encontrado navega a Alta, igual que antes.
- [x] La Ficha muestra una sola acción (no las dos juntas) según el modo activo, con el tag de modo visible.
- [x] `overview.md` actualizado para reflejar el modo en el circuito documentado.
- [x] Probado en ambos modos con Playwright (`pwa/t27-02-modo-vender-recibir.mjs`, org descartable), incluyendo el caso de código inexistente en modo "Vender".

## Cómo se verificó

**Playwright** (`pwa/t27-02-modo-vender-recibir.mjs`, viewport 390×844, org/usuario descartables — no toca datos de Eliathi, limpia todo al final): login → confirma que arranca en modo Vender con el título correcto → busca un código inexistente en modo Vender → confirma el banner y que **no** navega a Alta → cambia a modo Recibir mercadería → busca el mismo código inexistente → confirma que ahora **sí** navega a Alta → vuelve a Escanear → busca un código existente en modo Recibir mercadería → confirma el tag "Modo: Recibir mercadería" y que solo se ve "Registrar entrada" (no "Agregar a la venta") → vuelve a Escanear, cambia a modo Vender → busca el mismo código existente → confirma el tag "Modo: Vender" y que solo se ve "Agregar a la venta" (no "Registrar entrada"). **14/14 PASS.**

## Dependencias

- **La bloquean:** nada técnicamente — puede implementarse en paralelo con la Fase 1, aunque conviene después de esa fase por tocar `FichaScreen.tsx`.
- **Bloquea:** nada de la Fase 3 (identidad visual), pero conviene tenerla resuelta antes para no aplicar tokens sobre una versión de `FichaScreen.tsx`/`EscanearScreen.tsx` que todavía va a cambiar de estructura.
