# Tarea 4 — Auth del comprador: `requireCustomerAuth` + login Google en la tienda

**Estado:** ✅ Hecha (2026-07-09) — suite 10/10 PASS + Google real verificado en navegador (login como cuenta secundaria "Patricia": redirect, vuelta, "Hola, Patricia", customer creado)
**Depende de:** [01-setup-google-mp.md](01-setup-google-mp.md), [02-schema-checkout.md](02-schema-checkout.md)

## Objetivo

El segundo tipo de principal del sistema: el comprador. Mismo JWT de Supabase que el admin, pero resuelto contra `customers` con **upsert por tienda** — el mismo Google account es un customer independiente en cada tienda.

## Pasos

### Backend

- [x] `plugins/auth.ts` refactorizado: `verifyToken()` compartido (JWKS + issuer/audience) + `resolveCustomer()` con upsert por `(orgId, googleSub)` (nombre del `user_metadata.full_name`, carrera atajada por la unique + reselect); decora `request.customer`. `resolveStoreBySlug` movido a `catalogConfig/service.ts` (lo comparten público/portal/checkout).
- [x] `GET /portal/:slug/me` — crea el customer en el primer uso
- [x] `PATCH /portal/:slug/me` — name/phone/address (el checkout lo consume)
- [x] Documentado en el código: admin y customer son tablas separadas; el mismo JWT resuelve en cada grupo de rutas sin heredar permisos. Nota: cualquier JWT válido de Supabase sirve en el portal (la política "solo Google" es de UI) — los tests usan password grant por eso.

### Frontend (tienda)

- [x] `CustomerAuthContext` por tienda: sesión + `me`, refetch en `onAuthStateChange` (cubre la vuelta del OAuth)
- [x] Topbar: "Ingresar con Google" → `signInWithOAuth` con `redirectTo` a la tienda; logueado → "Hola, <nombre>" + Salir (el link a Mis pedidos llega en T8)

## Definition of Done

- [x] Suite 10/10: 401 sin token, 404 slug inexistente, upsert sin duplicados, **mismo usuario = customer distinto en cada tienda** (2 filas), PATCH persiste, perfil sin `googleSub`/`orgId`, Swagger
- [x] En navegador: login con Google real desde la tienda (redirect y vuelta) — verificado por el usuario
- [x] Rutas en `/docs`; `tsc --noEmit` limpio
