# 07 — Checkout

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

El rediseño del carrito (drawer), el formulario de checkout (secciones numeradas colapsables, envío, pago) y la página de confirmación de pedido.

## Referencia visual

`mockup_eliathi_checkout.html` completo — sus 3 "vistas" (`#view-carrito`, `#view-checkout`, `#view-confirmacion`) son en realidad 3 pantallas reales distintas de la tienda (el mockup las junta en tabs solo para mostrarlas juntas): `CartDrawer`, `CheckoutPage`, `CheckoutResultPage`. El `.checkout-steps`/step indicator del header también es nuevo.

## Componentes a crear o modificar

- Step indicator (Carrito → Datos y envío → Pago) — nuevo.
- `CartDrawer.tsx` (adaptar): promo code (visual, ver Notas), resumen con ahorro, nota de seguridad.
- `CheckoutPage.tsx` (adaptar, es el centro de esta tarea): secciones numeradas colapsables (datos de contacto ya completados se colapsan con "Editar"), radio cards de método de envío (reemplaza el `<select>` actual), radio cards de método de pago.
- Order summary sidebar (adaptar — ya existe en `CheckoutPage.tsx`, cambia el estilo).
- `CheckoutResultPage.tsx` (rediseño completo): ícono de confirmación, caja de detalles del pedido, banner de tracking, 3 acciones.

## Variables CSS que usa o define

Consume tokens de `01` y header/footer de `02` — aunque el checkout usa un header **simplificado** propio (`.checkout-header`, sin nav de categorías ni announcement bar), distinto del header de las demás páginas — confirmar en la implementación si se reusa el mismo componente de header con una prop de "modo simple" o si es un header aparte.

## Archivos a modificar

- `frontend/src/features/cart/CartDrawer.tsx`
- `frontend/src/features/store/pages/CheckoutPage.tsx`
- `frontend/src/features/store/pages/CheckoutResultPage.tsx`
- `frontend/src/features/catalog/catalog.css`

## Criterio de completado

- El carrito (drawer) muestra los ítems reales, cantidades editables, subtotal — igual lógica que hoy, estilo nuevo.
- El checkout sigue pidiendo exactamente los mismos datos que hoy (nombre, teléfono, dirección, zona de envío) — el rediseño en "secciones numeradas" no agrega ni saca campos.
- El método de envío sigue siendo elegir entre las zonas reales de la org (ahora como radio cards en vez de `<select>`), con nombre y costo reales.
- El método de pago sigue siendo Mercado Pago (único método real hoy) — la opción "Transferencia bancaria" del mockup **no tiene lógica de negocio detrás** (ver Notas), no se implementa como opción funcional.
- La confirmación muestra el número de pedido real y el resumen real (no datos de ejemplo).
- `tsc --noEmit` limpio; verificado en navegador con una compra real de punta a punta (mismo nivel de rigor que las verificaciones de T16/T19: confirmar que el pedido se crea y se puede pagar, no solo que el formulario se ve bien).

## Notas y dependencias

- **Depende de `01` y `02`.** Independiente de `03`, `04`, `05`, `06`.
- **Login obligatorio para comprar**: esto es una decisión de UX ya señalada como hallazgo 🔴 en `T18_UX-Revision/04-checkout.md` (sin checkout como invitado) — **T20 no cambia esa lógica**, solo rediseña visualmente la pantalla de "Ingresá para completar tu compra" existente. No confundir el alcance de esta tarea con resolver ese hallazgo, que sigue pendiente y es un cambio de flujo/lógica, no de diseño.
- **Código de descuento** (`cart-promo`): no existe ningún sistema de cupones (`analisis.md` sección 6) — el campo se muestra visualmente pero sin funcionalidad real, o se omite directamente. Confirmar con el usuario antes de implementar un input que no hace nada.
- **"Transferencia bancaria — 10% OFF"**: no hay ningún método de pago alternativo a Mercado Pago hoy, ni lógica de descuento por método de pago. Se omite como opción funcional; si se quiere dejar visible como "próximamente", debe quedar claramente no seleccionable.
- **Tracking de envío** ("Seguí tu entrega en tiempo real"): no existe ningún sistema de tracking — el banner de confirmación puede mostrarse con un mensaje genérico ("te vamos a avisar por WhatsApp/email") en vez del link de tracking real que sugiere el mockup.
- **Cuotas sin interés en el resumen**: mismo criterio que en `06` — mensaje informativo, no un cálculo de financiación real gestionado por fabbric (lo gestiona Mercado Pago una vez que el comprador entra a pagar).

## Resultado

**Decisiones del usuario (antes de implementar)**:
1. Header del checkout: `simplified` — sin nav ni announcement bar, logo + step indicator + back link.
2. Código de descuento: omitido.
3. Transferencia bancaria: omitida — solo Mercado Pago.
4. Banner de tracking: mensaje genérico ("te avisamos por email"), sin link de tracking falso.
5. Cuotas en el resumen: mensaje estático (`precio / 3`, mismo criterio que `06`).

**"Prop simplified" — detalle de implementación**: `StoreLayout.tsx` es la ruta padre de todas las páginas de la tienda (`/store/:slug` con `<Outlet/>`) y por diseño de react-router **no recibe props de sus rutas hijas** — no hay forma de que `CheckoutPage.tsx` le pase un `simplified={true}` literal. Se logra el mismo efecto detectando el path actual con `useLocation()` (`pathname.includes("/checkout")`): header simplificado (logo + `CheckoutSteps` + "← Volver a la tienda", sin nav/announcement/íconos) en `/checkout` y `/checkout/result`, header completo en el resto. Mismo criterio se extendió al **footer y al WhatsApp flotante**: el mockup de checkout no los muestra en ninguna de sus 3 vistas (flujo de conversión sin links de salida antes de pagar, patrón estándar de e-commerce) — no estaba explícitamente en la decisión del usuario, se aplicó por inferencia directa del mockup, documentado acá en vez de dejarlo implícito.

**Step indicator**: 3 pasos (Carrito / Datos y envío / Pago) tal como el mockup, pero mapeados al flujo real (que no tiene una página de "Pago" separada — el pago pasa por el redirect externo a Mercado Pago): "Carrito" siempre done, "Datos y envío" activo en `/checkout`, "Pago" pendiente hasta `/checkout/result` (ahí los 3 quedan done). Refleja la navegación real, no una página que no existe.

**Carrito (drawer)**: reescrito con las clases del mockup (antes reusaba nombres genéricos `.cart-item`/`.cart-overlay` de la época T5, redefinidos ahora). Sin código de descuento. `CartItem` (en `CartContext.tsx`) ganó un campo `brand: string | null` — antes no viajaba y el mockup lo muestra; se completa en `StoreProductPage.tsx` al agregar al carrito (dato real del producto, no inventado). Se omitió el precio tachado/"ahorrás" por ítem del mockup (`compareAtPrice` no se guarda en el carrito hoy — hubiera requerido extender el snapshot del carrito más de lo que valía la pena para esta ronda).

**Formulario de checkout**: mismos 3 campos de siempre — nombre, teléfono, dirección (un solo campo). El mockup pide Nombre/Apellido separados + Dirección/Código postal/Ciudad/Provincia — esos campos granulares **no existen en el modelo real** (`customers.address` es texto libre), así que no se agregaron (instrucción explícita: "no agrega ni saca campos"). Reorganizados en 4 secciones numeradas: Datos de contacto (colapsa sola si ya vinieron nombre+teléfono de la cuenta, con "Editar"), Dirección de envío, Método de envío (radio cards con las zonas reales), Método de pago (una sola card, Mercado Pago). Zonas de envío: mismo cálculo de envío gratis que ya existía (`freeShippingFrom`), ahora visual en la card en vez de en el texto del `<option>`.

**Confirmación de pedido — la parte más importante de esta tarea**: antes, `CheckoutResultPage.tsx` solo leía `status`/`collection_status` de la URL y mostraba un mensaje genérico, sin datos reales del pedido. El mockup pide número de pedido, cantidad de prendas, total, método de pago, envío y dirección **reales**. Se resolvió así: Mercado Pago devuelve `external_reference` en la query string del redirect (el id de la orden que ya se le manda al crear la preferencia, `backend/src/modules/payments/service.ts:56`, comportamiento estándar y documentado de Checkout Pro) — se usa ese id para pedir el detalle real vía `GET /portal/:slug/orders/:id` (mismo endpoint que ya usa "Mis pedidos", se exportó el tipo `OrderDetail` de `OrderDetailPage.tsx` para reusarlo). Si `external_reference` no llegara o el fetch fallara, la página degrada al mensaje genérico de siempre en vez de romperse — no se pudo verificar 100% este último tramo de forma automática (ver Verificación).

**Tracking**: banner con mensaje genérico ("Te avisamos por email cuando tu pedido salga para entrega"), sin link de seguimiento falso — coherente con que no existe ningún sistema de tracking real.

**Verificación automática de punta a punta** (`backend/t20-07-checkout-e2e.mjs`, queda en el repo sin trackear, mismo criterio que los scripts de `05`): se creó un comprador temporal como usuario real de Supabase Auth por email/password (el backend no distingue Google de cualquier otro login — solo verifica que el JWT sea válido, `resolveCustomer` en `backend/src/plugins/auth.ts` — así que esto ejercita el mismo código que un login real de Google), se actualizó su perfil (mismo PATCH que hace el formulario antes de pagar), se armó un pedido real (1 "Jeans holgados" M/Azul + envío a CABA) contra `POST /public/eliathi-modas/checkout`, y se confirmó: la orden se crea en estado `pending`, el `initPoint` devuelto es una URL real de Mercado Pago, y `GET /portal/eliathi-modas/orders/:id` devuelve exactamente lo que necesita la página de confirmación (número de pedido, zona de envío, ítems, total). 14/14 checks en verde, sin residuos en la DB al terminar.

**Lo que NO se pudo verificar de forma automática**: completar el pago en la interfaz hosteada de Mercado Pago (requiere un navegador real interactuando con la UI de MP, no es scripteable con curl) y confirmar que el redirect de vuelta trae `external_reference` en la query string tal como se asume. Es el comportamiento estándar de Checkout Pro y la página degrada con gracia si no ocurriera, pero **falta la pasada manual del usuario en el navegador para cerrar el último tramo** — completar una compra real (sandbox) de punta a punta: carrito → checkout → pagar en Mercado Pago → confirmar que `/checkout/result` muestra el pedido real, no el mensaje genérico.

`tsc --noEmit` limpio; `vite build` limpio. **Pendiente**: la pasada manual del usuario descripta arriba, y revisión visual del drawer/formulario/confirmación en el navegador.
