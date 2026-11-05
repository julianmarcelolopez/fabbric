# Plan — Modo "Consultar" en la PWA (T42)

Basado en `specs/T42_ConsultarYEditarPWA.md` (diagnóstico completo,
alcance ampliado el 2026-11-03: permisos por rol + paridad con el admin
de escritorio). Este plan ordena la implementación con las decisiones ya
tomadas; no repite el análisis.

**Decisiones confirmadas por el usuario (2026-11-03):**
1. Bloquear "Modificar" para `staff` en los dos lados (PWA y admin de
   escritorio) — pero solo donde sea seguro hacerlo sin romper el alta
   existente (ver "Permisos" más abajo, hay un matiz importante).
2. Implementar todo junto (Datos + Variantes + Fotos + permisos), no por
   fases.
3. **Estado: diseño y plan cerrados, NO implementar todavía** — el
   usuario pidió explícitamente documentar antes de tocar código.

## Mockup visual

Mismo estilo real de la PWA (header "Eliathi" en script, tabs, bottom
nav). Incluye un toggle de rol (Vendedor/Dueño) para probar las dos
vistas, y la ficha con 3 secciones (Datos/Variantes/Fotos):

**[Modo Consultar PWA](https://claude.ai/artifact/VcFsM7C2vSuGqrjTaUSmBn)**

## Permisos — qué se bloquea de verdad y qué no (y por qué)

Al diseñar el guard de backend apareció un choque real: varios endpoints
que "Modificar" necesita **ya los usa el alta existente**, que cualquier
`staff` usa hoy para cargar mercadería:

| Endpoint | ¿Lo usa el alta hoy (staff)? | Decisión |
|---|---|---|
| `PATCH /admin/products/:id` | Sí — `AltaScreen.tsx` lo llama con `{visibleInCatalog}` al "Publicar en la tienda online" | **Queda abierto** a cualquier rol |
| `POST /admin/products/:id/variants` | Sí — cuando el modelo escaneado ya existe (T37, suggest-by-barcode), agrega la variante ahí | **Queda abierto** |
| `POST /admin/products/:id/images` | Sí — "Agregar foto" del alta (T37, con `ImageCropper.tsx`) | **Queda abierto** |
| `DELETE /admin/variants/:id` | No — borrar una variante no es parte de ningún flujo de staff hoy | **Bloqueado**: nuevo guard `requireOwnerOrAbove` |
| `DELETE /admin/images/:id` | No | **Bloqueado**: `requireOwnerOrAbove` |
| `PUT /admin/products/:id/collections` | No — hoy solo lo usa el admin de escritorio | **Bloqueado**: `requireOwnerOrAbove` |

Para los 3 que quedan abiertos (porque el alta de hoy los necesita para
`staff`), el permiso se resuelve **solo en la UI de la PWA**: la pantalla
"Consultar" no le muestra a un `staff` los campos editables ni el botón
"Guardar" — puede ver todo, no puede tocar nada desde ahí. No es
seguridad real a nivel de API para esos 3 (un `staff` que llame al
backend directo con su propio token técnicamente podría, igual que puede
hoy sin esta feature) — es una limitación conocida y aceptada, documentada
acá a propósito, no un descuido. Si en el futuro hace falta cerrarla
del todo, la solución sería separar esos 3 endpoints en una versión
"alta" (sigue abierta) y una versión "edición completa" (solo
`owner`/`super_admin`) — no se hace ahora para no reescribir el alta que
ya funciona.

`PATCH /admin/variants/:id` (talle/color/sku/barcode/priceOverride) **no
lo usa el alta hoy** — es íntegramente nuevo para T42, así que éste SÍ se
puede bloquear de verdad con `requireOwnerOrAbove` sin romper nada
existente.

**Resumen del guard nuevo** — `requireOwnerOrAbove` (mismo patrón que
`requireSuperAdmin`, `backend/src/plugins/auth.ts:149-154`): rechaza si
`request.adminUser.role === "staff"`. Se aplica a:
- `PATCH /admin/variants/:id`
- `DELETE /admin/variants/:id`
- `DELETE /admin/images/:id`
- `PUT /admin/products/:id/collections`

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-guard-requireowner](tareas/01-backend-guard-requireowner/01-backend-guard-requireowner.md) | nada | ⬜ |
| 2 | [02-pwa-navegacion-y-rol](tareas/02-pwa-navegacion-y-rol/02-pwa-navegacion-y-rol.md) | nada | ⬜ |
| 3 | [03-pwa-editar-datos](tareas/03-pwa-editar-datos/03-pwa-editar-datos.md) | 1, 2 | ⬜ |
| 4 | [04-pwa-editar-variantes](tareas/04-pwa-editar-variantes/04-pwa-editar-variantes.md) | 1, 3 | ⬜ |
| 5 | [05-pwa-editar-fotos](tareas/05-pwa-editar-fotos/05-pwa-editar-fotos.md) | 1, 3 | ⬜ |

## Qué cambia concretamente

**Backend** (`backend/src/plugins/auth.ts`):
- Nuevo `app.decorate("requireOwnerOrAbove", ...)`, mismo patrón que
  `requireSuperAdmin` pero aceptando `"owner"` además de `"super_admin"`.
- Aplicarlo como `preHandler` en los 4 endpoints de la tabla de arriba
  (`backend/src/modules/variants/routes.ts`,
  `backend/src/modules/images/routes.ts`).

**`pwa/src/App.tsx`**:
- `modo` (línea 75) pasa de `"venta" | "entrada"` a
  `"venta" | "entrada" | "consultar"`.
- Nuevo tipo de pantalla `{ kind: "editar"; variant: VariantByBarcode }`.
- Necesita saber el rol del usuario logueado. **Corrección 2026-11-05**:
  `GET /admin/me` **ya existe** (`backend/src/modules/admin/routes.ts`,
  devuelve `{id, email, role, orgId, orgName, dashboardLayout}`) — no
  hace falta crear nada en el backend para esto, es sólo que la PWA
  todavía no lo llama. Se pide una vez al loguearse (mismo momento que
  hoy se resuelve la sesión de Supabase) y el rol se guarda en estado.

**`pwa/src/screens/EscanearScreen.tsx`**:
- El tipo `Modo` (línea 26) suma `"consultar"`. Tercer tab en la UI,
  visible para cualquier rol (Consultar es para todos).

**Nueva pantalla `pwa/src/screens/EditarScreen.tsx`** — 3 secciones
(sub-tabs, ver mockup). Carga de datos en dos pasos: el escaneo en
modo Consultar ya trae un `VariantByBarcode` (igual que Vender/
Recibir), pero ese tipo no alcanza para precargar los selects de
marca/categoría (no trae `categoryId`/`brandId`, solo los nombres
resueltos) — al entrar a Editar, pedir además
`GET /admin/products/:id` (con `variant.product.id`, ya disponible)
para tener el producto completo (`categoryId`, `brandId`, `costPrice`,
`compareAtPrice`, `installmentsText`, `description`, `variants`,
`images`, `collections` — todo en una sola respuesta, sin endpoints
nuevos). **Nota (2026-11-05)**: T43 ya dejó `color` nullable en todo
el stack (`VariantByBarcode.color`, `Variant.color`, Zod, DB) — la
sección Variantes de acá no necesita ningún manejo especial para
variantes sin color, ya es el comportamiento por defecto.
- **Datos**: nombre, marca, categoría, estado, precio, costo interno,
  precio anterior, cuotas/leyenda — todo vía `PATCH /admin/products/:id`
  (solo los campos que cambiaron). Colecciones vía
  `PUT /admin/products/:id/collections`.
- **Variantes**: lista de variantes del producto (talle/color/barcode/
  stock) con editar (`PATCH /admin/variants/:id`), borrar
  (`DELETE /admin/variants/:id`) y agregar
  (`POST /admin/products/:id/variants`).
- **Fotos**: grilla de fotos existentes con borrar
  (`DELETE /admin/images/:id`) y "+ Agregar foto" reusando
  `ImageCropper.tsx` tal cual (T37) — mismo recorte cuadrado.
  **Fuera de alcance, a propósito**: reordenar fotos (existe
  `PUT /admin/products/:id/images/order` y el admin de escritorio lo
  usa) — no es parte de "ver y corregir rápido" desde el piso de
  venta; si hace falta, es una vuelta aparte.
- Si `role === "staff"`: las 3 secciones se muestran igual, pero sin
  ningún control editable ni botones de guardar/borrar/agregar — un
  aviso fijo arriba ("Solo lectura — tu rol no puede modificar").
- Conflicto de barcode duplicado (409) se muestra como error, igual que
  en `AltaScreen.tsx`.

## Verificación

- `tsc --noEmit` limpio en `backend/` y `pwa/`.
- Con un usuario `staff`: "Consultar" muestra todo de solo lectura, sin
  forma de guardar/borrar/agregar nada desde la UI.
- Con un usuario `owner`: las 3 secciones permiten editar, agregar y
  borrar, y los cambios persisten (confirmar recargando).
- `DELETE /admin/variants/:id`, `DELETE /admin/images/:id` y
  `PUT /admin/products/:id/collections` devuelven 403 si se llaman con un
  token de `staff` (confirmar con `curl`, no solo desde la UI).
- El alta por escaneo (`AltaScreen.tsx`) sigue funcionando exactamente
  igual para `staff` — publicar online, agregar variante a modelo
  existente, y subir foto del alta no se rompieron.
- "Vender"/"Recibir mercadería" sin cambios.

## Criterios de aceptación

Ver `specs/T42_ConsultarYEditarPWA.md` — no se repiten acá.
