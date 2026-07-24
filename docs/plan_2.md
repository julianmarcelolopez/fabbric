# Plan 2 — Demo para Eliathi Modas

> Adenda a `docs/plan.md` (el plan aprobado del MVP de fabbric, ya completo). Este documento no reabre esas 10 fases — define el recorte puntual de trabajo para preparar una versión de demo mostrable a Edgar Silguero (Eliathi Modas), a partir del gap analysis de `docs/analisis-negocio.md`.

## Contexto

`docs/analisis-negocio.md` comparó los requerimientos reales del negocio de Edgar (hoy vendiendo por WhatsApp Business + Instagram + Facebook Marketplace) contra el estado del código de fabbric. De ese diagnóstico surgieron varios gaps; este documento decide, **para la demo específicamente** (no para producción con plata real), cuáles vale la pena cerrar ahora y cuáles quedan para más adelante — priorizando lo que Edgar va a *ver y evaluar* por sobre lo que solo importa una vez que el sistema mueva plata real.

## Decisiones de alcance para esta demo

- **Checkout**: se mantiene el modelo de cobro automático vía Mercado Pago tal cual está hoy (sin modelo "solicitud → confirmación manual" del lado del cliente) — esa es la diferencia de comportamiento más grande frente a como opera hoy en WhatsApp, pero no bloquea evaluar el resto del sistema en una demo. Lo que **sí** se agrega es que ese cobro pueda entrar a la cuenta de Mercado Pago propia de Edgar en vez de la de la plataforma — ver punto 4.
- **Importación Excel/CSV**: fuera de esta demo. Se cargan unos pocos productos a mano; el importador es una mejora de operación para cuando cargue el catálogo completo, no cambia lo que Edgar ve.
- **Identidad visual**: placeholder prolijo (tipografía + paleta + wordmark de texto), no el logo/diseño gráfico definitivo de Eliathi Modas — eso es trabajo de diseño aparte.
- **Precio con descuento**: SÍ se agrega. Es el patrón central del catálogo de WhatsApp que Edgar ya usa ("Ahorrás $X"), barato de construir, alto impacto visual.
- **Marca**: SÍ se agrega, como campo de texto libre en `products` — no una tabla propia con su CRUD. No es redundante con `categoryId` (rubro: Ropa Hombre, Calzado...) ni con `collections` (curaduría m2m tipo "Ofertas"): es un eje ortogonal, 1 marca por producto, mientras que categoría es 1-por-producto para navegación y colecciones son m2m para curaduría editorial. Meter marca dentro de categoría rompería la taxonomía existente (explotaría en combinaciones "Calzado Adidas", "Calzado Puma", etc.).
- **Zonas de envío + usuario admin**: se cargan como datos sobre lo que ya existe (`shipping_zones` CRUD, sistema de roles) — cero desarrollo.
- **Configuración → Integraciones (Mercado Pago propia de Edgar)**: SÍ se agrega, pero con el enfoque simple (token pegado a mano + URL de webhook propia por org), no OAuth — ver punto 4 y el detalle de por qué en "Fuera de alcance".
- **Configuración → Usuario**: SÍ se agrega, tab informativo simple (email/rol/organización) — sin edición, sin sistema de roles nuevo.

## Fuera de alcance (post-demo — solo si esto pasa a producción real)

- **Mercado Pago modo marketplace vía OAuth**: la forma "prolija" de conectar cuentas (botón "Conectar con Mercado Pago", redirect, sin que Edgar copie nada) — requiere construir el flujo OAuth completo (redirect/callback/refresh tokens) y posiblemente que Mercado Pago apruebe la aplicación como marketplace (no confirmado). Para esta demo se resuelve con el enfoque manual del punto 4, que no depende de nada de esto.
- **Modelo de pedido "solicitud → confirmación manual"**: decidir si se replica el flujo real de WhatsApp de Edgar (pedido sin cobro inmediato, precio final/envío/forma de pago coordinados por chat) en vez del cobro automático actual.
- **Importación de catálogo vía Excel/CSV**.
- **Tabla propia de marcas**: si en algún momento hace falta filtrar/navegar la tienda por marca, ahí se justifica una taxonomía real (como categorías); hoy no.
- ~~Logo/paleta/tipografía definitivos de Eliathi Modas (diseño gráfico, no código)~~ — **resuelto el 2026-07-24**: el usuario proveyó el logo real (SVG), ya subido a `catalogConfigs.logoUrl` de la org demo. Se agregó soporte de SVG al upload de logo (antes solo JPEG/PNG/WebP) — ver `T13_IdentidadVisual`.
- **Theming por org (fondo/tipografía configurables por tenant)**: la paleta real del logo (fondo `#F7F3EC`, acento `#FF6B4A`) se aplica en T13 pero **hardcodeada en `catalog.css`**, no como campos de `catalog_configs` — a diferencia de `accentColor`, que ya es configurable por org. Para un solo tenant real no se justifica un sistema de temas; el mecanismo (variable CSS inyectada por org, mismo patrón que `--accent`) ya existe y se puede extender el día que haga falta.
- **Tabs "Usuarios/Equipo" y "Notificaciones"** en Configuración: se evaluaron y se descartaron para esta demo (ver discusión — el modelo de roles ya existe pero sin UI de invitación; notificaciones hoy son config de `.env`).
- **Consolidar "Tienda" y "Envíos" como tabs** dentro de Configuración: se decidió dejarlas donde están, como ítems separados del sidebar.
- **Mapa embebido de la dirección**: geocodificar + embeber Google Maps por un beneficio chico frente a mostrar la dirección como texto — no vale la complejidad para esta demo.
- **Estado "abierto/cerrado" en vivo**: o es un toggle manual poco realista (Edgar tendría que acordarse de cambiarlo todo el tiempo) o requiere parsear el horario y calcularlo en base a la hora actual — complejidad real para algo cosmético.

## Trabajo a hacer

### 1. Precio con descuento (`compareAtPrice`)

- `backend/src/db/schema.ts`: columna nueva `compareAtPrice` (integer, nullable, centavos) en `products`.
- Migración (`db:generate` + `db:migrate`).
- `packages/shared/src/schemas/product.ts`: sumar el campo a los schemas de creación/edición.
- `backend/src/modules/products/routes.ts`: incluir en select/insert/update admin.
- `backend/src/modules/public/routes.ts`: incluir en las respuestas públicas (lista + detalle) — si no viaja, la tienda no lo puede mostrar.
- `frontend/src/features/admin/types.ts` + `ProductEditPage.tsx`: campo "Precio anterior (opcional)".
- `frontend/src/features/catalog/ProductCard.tsx` + `ProductDetailView.tsx`: precio tachado + precio actual cuando `compareAtPrice > price`.

### 2. Marca (`brand`)

- `backend/src/db/schema.ts`: columna nueva `brand` (text, nullable) en `products` — misma migración que el punto 1.
- Mismo recorrido que arriba (shared schema, rutas admin y públicas).
- `ProductEditPage.tsx`: campo de texto con `datalist` sugerido (Taverniti, Bross, Adidas, Puma, Eliathi Modas) — mismo patrón que `SUGGESTED_CATEGORIES` en Finanzas.
- `ProductCard.tsx` / `ProductDetailView.tsx`: mostrar la marca junto al nombre del producto.

### 3. Identidad visual placeholder + personalización de header/footer

Toca solo la **tienda pública** (`/store/:slug`) — el panel admin no se reskinea para esta demo. El logo ya se puede subir hoy (`CatalogConfigPage`, endpoint `/admin/catalog-config/logo`) — no es trabajo nuevo.

**Placeholder de identidad:**
- Tipografía más prolija vía Google Fonts, reemplazando el `system-ui` actual en `catalog.css` (sección tienda).
- Paleta: mantener la esencia oscura azul/violeta del banner actual de WhatsApp pero más prolija, usando el `accentColor` ya configurable en `catalog_configs` (sin agregar campos nuevos).
- Wordmark de texto como logo placeholder en `StoreLayout.tsx`: fallback cuando no hay `logoUrl` cargado, con la tipografía nueva (sin asset de imagen).

**Header/footer personalizables** — no un editor de bloques genérico, sino el mismo "Perfil de tienda" que Edgar ya tiene hoy en WhatsApp Business (`docs/analisis-negocio.md`, sección 2), como campos fijos:
- `backend/src/db/schema.ts`: columnas nuevas y nullable en `catalog_configs` — `bannerUrl` (text, imagen de portada del header), `whatsapp` (text), `instagram` (text), `email` (text), `address` (text), `businessHours` (text). Misma migración del punto 4.
- `backend/src/modules/catalogConfig/routes.ts`: sumar los campos de texto al PATCH existente; endpoint de upload de banner igual al de logo (`/admin/catalog-config/banner`), mismo mecanismo ya probado (`@fastify/multipart` → Supabase Storage).
- `packages/shared/src/schemas/catalogConfig.ts` + `backend/src/modules/public/routes.ts`: sumar los campos nuevos al schema y a la respuesta pública de `/public/:slug/config` (footer/header los necesitan del lado de la tienda).
- `CatalogConfigPage.tsx`: nueva sección "Banner" (mismo patrón que el bloque "Logo" ya existente) + campos de texto para WhatsApp/Instagram/mail/dirección/horario.
- `StoreLayout.tsx`: `bannerUrl` se muestra como imagen de portada arriba de la topbar si está cargado (si no, no se renderiza nada — sin banner no rompe el layout); footer agrega botones/links de WhatsApp (`wa.me/<numero>`), Instagram, mail (`mailto:`), dirección y horario cuando estén cargados — mismo patrón condicional que ya usa hoy con `businessDescription`.
- Botón "Compartir" en la topbar (Web Share API con fallback a copiar el link) — no toca el modelo de datos, es puramente de UI.

### 4. Configuración (tabs: Usuario + Integraciones)

Sección nueva en el admin, con navegación por tabs. No reemplaza ni consolida las páginas existentes de Tienda/Envíos (quedan donde están en el sidebar).

**Tab Usuario**: informativo, sin edición — email, rol, organización del admin autenticado (ya disponible vía `/admin/me`, no requiere endpoint nuevo).

**Tab Integraciones (Mercado Pago propia de Edgar)** — el porqué de este diseño:

Hoy hay un único secreto de plataforma (`MP_WEBHOOK_SECRET`, en `.env`) que valida la firma de **todas** las notificaciones que llegan a `/webhooks/mercadopago`, sin importar la org. Si Edgar usa su propia cuenta de Mercado Pago, su secreto de webhook es distinto al de la plataforma — y para saber qué secreto usar hay que saber primero de qué org es la notificación, lo cual normalmente recién se sabe *después* de validar la firma (problema de huevo y gallina). Se resuelve dándole a **cada org su propia URL de webhook** (la URL ya identifica la org, antes de validar nada):

- `backend/src/db/schema.ts`: dos columnas nuevas y nullable en `catalog_configs` — `mpAccessToken` (text) y `mpWebhookSecret` (text). Guardar cifrado (mismo criterio que ya estaba anotado para esto en la hoja de ruta post-MVP de `docs/plan.md`).
- Migración (`db:generate` + `db:migrate`).
- `packages/shared/src/schemas/catalogConfig.ts`: sumar los dos campos al schema de actualización (solo admin, nunca en las respuestas públicas).
- `backend/src/modules/catalogConfig/routes.ts`: PATCH para guardar/actualizar; el GET admin devuelve el token **enmascarado** (ej. `····3421`), nunca completo, una vez guardado.
- `backend/src/modules/payments/webhook.ts`: la ruta pasa a `/webhooks/mercadopago/:slug` (además de mantener `/webhooks/mercadopago` global, para las orgs que no configuraron nada propio — sigue validando con `MP_WEBHOOK_SECRET` de plataforma). Con `:slug` en la URL, la org se conoce **antes** de validar la firma, así que se usa `catalogConfigs.mpWebhookSecret` de esa org (con fallback al secreto de plataforma si la org no cargó uno).
- `backend/src/modules/payments/service.ts` (`createPreference`) y la consulta de pago (`getPayment`): usar `catalogConfigs.mpAccessToken` de la org si existe, si no, el `MP_ACCESS_TOKEN` de plataforma (fallback, no rompe a las orgs que no conectaron nada).
- `frontend/src/features/admin/pages/SettingsPage.tsx` (nuevo, con tabs) → tab Integraciones: formulario para pegar access token + webhook secret; muestra la URL de webhook de la org (`{API_URL}/webhooks/mercadopago/{slug}`) para que Edgar la copie a la configuración de notificaciones de SU aplicación de Mercado Pago; botón "Desconectar" para limpiar ambos campos y volver al token de plataforma.
- Documentar (fuera del código, como instructivo para Edgar) los pasos que tiene que hacer él en el panel de Desarrolladores de Mercado Pago: crear su aplicación, copiar el access token, configurar la URL de notificaciones con el secreto que MP le genera.

## Verificación

- Producto con `compareAtPrice` cargado se ve con precio tachado + precio final en el card y en el detalle, en la tienda pública.
- Producto con marca cargada la muestra junto al nombre; el datalist sugiere las 5 marcas conocidas pero acepta texto libre.
- La tienda pública (`/store/:slug`) se ve con tipografía y paleta coherentes y un wordmark prolijo, sin tocar el panel admin.
- Desde `CatalogConfigPage` se sube un banner y se cargan WhatsApp/Instagram/mail/dirección/horario → aparecen en el header y el footer de la tienda pública; si no están cargados, no rompen el layout (mismo criterio que `businessDescription` hoy). El botón "Compartir" de la topbar funciona (Web Share API o copiar link).
- Las 4 zonas de envío (Almirante Brown, Quilmes, Varela, Lanús) y el usuario admin de Edgar están cargados.
- `/admin/settings` (o la ruta que se defina) muestra las tabs Usuario e Integraciones; Usuario refleja los datos reales de `/admin/me`.
- Con el access token + webhook secret de una cuenta de prueba de Mercado Pago pegados en Integraciones: una compra en esa org pega en `/webhooks/mercadopago/:slug`, valida con el secreto de esa org (no con el de plataforma), y la preferencia se crea con el token de esa org. Una org que NO configuró nada sigue funcionando igual que hoy (fallback a plataforma).
- El token guardado nunca se devuelve completo desde el GET admin (solo enmascarado).
- Typecheck limpio en los 3 workspaces; verificación en navegador antes de dar la demo por lista.
