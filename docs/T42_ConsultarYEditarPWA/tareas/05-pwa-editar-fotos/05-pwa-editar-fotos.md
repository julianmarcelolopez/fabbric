# Tarea 5 — PWA: `EditarScreen.tsx`, sección "Fotos"

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 1 (guard real para borrar), Tarea 3 (pantalla
base + fetch del producto completo ya resueltos).

## Objetivo (según `plan.md`, sección "Qué cambia concretamente")

Completar la tercera sección de `EditarScreen.tsx`: ver, agregar y
borrar fotos del producto — mismo criterio de solo-lectura para
`staff`.

## Alcance

- Sección "Fotos": grilla de fotos existentes (ya traídas por
  `GET /admin/products/:id` en la Tarea 3) con:
  - Borrar vía `DELETE /admin/images/:id`.
  - "+ Agregar foto" reusando `ImageCropper.tsx` tal cual (T37) —
    mismo recorte cuadrado que ya usa `AltaScreen.tsx`, sube vía
    `POST /admin/products/:id/images`.
- **Fuera de alcance, a propósito** (ya aclarado en `plan.md`):
  reordenar fotos — existe `PUT /admin/products/:id/images/order`
  y lo usa el admin de escritorio, pero no es parte de esta vuelta.
- Si `role === "staff"`: la sección se muestra igual (puede ver las
  fotos) pero sin "+ Agregar foto" ni botón de borrar — mismo aviso
  fijo que en "Datos"/"Variantes".

## Criterio de aceptación

- `tsc --noEmit` limpio en `pwa/`.
- Con un usuario `owner`: agregar una foto (con el recorte de
  `ImageCropper.tsx`) y borrar una foto existente persisten
  (confirmar recargando/re-escaneando).
- Con un usuario `staff`: la sección muestra las fotos existentes
  pero sin forma de agregar ni borrar.
- `DELETE /admin/images/:id` devuelve 403 con un token de `staff`
  (confirmar con `curl`/script).
- El alta por escaneo (`AltaScreen.tsx`, que también llama
  `POST /admin/products/:id/images` para `staff`) sigue funcionando
  exactamente igual — no se tocó ese endpoint.
- Verificado en el navegador/celular, no solo por tipos.

## Dependencias

- **La bloquean:** Tarea 1, Tarea 3.
- **Bloquea:** ninguna.
