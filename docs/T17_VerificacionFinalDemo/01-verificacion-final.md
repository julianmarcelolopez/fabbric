# Tarea 1 — Carga de datos + recorrido end-to-end

**Estado:** ⬜ Pendiente
**Depende de:** T11 a T16

## Objetivo

Dejar la demo lista para mostrarle a Edgar Silguero: datos reales cargados + una vuelta completa por la tienda con todas las features de `docs/plan_2.md` funcionando juntas.

## Pasos — carga de datos (sin desarrollo, sobre lo que ya existe)

- [ ] Crear las 4 zonas de envío en `/admin/shipping`: Almirante Brown, Quilmes, Varela, Lanús (costo y envío gratis desde monto X, a definir con el usuario).
- [ ] Crear el usuario admin `owner` de Edgar (alta manual, como se hizo con el resto de los seeds del proyecto).
- [ ] Cargar 8-10 productos de ejemplo, con marca, precio con descuento en al menos algunos, y variantes (talle/color) — suficiente para que la demo se vea poblada sin necesitar el importador CSV (fuera de alcance).
- [ ] Configurar banner, WhatsApp, Instagram, mail, dirección y horario desde `CatalogConfigPage`.

## Checklist final (usuario, en navegador) — recorrido completo

- [ ] Entrar a `/store/<slug>` como lo haría un cliente: header con banner/wordmark, catálogo con precios tachados y marcas visibles, footer con WhatsApp/Instagram/mail/dirección/horario, botón compartir.
- [ ] Armar un pedido y completar el checkout — confirmar que el pago entra a la cuenta configurada en Integraciones (si Edgar ya conectó una) o a la de plataforma (si no).
- [ ] Entrar a `/admin/settings` y confirmar que el tab Usuario y el tab Integraciones muestran lo esperado.
- [ ] Recorrer el resto del admin (Productos, Stock, Pedidos, Clientes, Finanzas, Dashboard) para confirmar que nada de T11-T16 rompió algo del MVP ya cerrado (T0-T10).
- [ ] Consola limpia en toda la recorrida; typecheck limpio en los 3 workspaces.

## Resultado

_(completar al verificar)_

## Al cerrar

- [ ] Actualizar `docs/plan_2.md`, los README de T11-T17 y la memoria del proyecto.
- [ ] Sugerir commit final (o uno por fase, según se haya ido trabajando).
- **La demo queda lista para mostrarle a Edgar.**
