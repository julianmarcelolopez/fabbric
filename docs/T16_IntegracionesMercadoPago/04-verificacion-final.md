# Tarea 4 — Definition of Done de T16

**Estado:** ⬜ Pendiente
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar T16 con el criterio de `docs/plan_2.md`: *con el access token + webhook secret de una cuenta de prueba de Mercado Pago pegados en Integraciones, una compra en esa org pega en `/webhooks/mercadopago/:slug`, valida con el secreto de esa org, y la preferencia se crea con el token de esa org. Una org que NO configuró nada sigue funcionando igual que hoy*.

## Checklist final (usuario, en navegador + prueba real)

- [ ] Pegar access token + webhook secret de una **cuenta de prueba** de Mercado Pago (org de prueba, no la demo de Eliathi Modas) en Integraciones → se guarda; el GET posterior muestra el token enmascarado, nunca completo; en la DB el valor está cifrado, no en texto plano.
- [ ] Copiar la URL de webhook mostrada y configurarla en la cuenta de prueba de Mercado Pago.
- [ ] Hacer una compra de prueba en esa org → la preferencia se crea con el token de la org (no el de plataforma) → el webhook llega a `/webhooks/mercadopago/:slug`, valida con el secreto de esa org, y marca el pedido `paid`.
- [ ] **La demo de Eliathi Modas (sin nada configurado) sigue comprando exactamente igual que hoy** — mismo `notification_url`, mismo token de plataforma, sin pasar por la ruta nueva. Confirmado con una compra real o de prueba en esa org específica, no solo inferido por lectura de código.
- [ ] Botón "Desconectar" limpia las credenciales y la org vuelve al comportamiento de plataforma.
- [ ] `ENCRYPTION_KEY` está configurada en EasyPanel (backend) antes de probar — sin ella, `encrypt`/`decrypt` tiran error al guardar/leer credenciales.
- [ ] Consola limpia; typecheck limpio en los 3 workspaces.
- [ ] **Bonus del deploy**: la prueba con MP real ya no necesita túnel de cloudflared — el backend deployado ya es públicamente alcanzable, la URL de webhook real apunta directo ahí.

## Resultado

_(completar al verificar)_

## Al cerrar

- [ ] Actualizar README de T16 + memoria; sugerir commit (`feat: t16 integraciones mercado pago`).
- Siguiente: **T17 — Verificación final de la demo**.
