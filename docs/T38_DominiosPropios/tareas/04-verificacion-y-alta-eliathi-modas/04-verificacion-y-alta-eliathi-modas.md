# Tarea 4 — Alta de Eliathi Modas + verificación end-to-end

**Estado:** 🔶 Parcial. Hecho: `eliathimodas.com` cargado como
`customDomain` (SQL directo contra la DB real), y verificado con `curl`
contra el backend en Docker (`/public/stores/by-domain` resuelve
`eliathimodas.com` y `www.eliathimodas.com` al slug correcto; CORS deja
pasar el origin real y rechaza uno no registrado). `tsc --noEmit` y
`vite build` limpios en `frontend/`.

**Falta — acciones del usuario, no código:**
- EasyPanel: agregar `eliathimodas.com`/`www.eliathimodas.com` al
  servicio `fabbric-frontend`.
- Supabase Auth: agregar el dominio a la allowlist de redirect URLs.
- Verificación visual real en navegador (local con `/etc/hosts` o ya en
  producción) de todo el checklist de abajo.

**Depende de:** Tarea 2, Tarea 3.

## Objetivo (según `plan.md`, T38/Fase 4)

Dejar `eliathimodas.com` funcionando en producción como dominio propio
real de la tienda, verificado de punta a punta antes de darlo por
cerrado.

## Alcance

- Cargar `eliathimodas.com` (y `www.eliathimodas.com`) como
  `customDomain` de la org de Eliathi Modas — instrucción SQL directa
  contra la DB real (mismo criterio que otras cargas puntuales de esta
  sesión, ver `docs/T37_FixesSesionDemoEnVivo/`), no por UI.
- Verificación LOCAL simulando el host antes de tocar producción: editar
  `/etc/hosts` (mapear `eliathimodas.com` a `127.0.0.1` o a la IP del
  Docker local) o mandar el header `Host: eliathimodas.com` a mano
  (curl/Postman) contra el backend en Docker.
- EasyPanel: agregar `eliathimodas.com` y `www.eliathimodas.com` como
  dominios del servicio `fabbric-frontend`, apuntando al mismo contenedor
  que `fabbric.aivance.cloud` (acción manual del usuario en el panel, no
  código).
- Supabase Auth: agregar `https://eliathimodas.com/**` (y la variante
  `www`) a la allowlist de redirect URLs — paso operativo, no código.
- Confirmar en el navegador real (no solo curl): `eliathimodas.com`
  muestra la tienda en `/`, navega catálogo/categorías/producto, el login
  con Google funciona, y una compra de prueba completa el checkout con
  Mercado Pago.
- Repasar que `fabbric.aivance.cloud/store/eliathi-modas` sigue
  funcionando idéntico a como funcionaba antes de T38.

## Criterio de aceptación

- Checklist completo de arriba, verificado en navegador real (no solo
  tipos/curl).
- `fabbric.aivance.cloud/store/eliathi-modas` sin regresión.
- Checklist genérico "para dar de alta futuros dominios de otros
  clientes" (ver `plan.md`) queda redactado y es el mismo que se siguió
  acá.

## Dependencias

- **La bloquean:** Tarea 2, Tarea 3.
- **Bloquea:** ninguna.
