# T43 — Color opcional en variantes (caso perfumes)

## Pedido original

El cliente quiere agregar un producto tipo **perfume**, que no tiene
talle sino **volumen** (120ML, 100ML, 50ML) — el usuario propone
reusar el campo "talle" tal cual para eso (sin cambiar su nombre). El
problema real: hoy el sistema **obliga a poner un color** para
cualquier variante, y un perfume no tiene color.

Ejemplos reales del cliente:
- Catálogo: https://eliathimodas.com/p/f230ea0f-5c1f-471c-b17b-8df30540b481
- Admin: https://fabbric.aivance.cloud/admin/products/f230ea0f-5c1f-471c-b17b-8df30540b481

## Estado actual (verificado contra el código real)

Color es obligatorio en **las 4 capas**, de punta a punta:

| Capa | Archivo | Hoy |
|---|---|---|
| Base de datos | `backend/src/db/schema.ts` (`product_variants`) | `color: text("color").notNull()` — NOT NULL |
| Validación (Zod) | `packages/shared/src/schemas/variant.ts` | `createVariantSchema`: `color: z.string().min(1)` — no puede ir vacío |
| Admin (alta/edición de variantes) | `frontend/.../components/VariantEditor.tsx:150-157` | el `<input>` de color tiene el atributo HTML `required` |
| PWA (alta por escaneo) | `pwa/src/screens/AltaScreen.tsx:143-144` | `if (!color.trim()) return setFormError(...)` — bloquea el alta sin color |

`talle` es igual de obligatorio en todas las capas, pero no es un
problema para este caso: es un campo de texto libre, así que
"120ML" entra sin ningún cambio de código — el pedido del cliente de
reusar el campo tal cual ya funciona para esa parte.

**Lo que SÍ es seguro tocar:** el código de barras es **opcional** en
la base y en el esquema (`barcode` nullable / `.optional()`), y el
parseo (`backend/src/lib/barcode.ts`, regex de modelo+color+talle) solo
se ejecuta si hay un barcode con ese formato — un perfume puede
simplemente no tener barcode con ese patrón, o tener uno sin segmento
de color, sin romper nada de lo existente (esa lógica es por-variante,
no global).

## Por qué esto importa

No es un bug — es una limitación de diseño: el modelo de datos asume
que toda prenda tiene talle Y color. Un perfume (y potencialmente
otros productos a futuro: velas, fragancias para el hogar, etc.) solo
tiene una dimensión variable. Forzar un valor de color sin sentido
(ej. escribir "N/A" o "-") ensuciaría el catálogo y se mostraría tal
cual en la tienda online y en la PWA.

## Alcance propuesto

Hacer **color realmente opcional**, en las 4 capas, para cualquier
producto — no solo para una categoría "Perfumes" específica. No hace
falta un flag por categoría (como `splitBarcodeColor` de B001): ahí el
flag existía porque la *lógica de matching* cambiaba según la
categoría; aquí no hay dos comportamientos en conflicto, solo un campo
que puede estar vacío o no. Productos existentes no se tocan — ya
tienen color seteado, sigue así.

Cambios concretos (detalle técnico en `plan.md`):
1. **DB**: `product_variants.color` pasa a nullable.
2. **Zod**: `color` opcional en `createVariantSchema`/`updateVariantSchema`.
3. **Admin**: sacar el `required` del input de color; mostrarlo como
   campo opcional.
4. **Storefront**: el selector de "Color" en la ficha de producto
   (`ProductDetailView.tsx`) ya solo se muestra si hay colores
   (`colores.length > 0`) — hay que asegurarse de que un color
   vacío/null no cuente como color real (filtrar antes de armar la
   lista), para que el selector no aparezca para un perfume.
5. **PWA — Alta**: sacar la validación que bloquea el alta sin color;
   input de color pasa a opcional.
6. **PWA — Ficha**: hoy muestra siempre `Talle {talle} · {color}`
   (`FichaScreen.tsx:119`) — mostrar la parte del color solo si existe.

## Preguntas abiertas (necesito que las confirmes antes de planear el detalle)

1. **Formato del código de barras de los perfumes**: ¿siguen el mismo
   patrón que la ropa (`modelo + color de 3 dígitos + "." + talle`),
   solo que con el segmento de color en blanco o fijo, o es un formato
   distinto (ej. `modelo + "." + ML`, sin segmento de color)? Esto
   importa para saber si `suggest-by-barcode` (la sugerencia de
   producto existente al escanear) necesita algún ajuste para
   perfumes, o si directamente no aplica (perfume se carga manual, sin
   escaneo de modelo).
2. **Talle libre o lista cerrada**: ¿el campo "talle" para perfumes va
   a ser texto libre tipeado cada vez ("120ML", "100ML", "50ML"), o
   preferirías que hubiera valores fijos para evitar variantes
   tipeadas ligeramente distinto (ej. "120ML" vs "120 ml")? Se puede
   dejar texto libre para esta vuelta e ir viendo si aparecen
   inconsistencias (mismo patrón que B001).

## Fuera de alcance

- Un campo de categoría (`requiresColor`/similar) para forzar u
  ocultar el input según la categoría — no hace falta con el enfoque
  de "opcional para todos".
- Cambiar el nombre/label del campo "talle" (el cliente explícitamente
  prefiere reusarlo tal cual).
- Cualquier unidad de medida estructurada (ej. select de ML en vez de
  texto libre) — se puede evaluar más adelante si hace falta.
