# Tarea 3 — Tab Integraciones (UI)

**Estado:** ⬜ Pendiente
**Depende de:** [01-schema-y-tokens.md](01-schema-y-tokens.md)

## Objetivo

Que Edgar pueda pegar sus credenciales y ver claramente qué URL tiene que configurar en su cuenta de Mercado Pago.

## Pasos

- [ ] Completar la tab Integraciones de `SettingsPage.tsx` (dejada como placeholder en T15): formulario para pegar access token + webhook secret.
- [ ] Mostrar la URL de webhook de la org (`{API_URL}/webhooks/mercadopago/{slug}`) con botón de copiar, y una explicación breve de qué hacer con ella (pegarla en la config de notificaciones de su aplicación de Mercado Pago).
- [ ] Si ya hay credenciales guardadas: mostrar el token enmascarado (`····3421`) + botón "Desconectar" que limpia ambos campos (vuelve al token de plataforma).
- [ ] Estados de carga/error consistentes con el resto del admin.

## Definition of Done

- [ ] `tsc --noEmit` limpio; Vite compila.
- [ ] Verificación en navegador → tarea 4.
