# Tarea 4 — PWA: color opcional en Alta y Ficha

**Estado:** ✅ Hecha y verificada. `tsc --noEmit` y `vite build`
limpios en `pwa/`. Verificación visual automatizada con Playwright:
**7/7 checks OK** — ver `pwa/t43-pwa-alta-color-opcional.mjs` y las
capturas en [`test/`](test/).

**Hallazgo del entorno, no de código** (bloqueó el test hasta
resolverlo): el contenedor Docker de `pwa` tenía un `node_modules`
desactualizado (volumen anónimo que sobrevive a un rebuild normal) —
le faltaba `react-easy-crop` (dependencia de `ImageCropper.tsx`,
T37), así que la PWA entera tiraba 500 al cargar. Se resolvió con
`docker compose up -d --build -V pwa` (el `-V` fuerza a recrear los
volúmenes anónimos, no solo la imagen). Sin relación con el código de
T43, pero hay que recordarlo si vuelve a pasar después de instalar una
dependencia nueva en cualquiera de los 3 servicios.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T43 puntos 6-7)

Que se pueda dar de alta un perfume por escaneo sin que la PWA
bloquee el alta por falta de color, y que la ficha no muestre un
color vacío colgando.

## Alcance real

- `pwa/src/screens/AltaScreen.tsx`:
  - Sacado `color` de la validación obligatoria — ahora solo pide
    marca, modelo y talle.
  - Al mandar el alta (tanto "agregar variante a modelo existente"
    como "alta-rápida" de producto nuevo), el color se manda
    `color.trim() === "" ? null : color.trim()` en vez de
    `color.trim()` a secas — coherente con el `emptyToNull` del
    backend (Tarea 1), y evita mandar un string vacío si el operador
    no lo tocó.
  - Placeholder del input cambiado a "Color (opcional)".
- `pwa/src/screens/FichaScreen.tsx` — el color se muestra solo si
  existe (`Talle {talle}{color ? " · " + color : ""}`).
- `pwa/src/types.ts`: `VariantByBarcode.color` pasa de `string` a
  `string | null`.
- **Hallazgo, al propagar el tipo nullable** — 2 archivos más tenían
  el mismo patrón `"{talle}/{color}"` armado a mano:
  - `pwa/src/screens/CarritoScreen.tsx`: `CartItem.color` a
    `string | null`, y el texto del ítem del carrito ajustado para no
    mostrar `/null`.
  - `pwa/src/App.tsx` (línea 107, al agregar al carrito) — sin
    cambio de código, solo se beneficia del tipo ya corregido en
    `CartItem`.

## Criterio de aceptación

- `tsc --noEmit` y `vite build` limpios en `pwa/`. ✅
- Alta por escaneo de un código sin tipear color → se guarda sin
  error de validación (confirmado: respuesta 201 de `alta-rapida`, y
  el color quedó `NULL` en la base, no `""`). ✅ Verificado
  (`test/01-alta-sin-color-foto-step.png`).
- `FichaScreen` de esa variante → muestra `Talle 120ML` sin `· ` ni
  `· null` colgando. ✅ Verificado (`test/02-ficha-sin-color.png`).
- Carrito con ese ítem → mismo criterio, sin `/null`. ✅ Verificado
  (`test/03-carrito-sin-color.png`).
- Alta de ropa existente (con color) sin cambios — el operador puede
  seguir tipeándolo igual, solo que ya no es obligatorio para nadie.
  No regresionado (cubierto indirectamente: el mismo formulario y
  mismo endpoint siguen aceptando color cuando se completa, Tarea 1
  ya lo verificó a nivel de datos).
- Escanear una segunda variante del mismo perfume (mismo
  modelo+color del barcode, distinto volumen) y que
  `suggest-by-barcode` la reconozca como el mismo producto en vez de
  crear uno nuevo — **no cubierto por este test** (ya verificado por
  separado en Tarea 1 con un script de lógica directa contra la
  base); queda como prueba manual pendiente si se quiere verificar
  también el flujo de UI completo.

## Verificación automatizada (Playwright)

`pwa/t43-pwa-alta-color-opcional.mjs` — crea un usuario/org/categoría
descartables, loguea en la PWA real (`http://localhost:5174`,
Docker), da de alta un perfume por escaneo sin tocar el campo Color,
confirma el 201 y el `NULL` en la base, vuelve a escanear el mismo
código en modo "Vender" para ver la Ficha, agrega a la venta y revisa
el Carrito — en cada paso comprueba que no aparezca la palabra "null"
en pantalla. Guarda 3 capturas en [`test/`](test/) y borra todos los
datos de prueba al final (confirmado por el propio script). Correr
con:
```
cd pwa && node t43-pwa-alta-color-opcional.mjs
```
Resultado de la última corrida: **7 PASS, 0 FAIL**.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** ninguna.
