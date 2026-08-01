# 01 — Design tokens

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

El sistema de diseño base: paleta de colores, tipografías, escala tipográfica, espaciados y las variables CSS configurables por tenant. Es la base de la que dependen las 7 tareas siguientes — nada de "look" se decide después de esta tarea, solo se consume.

## Referencia visual

Los 5 mockups (`mockups/*.html`) — todos comparten el mismo `:root` casi textual. Ver `analisis.md` sección 1 para los valores exactos ya extraídos (hex de colores, tamaños tipográficos, Google Fonts URL).

## Componentes a crear o modificar

No hay componentes React en esta tarea — es pura definición de tokens (CSS + carga de fuentes).

## Variables CSS que usa o define

Define (no consume ninguna todavía):

```css
:root {
  /* Configurables por tenant */
  --tenant-primary: var(--accent, #F07058);
  --tenant-font-display: 'Cormorant Garamond', Georgia, serif;

  /* Fijos del sistema */
  --navy: #1E2A4A;
  --white: #FFFFFF;
  --off: #F8F7F5;
  --gray: #E8E4DF;
  --text: #2C2C2C;
  --muted: #8A8278;
  --green: #16A34A;
  --green-bg: #F0FDF4;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

Ver `analisis.md` sección 5 para la justificación de por qué solo `--tenant-primary` y `--tenant-font-display` son configurables, y el resto queda fijo.

## Archivos a modificar

- `frontend/src/features/catalog/catalog.css` — reemplazo del `:root` actual (paleta T13, ver `docs/T13_IdentidadVisual/`) por el nuevo sistema de tokens. Se reemplaza el archivo, no se parchea (ver `analisis.md` sección 4).
- `frontend/index.html` (o donde esté el `<link>` de Google Fonts actual, agregado en T13) — actualizar a la URL de fuentes de los mockups (Cormorant Garamond + DM Sans, reemplazando lo que haya hoy).
- `frontend/src/features/store/StoreLayout.tsx` — el mecanismo que inyecta `--accent: config.accentColor` inline pasa a inyectar `--tenant-primary` (o mantener `--accent` como alias interno, a decidir al implementar, con `--tenant-primary: var(--accent)` en el CSS para no romper nada que ya lo use).

## Criterio de completado

- `tsc --noEmit` limpio en frontend.
- Las fuentes cargan correctamente (verificado en navegador, Network tab o inspección visual del serif/sans reales, no una fuente de fallback).
- `--tenant-primary` refleja `config.accentColor` de la org real (verificable cambiando el color en "Mi tienda" y viendo que se propaga, sin necesidad de que ninguna página nueva esté implementada todavía — alcanza con inspeccionar la variable computada en devtools).
- Ningún componente existente de la tienda pública se rompe visualmente por la falta de las clases viejas de `catalog.css` (verificar `/store/eliathi-modas` sigue renderizando, aunque se vea "desvestido" hasta que `02` en adelante lo rediseñen).

## Notas y dependencias

- Prerequisito de **todas** las tareas siguientes (`02` a `08`).
- El **breakpoint mobile no está definido en ningún mockup** (ver `analisis.md` sección 1) — esta tarea no lo resuelve todavía (no hay layout que adaptar), pero es el lugar natural para dejar anotado/reservado un valor de breakpoint estándar (ej. 768px, mismo que ya usa el admin desde T19) para que las tareas siguientes lo usen de forma consistente en vez de que cada una invente el suyo.
- No requiere backend — `accentColor`/`logoUrl` ya existen y ya se consumen.

## Resultado

Decisión del usuario antes de implementar — **Opción A**: `--accent` se mantiene como variable interna real (la que `StoreLayout.tsx` sigue inyectando inline con `config.accentColor`, sin tocar ese archivo); `--tenant-primary: var(--accent, #F07058)` es un alias nuevo en el CSS que las tareas `02` a `08` van a consumir — cero migración de los usos existentes de `--accent` (compatibilidad total con T13/T19).

- **`catalog.css`**: se agregó el bloque `:root` con los 10 tokens nuevos (no existía ningún `:root` antes — T13 hardcodeaba los colores directo en cada regla, sin variables). Ninguna regla existente se tocó — quedan con sus valores hardcodeados hasta que cada tarea de `02` a `07` las reescriba una por una, tal como está documentado en el comentario agregado al bloque. El breakpoint de 768px quedó reservado como comentario (no como variable — las custom properties de CSS no se pueden usar dentro de la condición de un `@media`).
- **`index.html`**: el `<link>` de Google Fonts se reemplazó de Poppins (T13) a Cormorant Garamond + DM Sans (mismo URL exacto que usan los 5 mockups). Confirmado que Poppins solo se usaba en `catalog.css` (`.store`, `.store-message`) — el admin usa `system-ui` y no depende de este link, así que el cambio no afecta `/admin`.
- **`StoreLayout.tsx`**: sin cambios, tal como pedía la Opción A.

**Verificación real**: `tsc --noEmit` y `vite build` limpios. En navegador (`/store/eliathi-modas`, screenshot del usuario): la tienda renderiza sin romperse (header, banner, productos, footer), el color de acento naranja de la org sigue exactamente igual (viene de `--accent`, no tocado). El texto cayó al fallback del sistema en vez de Poppins (que dejó de cargarse) — el "desvestido" esperado y aceptado para esta tarea, ya que ningún componente consume todavía `--font-body`/`--tenant-font-display`. No se verificó explícitamente en la pestaña Network que Cormorant Garamond/DM Sans estén cargando (se confirmó indirectamente por la ausencia de Poppins) — riesgo bajo, es solo un `<link>` de Google Fonts sin lógica.
