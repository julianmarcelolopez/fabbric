# Tarea 2 — PWA: tab "Consultar" + conocer el rol del usuario logueado

**Estado:** ⬜ Pendiente.

**Depende de:** nada (`GET /admin/me` ya existe, no hay backend que
esperar acá — corrección de `plan.md` del 2026-11-05).

## Objetivo (según `plan.md`, sección "Qué cambia concretamente")

Dejar armada la navegación (tercer modo, tercer tab, nuevo tipo de
pantalla) y que la PWA sepa si el usuario logueado es `staff` o
`owner`/`super_admin` — sin la pantalla de edición en sí todavía
(eso es la Tarea 3), para poder verificar esta parte sola primero.

## Alcance

- `pwa/src/App.tsx`:
  - `modo` (línea 75) pasa de `"venta" | "entrada"` a
    `"venta" | "entrada" | "consultar"`.
  - Nuevo tipo de pantalla `{ kind: "editar"; variant: VariantByBarcode }`
    en el `Screen` discriminado.
  - Nuevo estado `role: "super_admin" | "owner" | "staff" | null`,
    poblado con `GET /admin/me` una vez al loguearse (mismo momento
    que hoy se resuelve la sesión de Supabase).
- `pwa/src/screens/EscanearScreen.tsx`:
  - El tipo `Modo` (línea 26) suma `"consultar"`. Tercer tab en la UI
    (junto a "Vender"/"Recibir mercadería"), visible para cualquier
    rol (Consultar es para todos, ver `specs/`).
  - Escanear/tipear un código en modo "consultar": si existe, en vez
    de ir a `FichaScreen` arma `{kind: "editar", variant}` (la
    pantalla real de edición todavía no existe — placeholder simple
    en esta tarea, reemplazado en la Tarea 3); si NO existe, mensaje
    "no encontrado" (no lleva a Alta, ese flujo es otro).

## Criterio de aceptación

- `tsc --noEmit` limpio en `pwa/`.
- Aparece el tab "Consultar" junto a los otros dos, para cualquier
  usuario.
- Al loguearse, se puede confirmar (log/estado) que `role` quedó
  seteado correctamente según el usuario (`staff` vs `owner`).
- Escanear un código conocido en modo Consultar NO lleva a
  `FichaScreen` (la de vender) — confirma que el ruteo cambió.
- Escanear un código inexistente en modo Consultar muestra "no
  encontrado", no lleva a Alta.
- Verificado en el navegador/celular, no solo por tipos.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 3 (la pantalla real de Editar necesita el modo,
  el tipo de pantalla y el rol ya resueltos acá).
