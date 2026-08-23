# Análisis de flujo — T23 App de ingreso/egreso de productos

Ver el prototipo navegable en `mockups.html` — este documento describe en texto la misma lógica de navegación. Ver `overview.md` para el detalle de qué endpoint del backend existente resuelve cada paso.

## Mapa de navegación

```
Login (previa, sin bottom nav)
  └─ Ingresar (Supabase Auth real) → Escanear

Escanear (destino — bottom nav)
  ├─ GET /admin/variants/by-barcode/:code → 404 → Alta de producto
  │     └─ Guardar producto (product + variant + imagen) → vuelve a Escanear
  ├─ GET /admin/variants/by-barcode/:code → 200 → Ficha de producto
  │     ├─ Registrar entrada (stock-movements, channel local) → vuelve a Escanear
  │     └─ Agregar a la venta → suma al carrito (badge en nav) → vuelve a Escanear
  └─ (bottom nav) → Carrito

Carrito (destino — bottom nav)
  ├─ quitar ítem → se actualiza la lista, se queda en Carrito
  ├─ elegir medio de pago (efectivo/transferencia/tarjeta/mercadopago)
  ├─ Confirmar venta → POST /admin/orders/venta-local → Confirmar venta (estado)
  │     └─ Volver a escanear → vacía el carrito → Escanear
  └─ (bottom nav) → Escanear
```

## Tabla de pantallas

| Pantalla | Tipo | Se llega desde | Qué dispara |
|---|---|---|---|
| Login | Previa | Apertura de la app | Ingresar (Supabase Auth real) → Escanear |
| Escanear | Destino (bottom nav) | Login, vuelta de Alta/Ficha/Confirmar, o tap en nav | `GET /admin/variants/by-barcode/:code` — deriva a Alta o Ficha según la respuesta |
| Alta de producto | Estado | Escanear, cuando el código no existe (404) | `POST /admin/products` + `POST /admin/products/:id/variants` (con `barcode`) + `POST /admin/products/:id/images`, vuelve a Escanear |
| Ficha de producto | Estado | Escanear, cuando el código ya existe (200) | Registrar entrada (`POST /admin/variants/:id/stock-movements`) / Agregar a la venta (suma al carrito local) |
| Carrito | Destino (bottom nav) | Tap en nav, o vuelta desde Ficha tras agregar un ítem | Confirmar venta |
| Confirmar venta | Estado | Carrito, al tocar "Confirmar venta" | `POST /admin/orders/venta-local` (crea pedido + descuenta stock + marca pagado + registra movimiento financiero, todo en una transacción), vuelve a Escanear |

## Reglas de la navegación

- Solo **Escanear** y **Carrito** son destinos alcanzables libremente, vía bottom nav.
- **Alta**, **Ficha** y **Confirmar venta** son estados: se llega a ellos únicamente por una acción específica (nunca aparecen como pestaña o botón de navegación suelto), y todas vuelven a Escanear al completarse.
- El carrito vive en el estado local de la app (no se persiste contra el backend) hasta que se confirma la venta — recién ahí se llama a `venta-local`.
- La carga masiva por CSV **no forma parte de esta navegación ni de esta implementación** — diferida, ver `overview.md` ("Decisiones resueltas", punto 8) y `plan.md`.
