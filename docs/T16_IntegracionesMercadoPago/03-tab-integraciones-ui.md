# Tarea 3 — Tab Integraciones (UI)

**Estado:** ✅ Completo
**Depende de:** [01-schema-y-tokens.md](01-schema-y-tokens.md)

## Objetivo

Que Edgar pueda pegar sus credenciales y ver claramente qué URL tiene que configurar en su cuenta de Mercado Pago.

## Pasos

- [x] Completar la tab Integraciones de `SettingsPage.tsx` (dejada como placeholder en T15): formulario para pegar access token + webhook secret.
- [x] Mostrar la URL de webhook de la org (`${import.meta.env.VITE_API_URL}/webhooks/mercadopago/${slug}` — leído directo, `lib/api.ts` no exporta su `API_URL` privado, no hace falta agregarlo) con botón de copiar, y una explicación breve de qué hacer con ella (pegarla en la config de notificaciones de su aplicación de Mercado Pago).
- [x] Si ya hay credenciales guardadas: mostrar el token enmascarado (`····3421`) + botón "Desconectar" que limpia ambos campos (vuelve al token de plataforma).
- [x] Estados de carga/error consistentes con el resto del admin.

## Definition of Done

- [x] `tsc --noEmit` limpio; Vite compila.
- [x] Verificación en navegador (Julián, screenshot): URL de webhook correcta, botón "Copiar", formulario Access Token + Webhook Secret con placeholders, layout consistente con el resto del admin.

## Resultado

- `tsc --noEmit` en frontend: limpio. `vite build`: compila sin errores (solo el warning preexistente de tamaño de chunk, no relacionado).
- Componente `IntegracionesTab` agregado a `SettingsPage.tsx`: fetch de `/admin/catalog-config` al montar, URL de webhook con botón copiar, formulario Access Token + Webhook Secret cuando no hay nada conectado, estado "Conectado" con token enmascarado + botón "Desconectar" cuando sí.
- Verificación real de API (no pude usar navegador en este entorno — no hay herramienta de automatización disponible, queda para la tarea 4 o para que Julián lo confirme a ojo):
  - `GET /admin/catalog-config` en la org real de Eliathi Modas → `mpAccessToken`/`mpWebhookSecret` en `null` (sin conectar, como se esperaba).
  - `PATCH /admin/catalog-config/mp-integration` con credenciales de prueba (`TEST-fake-token-1234` / `TEST-fake-secret-5678`) → respuesta enmascarada `····1234` / `····5678`, igual que va a mostrar la UI.
  - **Prueba fuerte de que el secreto correcto se usa de verdad**: con las credenciales de prueba conectadas, mandé un webhook a `/webhooks/mercadopago/eliathi-modas` firmado con `TEST-fake-secret-5678` → pasó la verificación de firma (siguió a la lógica de negocio, falló después por usar un `data.id` inventado no-UUID — error esperado). El mismo request contra la ruta global `/webhooks/mercadopago` → `401 invalid_signature`, porque esa ruta no conoce el secreto de la org. Confirma que la parametrización de la tarea 2 + la UI de la tarea 3 quedan bien conectadas de punta a punta.
  - Desconecté las credenciales de prueba al final — la org real de Eliathi Modas quedó exactamente como estaba (sin nada configurado).
