# Fase 1 — Quick wins: confirmación visible y balance de los dos botones de la Ficha

**Estado:** ✅ Hecha — verificada con Playwright (13/13 PASS, `pwa/t27-01-confirmaciones.mjs`) y visto bueno del usuario en `localhost:5174`.

**Depende de:** nada — es la primera fase, no requiere el toggle de modo (Fase 2) ni los tokens de color (Fase 3).

## Objetivo (según `plan.md`, Fase A)

Resolver los Hallazgos 1 y 2.1 de `analisis.md`: hoy "Registrar entrada" y "Agregar a la venta" ejecutan sin ninguna confirmación visible, y el segundo botón se ve como la única acción importante de la pantalla por su color, aunque las dos son igual de frecuentes.

No depende de que exista el archivo de tokens de la Fase 3 — los colores nuevos (navy `#1E2A4A` / coral `#FF6B4A`) se pueden hardcodear acá y migrar al token cuando exista, sin bloquear este quick win.

## Pasos

### 1. Pantallas de confirmación de pantalla completa

- [x] Agregar dos variantes nuevas al union type `Screen` de [pwa/src/App.tsx:18-23](../../../../pwa/src/App.tsx#L18-L23): `{ kind: "entrada-ok"; qty: number; stockNuevo: number }` y `{ kind: "venta-agregada-ok"; nombre: string; countCarrito: number }`.
- [x] Crear `pwa/src/screens/EntradaOkScreen.tsx` y `pwa/src/screens/VentaAgregadaOkScreen.tsx`, calcados de [mockups_v5.html:146-167](../../mockups/mockups_v5.html#L146-L167): ícono en círculo, título, detalle de una línea, botón de cierre.
- [x] Copy específico por acción, no genérico: "Seguir recibiendo" (entrada) / "Seguir vendiendo" (venta) + link "Ir al carrito" en la de venta.
- [x] `FichaScreen.handleEntrada()` ([pwa/src/screens/FichaScreen.tsx:19-33](../../../../pwa/src/screens/FichaScreen.tsx#L19-L33)): tras el `await` exitoso, navegar a `entrada-ok` en vez de llamar a `onDone()` directo. Mantiene el `submitting` existente como estado de "procesando" antes de la confirmación. **Mejora sobre lo planeado**: en vez de recalcular el stock nuevo a mano (`variant.stockLocal + qty`), se usa el `variant.stockLocal` que el propio endpoint `POST /admin/variants/:id/stock-movements` ya devuelve en la respuesta (`{ movement, variant }`) — fuente de verdad real, no un cálculo optimista del cliente.
- [x] `App.addToCart()` ([pwa/src/App.tsx:43-66](../../../../pwa/src/App.tsx#L43-L66)): en vez de `setScreen({ kind: "escanear" })` directo, navega a `venta-agregada-ok`. Al ser local/síncrono, la confirmación se muestra al instante, sin estado de carga.
- [x] Auto-avance: `setTimeout` a los ~1.9s que vuelve a Escanear solo, con cleanup en el `useEffect` — sin sacar el botón manual.
- [x] Si `handleEntrada()` falla, se queda en la Ficha con el error existente — no se tocó ese camino.

### 2. Balance visual entre los dos botones de acción

- [x] En [FichaScreen.tsx](../../../../pwa/src/screens/FichaScreen.tsx), "Registrar entrada" pasa de `background: "#eeece6"` (gris neutro) a navy sólido (`#1E2A4A`) + texto blanco. **Sin ícono** (decisión de alcance: no se agregó ninguna librería de íconos para este quick win — texto plano, consistente con el resto de la app hoy).
- [x] "Agregar a la venta" se mantiene coral sólido (`#FF6B4A`) + texto blanco, mismo criterio (sin ícono).
- [x] `minHeight: 44` fijado explícitamente en ambos botones (no se dejó al padding solo).

## Hallazgo durante la verificación: emoji roto en la confirmación de venta

El ícono de bolsa de `VentaAgregadaOkScreen.tsx` se armó primero con el emoji "🛍" — al verificar con Playwright (ver más abajo) y revisar la captura de pantalla, el emoji renderizaba roto/parcial en vez de mostrar una bolsa reconocible (dependencia de la fuente de emoji del navegador/dispositivo, poco confiable para un punto de venta real). Se reemplazó por un ícono SVG inline (sin agregar ninguna librería), con `stroke="currentColor"` heredando el color coral del contenedor — renderizado consistente en cualquier navegador.

## Cómo se verificó

**Playwright** (`pwa/t27-01-confirmaciones.mjs`, viewport de celular real 390×844, mismo patrón de organización/usuario descartables que `t25-04-carrito-factura.mjs` — no toca datos de Eliathi, limpia todo al final): login → escaneo manual de un código de prueba → Ficha → verifica colores exactos (`getComputedStyle`) y alto (`boundingBox`) de los dos botones → Registrar entrada → confirma el texto y que el stock mostrado coincide con `product_variants.stock_local` real en la base → "Seguir recibiendo" vuelve a Escanear → escanea de nuevo → Agregar a la venta → confirma la aparición instantánea de "Agregado al carrito" con el nombre y conteo correctos → "Ir al carrito" navega al Carrito con el ítem. **13/13 PASS** (dos corridas: antes y después del fix del ícono).

Complementado con revisión visual de las capturas (`t27-01-*.png`, no versionadas) y visto bueno del usuario probando la app real en `localhost:5174`.

## Definition of Done

- [x] "Registrar entrada" y "Agregar a la venta" muestran una confirmación de pantalla completa antes de volver a Escanear, con el copy específico de cada acción.
- [x] La confirmación de "Registrar entrada" espera la respuesta real del backend (se ve "Registrando..." antes); la de "Agregar a la venta" es instantánea.
- [x] Los dos botones de la Ficha son ambos sólidos (navy / coral), mismo tamaño y peso tipográfico — ninguno gris neutro.
- [x] Ambos botones miden ≥44px de alto — confirmado por `boundingBox()` en Playwright (viewport 390×844).
- [x] Probado el circuito completo: automatizado con Playwright + verificación manual del usuario en `localhost:5174` vía `docker compose up -d pwa`.

## Dependencias

- **La bloquean:** nada.
- **Bloquea:** nada estrictamente, pero conviene completarla antes de la Fase 3 (identidad visual) porque toca los mismos archivos (`FichaScreen.tsx`) — hacerlo en este orden evita resolver conflictos de estilo dos veces.

## Actualización posterior: el script de verificación quedó desactualizado por la Fase 2

Al correr una regresión completa de todos los scripts de T27 tras terminar la Fase 3, `pwa/t27-01-confirmaciones.mjs` falló: asumía que "Registrar entrada" y "Agregar a la venta" estaban siempre visibles juntos en la Ficha, supuesto que la Fase 2 (toggle de modo) cambió — ahora cada botón solo se ve en su modo correspondiente. No es una regresión de la app: se actualizó el script para elegir el modo correcto antes de buscar cada botón. Vuelve a pasar **13/13**.
