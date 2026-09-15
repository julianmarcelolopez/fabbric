# Tarea 1 — Base: pisar `admin.css` con la paleta nueva

**Estado:** ✅ Hecha — verificada en vivo por el usuario en `/admin/products`.

**Depende de:** nada.

## Objetivo (según `plan.md`, T32/01)

Aplicar el cambio de piel de marca (navy/coral/crema/DM Sans) a las 13
páginas del admin sin tocar ningún `*Page.tsx`, adoptando
`mockups/admin-redesign.css` como el nuevo `admin.css` — no hay que
traducir la tabla de paleta de la spec a CSS, ese trabajo ya está hecho en
el mockup y ya coincide con la tabla (ver `analisis.md` sección 2).

## Pasos

- [x] Reemplazar el contenido completo de
      `frontend/src/features/admin/admin.css` por el de
      `docs/T32_UX-Admin/mockups/admin-redesign.css`.
- [x] Sacar el `@import` de Google Fonts del archivo pisado (línea 8 del
      mockup) — `DM Sans`/`Cormorant Garamond` ya se cargan globalmente
      desde `frontend/index.html:16` (T20/01, confirmado en `analisis.md`
      sección 3). No hizo falta agregar ni tocar nada en `index.html` ni
      en `AdminLayout.tsx`.
- [x] Se dejaron las clases `.stat-card`/`.stat-card-label`/`.stat-card-value`
      en el archivo aunque todavía no las consume ningún `*Page.tsx` — las
      usan las Tareas 4 y 5.
- [x] No se tocó ningún archivo de `pages/` en esta tarea — las fugas de
      color inline (Tarea 2) se corrigen después, comparándolas contra el
      fondo ya correcto.

## Cómo se verificó

`npx tsc --noEmit` limpio en `frontend/` (cambio de CSS puro, no tocó
tipos). Verificación visual en vivo por el usuario en
`localhost:5173/admin/products` (Vite hot-reload, sin reiniciar
contenedores): sidebar navy con nombre de org en serif, link activo
"Productos" en coral, fondo crema, tabla blanca con buen contraste, botón
primario "Crear y editar" en coral, botones "Borrar" en rojo (`.btn.danger`,
sin cambios), tag "sin variantes" en ámbar (semántico, no coral, tal como
pedía la spec) — todo consistente con lo esperado.

## Definition of Done

- [x] Las 13 páginas cargan con sidebar navy (`#1E2A4A`), accent coral
      (`#F07058`), fondo crema (`#F8F7F5`), sin haber tocado ningún
      `*Page.tsx`.
- [ ] El breakpoint mobile de 768px (sidebar deslizable) — pendiente de
      verificar en vivo (no se probó específicamente en este chequeo, solo
      desktop). Se retoma en la Tarea 7 si no se verifica antes.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tareas 2 a 7 (todas dependen de esta).
