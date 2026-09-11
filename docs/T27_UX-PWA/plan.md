# T27 — Plan de implementación: PWA visual/interacción (mockup v5)

Basado en `docs/T27_UX-PWA/analisis.md` (actualizado a `mockups_v5.html`). Alcance: capa visual/interacción, más el toggle de modo Vender/Recibir mercadería que suma v5 (decisión explícita: es un cambio de interacción real, no solo estilo, ver Hallazgo 2.2 del análisis — se documenta como fase propia para revisar aparte). **No** se incluye el campo "Cantidad recibida" de Alta (Hallazgo 2.3) ni ningún cambio de modelo de datos, endpoints o lógica de negocio de `docs/T23-App_ingreso_egreso_productos/overview.md`.

Este documento es el plan a revisar antes de tocar código — no se implementa nada todavía.

---

## Fase A — Quick wins (Hallazgos 1 y 2.1)

### A.1 — Pantallas de confirmación de pantalla completa

Nuevos estados en el union type `Screen` de [App.tsx:18-23](../../pwa/src/App.tsx#L18-L23):

- `{ kind: "entrada-ok"; qty: number; stockNuevo: number }` — se llega desde `FichaScreen.handleEntrada()` tras el `await` exitoso, en vez de `onDone()` directo.
- `{ kind: "venta-agregada-ok"; nombre: string; countCarrito: number }` — se llega desde `App.addToCart()`, en vez de `setScreen({ kind: "escanear" })` directo.

Componentes nuevos (`EntradaOkScreen.tsx`, `VentaAgregadaOkScreen.tsx` en `pwa/src/screens/`) calcados de [mockups_v5.html:146-167](mockups/mockups_v5.html#L146-L167): ícono en círculo, título, detalle de una línea, botón de cierre con **copy específico por acción** ("Seguir recibiendo" / "Seguir vendiendo" — no un genérico "Seguir escaneando"), y en venta el link secundario "Ir al carrito".

**Auto-avance vs. acción manual:** igual que en el mockup (`showConfirm`, [mockups_v5.html:235-238](mockups/mockups_v5.html#L235-L238)) — auto-avance por `setTimeout` a los ~1.9s, sin sacar el botón manual para quien quiera seguir antes.

**Estado de carga real (no está en el mockup, hace falta en la app):**

- `handleEntrada()` ya tiene `submitting` ([FichaScreen.tsx:16](../../pwa/src/screens/FichaScreen.tsx#L16)) — mantenerlo tal cual (deshabilita cantidad y botón, texto "Registrando...") y recién al resolver el `await` pasar a `entrada-ok`. No mostrar la confirmación antes de tener la respuesta real del backend.
- `addToCart()` es local/síncrono (no pega al backend — overview.md punto 4: "estado local de la app, no se persiste hasta confirmar"), así que la confirmación puede ser instantánea, sin estado de carga.
- Si `handleEntrada()` falla, se queda en la Ficha con el error existente ([FichaScreen.tsx:28-30](../../pwa/src/screens/FichaScreen.tsx#L28-L30)) — no se toca ese camino.

### A.2 — Dos colores sólidos por rol en vez de sólido/gris

En [FichaScreen.tsx:115-147](../../pwa/src/screens/FichaScreen.tsx#L115-L147), calcado de [mockups_v5.html:133-143](mockups/mockups_v5.html#L133-L143):

- "Registrar entrada": pasa de `background: "#eeece6"` (gris neutro) a **navy sólido** (`--b-navy` / `#1E2A4A`) + texto blanco + ícono de camión.
- "Agregar a la venta": se mantiene **coral sólido** (`--b-accent` / el mismo `#FF6B4A` que ya usa la app hoy) + texto blanco + ícono de bolsa.

A diferencia del quick win pensado sobre v3 (variante "soft" del acento), acá no hace falta inventar un tono derivado — navy ya es un color de marca real (`--navy` en `frontend/src/features/catalog/catalog.css:20`), así que este quick win no depende de que exista todavía el archivo de tokens de la Fase C: se puede hardcodear `#1E2A4A` temporalmente y migrarlo al token cuando exista, sin bloquear A.1/A.2 esperando a la Fase C.

**Verificación de tamaño de toque (44px mínimo):** el mockup usa `padding: 12px` + `font-size: 14px` en ambos botones ([mockups_v5.html:140](mockups/mockups_v5.html#L140), [143](mockups/mockups_v5.html#L143)) — es CSS de maqueta, no una medición real. Al implementar:

- Medir la altura final renderizada en un dispositivo real (o DevTools) y confirmar ≥44px, no asumir que el padding del mockup alcanza.
- Si no llega, fijar `min-height: 44px` explícito en vez de subir el padding a ciegas.
- Este criterio aplica a todos los botones de acción que se toquen en las fases B y C también — queda en el checklist general al final.

---

## Fase B — Toggle de modo "Vender" / "Recibir mercadería" (Hallazgo 2.2)

Cambio de interacción real, separado a propósito de los quick wins de paleta — se revisa aparte antes de tocar código.

### B.1 — Estado de modo

Nuevo estado en `App.tsx`, ej. `const [modo, setModo] = useState<"venta" | "entrada">("venta")`. Vive en el mismo nivel que `cart`/`medioPago` — es estado de sesión de la PWA, no se persiste ni se manda al backend.

### B.2 — Selector en Escanear

`EscanearScreen.tsx` suma el segmented control de [mockups_v5.html:64-67](mockups/mockups_v5.html#L64-L67) ("Vender" / "Recibir mercadería"), recibido como prop `modo`/`onModoChange` desde `App.tsx`. El título de la pantalla cambia según el modo (calcado de `setMode()`, [mockups_v5.html:240-248](mockups/mockups_v5.html#L240-L248)): "Escanear para vender" / "Escanear para recibir mercadería".

### B.3 — Ramificar el resultado de by-barcode según el modo

Hoy `EscanearScreen.handleCode()` ([EscanearScreen.tsx:32-45](../../pwa/src/screens/EscanearScreen.tsx#L32-L45)) siempre hace lo mismo ante un 404: llama a `onNotFound(code)` → Alta. Con el modo:

- **Modo "Recibir mercadería":** código no encontrado → sigue yendo a Alta, sin cambios.
- **Modo "Vender":** código no encontrado → **no** navega a Alta. Muestra un banner de advertencia in-place (calcado de [mockups_v5.html:42-44](mockups/mockups_v5.html#L42-L44), texto "Código no encontrado. Cambiá a 'Recibir mercadería' para darlo de alta.") y se queda en Escanear, igual que el handler de [mockups_v5.html:291-299](mockups/mockups_v5.html#L291-L299).
- Código encontrado (200): en ambos modos va a Ficha igual que hoy — lo único que cambia ahí es qué acción se muestra (B.4).

### B.4 — Ficha muestra una sola acción según el modo

En `FichaScreen.tsx`, agregar prop `modo` y renderizar condicionalmente (calcado de `openFicha()`, [mockups_v5.html:250-259](mockups/mockups_v5.html#L250-L259)):

- Modo "entrada": se ve el bloque de cantidad + "Registrar entrada" ([mockups_v5.html:133-141](mockups/mockups_v5.html#L133-L141)); se oculta "Agregar a la venta".
- Modo "vender": al revés.
- Tag visible arriba de la Ficha indicando el modo activo ("Modo: Vender" / "Modo: Recibir mercadería", [mockups_v5.html:118](mockups/mockups_v5.html#L118)), para que quede claro por qué solo se ve una acción.

### B.5 — Qué NO cambia en esta fase

- Los endpoints que dispara cada acción (`stock-movements`, el `addToCart` local) siguen siendo exactamente los mismos — el modo solo decide qué botón mostrar y a dónde navega un 404, no qué hace cada botón al tocarlo.
- El circuito de Carrito/Confirmar venta no depende del modo — una vez que algo está en el carrito, se vende igual sin importar en qué modo se agregó.

### B.6 — Punto a confirmar antes de implementar

`overview.md` (punto 4 de "Pantallas/flujo") describe hoy la Ficha con las dos acciones siempre disponibles, sin concepto de modo. Si se implementa la Fase B, conviene actualizar esa sección de `overview.md` para que documente el modo como parte del circuito real — señalado acá para no dejarlo desactualizado, pero es un cambio a `overview.md`, no a la lógica de negocio ni a los endpoints que describe.

---

## Fase C — Identidad visual completa (Hallazgo 3)

Reemplazar paleta y tipografía en toda la app por la identidad **real** de la tienda (no una inventada) — mismos valores que `frontend/src/features/catalog/catalog.css`, calcados en `mockups_v5.html`.

### C.1 — Archivo de tokens reusable

Nuevo archivo, ej. `pwa/src/lib/theme.ts` (o `theme.css` con custom properties, a decidir según se prefiera consumir como objeto JS en los estilos inline existentes o migrar a hoja de estilos). Contenido calcado de [mockups_v5.html:9-15](mockups/mockups_v5.html#L9-L15):

```
colors: navy, accent (#FF6B4A), accentSoft, off, white, gray, text, muted,
        green, greenBg, warning, warningBg, danger, dangerBg
radii: 8px (confirmado por v5 — no hace falta migrar a "pill" como se pensaba con v3)
fonts: body (DM Sans), display (Cormorant Garamond, para títulos/nombres/montos),
       script (Alex Brush, solo para el logotipo "Eliathi")
```

**Decisión a tomar antes de escribir el archivo:** estos valores ya existen, con otros nombres de variable, en `frontend/src/features/catalog/catalog.css:14-29` (`--navy`, `--tenant-primary`, `--gray`, `--muted`, `--green`/`--green-bg`, `--font-body`, `--tenant-font-display`). `pwa/` y `frontend/` son paquetes separados sin un `packages/` compartido de estilos hoy — evaluar si conviene:
  - (a) duplicar los valores en `pwa/src/lib/theme.ts` con nombres propios (más simple, sin acoplar los dos frontends), o
  - (b) mover los tokens a un paquete compartido (ej. `packages/shared` ya existe para tipos — ver `@fabbric/shared` en `CarritoScreen.tsx:1`) para que un cambio de marca futuro (otro tenant, cambio de color) se haga en un solo lugar.

Para T27 alcanza con (a) — dejar (b) anotado para cuando haya más de un tenant usando la PWA, no bloquear esta tarea por eso.

**Por qué esto antes que tocar cada pantalla:** hay pantallas todavía sin construir (carga masiva, proveedores — ver "Diferido" en `overview.md`) que van a nacer después de este cambio. Con el archivo de tokens, nacen consistentes desde el arranque.

### C.2 — Carga de fuentes

Agregar a [pwa/index.html](../../pwa/index.html) el `<link>` de Google Fonts para `Cormorant Garamond` + `DM Sans` + `Alex Brush` (calcado de [mockups_v5.html:7](mockups/mockups_v5.html#L7), mismas familias que ya carga `frontend/index.html:16`), y fijar `font-family: "DM Sans", system-ui, sans-serif` a nivel de la app una sola vez (hoy no existe ningún reset — ver Hallazgo 3) para dejar de depender del default del navegador.

### C.3 — Migrar pantalla por pantalla

Orden sugerido (de menor a mayor superficie, revisando en el navegador entre paso y paso):

1. **`LoginScreen.tsx`** — el cambio más grande de esta fase: pasa de formulario neutro sobre fondo crema a fondo navy de borde a borde con el logotipo "Eliathi" en Alex Brush blanco (calcado de [mockups_v5.html:46-56](mockups/mockups_v5.html#L46-L56)), botón "Ingresar" en coral.
2. **`BottomNav.tsx`** — fondo navy sólido, ítem activo en coral, inactivo en blanco semitransparente (calcado de [mockups_v5.html:199-209](mockups/mockups_v5.html#L199-L209)).
3. **`EscanearScreen.tsx`, `FichaScreen.tsx`, `AltaScreen.tsx`** — reemplazar los hex sueltos por tokens; nombre de producto en `FichaScreen` a `Cormorant Garamond`; caja de cámara de Escanear a fondo navy (calcado de [mockups_v5.html:70-78](mockups/mockups_v5.html#L70-L78)).
4. **`CarritoScreen.tsx`, `ConfirmarScreen.tsx`, `EntradaOkScreen.tsx`/`VentaAgregadaOkScreen.tsx`** (Fase A) — mismo reemplazo; montos y confirmaciones a `Cormorant Garamond`.

No se rediseña la disposición de cada pantalla — el circuito general se mantiene (con el agregado de la Fase B); el cambio es de paleta, tipografía y radios (que en v5 se confirman en `8px`, sin necesidad de migrar a botones tipo píldora).

---

## Verificación

Este proyecto usa Docker Compose para correr la app (`docker compose up -d pwa` — no `npm run dev` suelto en el host). Antes de dar cada fase por terminada:

- Levantar la PWA real y probar el circuito completo a mano en el navegador: Escanear (en cada modo, tras la Fase B) → Ficha → Registrar entrada → confirmación → Escanear → Agregar a la venta → confirmación → Carrito → Confirmar venta.
- Con la Fase B: probar explícitamente escanear un código inexistente en modo "Vender" (debe mostrar el banner y quedarse en Escanear) y en modo "Recibir mercadería" (debe ir a Alta) — es el caso que más se aleja del comportamiento actual.
- Confirmar en DevTools (throttling de red a "Slow 3G") que el estado de "procesando" de "Registrar entrada" se ve claramente antes de la confirmación.
- Medir con el inspector el alto real de los botones de acción nuevos/modificados y confirmar ≥44px, simulando una pantalla chica (ej. iPhone SE).

## Checklist de aceptación

- [ ] "Registrar entrada" y "Agregar a la venta" muestran una confirmación de pantalla completa antes de volver a Escanear, con copy específico por acción.
- [ ] La confirmación de "Registrar entrada" espera la respuesta real del backend (estado de "procesando" primero); la de "Agregar a la venta" puede ser instantánea.
- [ ] "Registrar entrada" (navy) y "Agregar a la venta" (coral) tienen el mismo peso visual — ambos sólidos, mismo tamaño.
- [ ] El toggle "Vender" / "Recibir mercadería" existe en Escanear y determina: el título de la pantalla, si un código no encontrado va a Alta o muestra el banner, y qué acción única se ve en la Ficha.
- [ ] `overview.md` queda actualizado para reflejar el modo como parte del circuito, si se implementa la Fase B.
- [ ] Todos los botones de acción tocados miden ≥44px de alto medidos en el navegador real.
- [ ] Existe un único archivo de tokens de color/tipografía/radios, y ninguna pantalla tiene un hex de color hardcodeado fuera de ese archivo.
- [ ] El campo "Cantidad recibida" del mockup **no** se implementa en esta tarea (requiere decisión de backend aparte, ver Hallazgo 2.3 del análisis).
