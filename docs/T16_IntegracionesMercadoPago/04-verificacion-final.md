# Tarea 4 — Definition of Done de T16

**Estado:** ⬜ Pendiente
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar T16 con el criterio de `docs/plan_2.md`: *con el access token + webhook secret de una cuenta de prueba de Mercado Pago pegados en Integraciones, una compra en esa org pega en `/webhooks/mercadopago/:slug`, valida con el secreto de esa org, y la preferencia se crea con el token de esa org. Una org que NO configuró nada sigue funcionando igual que hoy*.

## Checklist final (usuario, en navegador + prueba real)

- [ ] Pegar access token + webhook secret de una **cuenta de prueba** de Mercado Pago en Integraciones → se guarda; el GET posterior muestra el token enmascarado, nunca completo.
- [ ] Copiar la URL de webhook mostrada y configurarla en la cuenta de prueba de Mercado Pago.
- [ ] Hacer una compra de prueba en esa org → la preferencia se crea con el token de la org (no el de plataforma) → el webhook llega a `/webhooks/mercadopago/:slug`, valida con el secreto de esa org, y marca el pedido `paid`.
- [ ] Una org SIN credenciales propias sigue comprando igual que siempre (webhook global, token de plataforma) — regresión cero sobre T6/T9.
- [ ] Botón "Desconectar" limpia las credenciales y la org vuelve al comportamiento de plataforma.
- [ ] Consola limpia; typecheck limpio en los 3 workspaces.

## Resultado

_(completar al verificar)_

## Al cerrar

- [ ] Actualizar README de T16 + memoria; sugerir commit (`feat: t16 integraciones mercado pago`).
- Siguiente: **T17 — Verificación final de la demo**.
