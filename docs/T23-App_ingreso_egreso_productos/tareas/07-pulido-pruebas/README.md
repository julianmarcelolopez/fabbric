# Fase 7 — Pulido y pruebas

## Objetivo (según plan.md)

Cerrar el ticket con manejo de errores razonable y verificación real de los tres flujos principales contra el prototipo navegable — y confirmar que el stock que mueve la PWA es, literalmente, el mismo que ve la tienda online.

## Checklist

- [ ] Manejo de errores de red (sin conexión, timeouts contra el backend).
- [ ] Manejo del caso "cámara sin permiso" en la pantalla Escanear.
- [ ] Estados de carga/spinner en las acciones contra el backend (alta, entrada, confirmar venta).
- [ ] Prueba end-to-end del flujo de **alta**: escanear código nuevo → completar formulario (incluida categoría) → foto → guardar → verificar `product`/`productVariant` en la base y en el panel admin de escritorio (`frontend/`) → verificar imagen en el bucket `product-images`.
- [ ] Prueba end-to-end del flujo de **entrada**: escanear código existente → registrar entrada con cantidad > 1 → verificar movimiento y `stockLocal` actualizado, visible también en `StockPage` del admin.
- [ ] Prueba end-to-end del flujo de **venta completa**: agregar varios productos al carrito → elegir medio de pago → confirmar → verificar `order` + `orderItems` + descuento de stock + movimiento financiero en la cartera correcta, visible en `OrdersPage`/`FinanzasPage` del admin.
- [ ] Prueba del caso de **stock insuficiente**: confirmar una venta que exceda el `stockLocal` de algún ítem → verificar que se rechaza (400) sin dejar `order`, movimiento de stock ni movimiento financiero parciales.
- [ ] **Verificación de fuente única de stock**: confirmar que el `stockLocal` que muestra la PWA después de una venta/entrada coincide exactamente con el que muestra `StockPage` en el panel admin — no debe haber ningún paso de sincronización, es la misma fila.
- [ ] Contrastar el comportamiento real de la app contra `mockups.html`, pantalla por pantalla.

## Criterios de aceptación

- Todos los criterios de aceptación listados en `overview.md` están verificados manualmente en un celular real (navegador), no solo con tests automatizados.
- Ningún flujo deja datos parciales o inconsistentes ante un error de red o de validación.
- Nada de lo implementado en esta app duplica o desincroniza el catálogo/stock que ya usa la tienda online.

## Dependencias

- **La bloquean**: Fases 01 a 05, todas completas. (Fase 06 está diferida y no bloquea esta fase.)
- **Bloquea**: el cierre del ticket T23.
