# Rol y método para la implementación de T20

## Rol

Implementador frontend senior. La misión de esta fase no es diseñar — es **llevar los mockups a producción con fidelidad exacta**, tomando las mismas decisiones de estructura de código que ya vienen usándose en `frontend/src/features/store/` y `features/catalog/` (componentes presentacionales puros donde ya existen, reuso de lógica de fetch/estado ya construida, mismo patrón de tipos entre backend↔frontend).

## Fuente de verdad

Los archivos en `mockups/` mandan. Si algo no está claro en un mockup — un estado hover no mostrado, un breakpoint no definido, un texto de ejemplo que no aplica a un producto real — **se documenta la duda y se pregunta antes de inventar**, no se decide por cuenta propia una alternativa "razonable". Los mockups son HTML+CSS reales, no bocetos: cuando haya ambigüedad, inspeccionar el CSS del mockup (clases, valores exactos) antes de asumir.

## Lo que SÍ hace esta fase

- CSS (incluyendo el sistema de tokens de `01-design-tokens.md`).
- Componentes React/TSX (nuevos y adaptados).
- Layouts y estructura de páginas.
- Animaciones y transiciones (hover, acordeones, etc. — tal como están en el CSS de los mockups).
- Ajustes menores de tipos TypeScript cuando un componente nuevo lo requiere (props, no esquemas de datos).

## Lo que NO hace esta fase

- **No cambia lógica de negocio** — cómo se calculan precios, stock, envío, o el flujo de pago sigue exactamente igual.
- **No toma decisiones de diseño que el mockup no muestra.** Si hace falta un estado que no está en el mockup (ej. carrito vacío, error de carga, mobile), se busca el patrón más parecido ya usado en el resto de la tienda (`store-message`, etc.) y se dice explícitamente que es una extrapolación, no algo que "dice el mockup".
- **No cambia el esquema de base de datos.** Los campos que el diseño necesita y no existen (ver `analisis.md` sección 6) se dejan pendientes, documentados — no se agregan migraciones nuevas salvo que una tarea lo diga explícitamente (ninguna de `01` a `08` lo hace en su alcance actual).
- **No toca el panel admin**, salvo `08-admin-configurable.md`, y ahí también solo lo que ya tiene soporte de backend.

## Principios

- **Mobile first.** Ningún mockup tiene media queries (son vistas de escritorio) — el comportamiento mobile de cada componente se diseña con criterio propio, documentado como decisión explícita en cada tarea, no asumido.
- **Lazy loading** en imágenes de producto/categoría fuera del viewport inicial (los mockups ya usan `loading="lazy"` en la mayoría de las `<img>` — mantenerlo).
- **Consistencia entre páginas**: el header, footer, cards de producto y tokens de diseño son los mismos en las 5 páginas — si algo se ve distinto entre dos mockups sin razón aparente, es señal de revisar si es intencional o un descuido del mockup, no de replicar la inconsistencia.
- **Variables CSS para lo configurable por tenant** (`--tenant-primary`, `--tenant-font-display` — ver `analisis.md` sección 5): todo color/tipografía que hoy sale de `catalog_configs` sigue saliendo de ahí, nunca hardcodeado al valor de Eliathi Modas. Los mockups tienen los valores de Eliathi hardcodeados porque son mockups de un tenant — el código no.

## Formato de las tareas

Cada archivo en `tareas/` sigue esta estructura:

```markdown
## Qué se implementa
## Referencia visual (qué mockup, qué sección)
## Componentes a crear o modificar
## Variables CSS que usa o define
## Archivos a modificar
## Criterio de completado
## Notas y dependencias
```
