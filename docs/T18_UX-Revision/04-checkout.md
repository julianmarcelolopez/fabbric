# 04 — Checkout

## Objetivo del usuario

Que un comprador que ya eligió su producto pueda pagar y quedarse tranquilo de que su compra se procesó, con la menor cantidad de pasos posible.

## Mapa del flujo actual

1. Click "🛒 Carrito" (o "Agregar al carrito" desde la ficha) → `CartDrawer`: ver ítems, ajustar cantidad, subtotal → "Iniciar compra".
2. `/store/:slug/checkout` (`CheckoutPage`): **si no hay sesión de Google iniciada, el formulario ni siquiera se muestra** — se reemplaza por "Ingresá para completar tu compra" + botón "Ingresar con Google". Es obligatorio, no hay checkout como invitado.
3. Ya logueado: completa Nombre/Teléfono/Dirección (prellenados solo si ya compró antes en esta tienda) + elige Zona de envío (select) + nota opcional → "Pagar con Mercado Pago".
4. Redirect a Mercado Pago (fuera del sitio) → el comprador paga ahí.
5. Vuelve a `/store/:slug/checkout/result` (`CheckoutResultPage`) — mensaje según el estado devuelto por MP (aprobado / en proceso / no completado), con link a "Mis pedidos" y "Volver a la tienda". El estado real de la orden lo termina de confirmar el webhook (asíncrono, el comprador no lo ve).
6. Puede volver cuando quiera a `/store/:slug/portal/orders` (`MyOrdersPage`, requiere estar logueado) para ver el estado actualizado de sus pedidos.

## Puntos de fricción

### 🔴 [ALTO] Login con Google es obligatorio para comprar — no existe checkout como invitado
**Dónde:** `CheckoutPage.tsx` — si `!me`, todo el formulario de checkout se reemplaza por "Ingresá para completar tu compra" + botón de Google, incluso después de haber armado el carrito.
**Qué pasa:** no hay ninguna forma de pagar sin antes crear/usar una cuenta de Google — se exige justo en el último paso, después de que el comprador ya invirtió tiempo eligiendo talle/color y llegando hasta acá.
**Por qué importa:** el checkout como invitado es uno de los factores más documentados de abandono de carrito en e-commerce en general. Para el público objetivo — clientes que hoy compran por WhatsApp, donde nunca se "loguean" con nada — pedir una cuenta de Google en el paso final agrega fricción justo antes de pagar, el peor momento posible para perder una venta.
**Solución propuesta:** evaluar un checkout como invitado (nombre/teléfono/dirección sin cuenta), dejando el login de Google como algo opcional para quien quiera ver "Mis pedidos" después — no como requisito para poder comprar.

### 🔴 [ALTO] La confirmación por email no llega al comprador real, pero el sistema se la promete
**Dónde:** `CheckoutResultPage.tsx` (mensaje "Tu pago fue aprobado. Te va a llegar la confirmación en breve.") vs `backend/src/lib/email.ts` (envío vía Resend, con modo degradado si falta la API key; en el modo de prueba de Resend, según lo verificado en T7, el envío a direcciones que no son la del dueño de la cuenta devuelve 403 y solo queda logueado, no se entrega).
**Qué pasa:** el comprador ve una promesa explícita de que le va a llegar un email, y en el estado actual de configuración esa promesa no se cumple para compradores reales — no hay ningún otro canal (ni WhatsApp automático, ni notificación push) que la respalde.
**Por qué importa:** es una promesa rota silenciosa justo después de pagar — el momento en que más tranquilidad necesita el comprador de que su compra se procesó. Sin el email y sin haberlo buscado activamente en "Mis pedidos", no tiene ninguna confirmación tangible.
**Solución propuesta:** mientras el envío de email no esté resuelto para producción, no prometer el email en el copy — reforzar en cambio "Mis pedidos" (que si funciona siempre) como la fuente de verdad, con un link bien visible en la misma pantalla de resultado (ya existe, pero podría destacarse más que "volver a la tienda").

### 🟡 [MEDIO] Sin zona de envío configurada, el comprador queda en un error sin salida, en el peor momento posible
**Dónde:** `CheckoutPage.tsx` — `"La tienda no configuró zonas de envío todavía."` en rojo, sin ninguna alternativa de contacto.
**Qué pasa:** si la org no cargó ninguna zona de envío (ver hallazgo relacionado en `02-panel-admin.md`), el comprador que ya armó su carrito y llegó al checkout se encuentra con un error genérico, sin ningún link de contacto (WhatsApp) para poder resolver la compra por otra vía.
**Por qué importa:** es el mismo problema estructural que en el panel admin, pero visto del lado del comprador — justo cuando ya decidió comprar, sin ninguna salida ofrecida.
**Solución propuesta:** agregar un link de WhatsApp junto al mensaje de error, igual que se sugiere para el estado vacío del home en `03-catalogo-publico.md`.

### 🟢 [BAJO] El login social no acorta tanto el formulario como promete
**Dónde:** `CheckoutPage.tsx` — Nombre/Teléfono/Dirección se prellenan con `me.name`/`me.phone`/`me.address` solo si ya existen (compras anteriores en esa tienda); en la primera compra, los tres siguen siendo obligatorios y vacíos.
**Qué pasa:** Google solo aporta identidad (nombre/email) — no dirección ni teléfono — así que en la primera compra el "beneficio" del login social es únicamente evitar escribir una contraseña, no acortar el formulario.
**Por qué importa:** expectativa vs. realidad menor — no bloquea la compra, pero el login social suele asociarse a "menos formulario" y acá no cumple del todo esa promesa en la primera compra.
**Solución propuesta:** ninguna acción de código necesaria — es más una nota de expectativas a tener en cuenta si en algún momento se evalúa mostrar un mensaje tipo "completá tus datos, los vamos a recordar para la próxima".

## Quick wins

- Agregar un link de WhatsApp junto al error "La tienda no configuró zonas de envío todavía." en el checkout.
- Ajustar el copy de `CheckoutResultPage` para no prometer un email que hoy no llega — reforzar "Mis pedidos" como la fuente de verdad.
- Destacar visualmente el link a "Mis pedidos" en la pantalla de resultado (hoy tiene el mismo peso visual que "Volver a la tienda").

## Mejoras estructurales

- Evaluar checkout como invitado (sin login obligatorio), con el login de Google como opción para quienes quieran historial de pedidos — es el cambio de mayor impacto potencial en tasa de conversión de todo el checkout.
- Resolver la entrega real de emails transaccionales a compradores (fuera del alcance de este análisis de UX en sí, pero condiciona directamente si el copy de confirmación puede ser honesto).
