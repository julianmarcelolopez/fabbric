# Tarea 3 — Dashboard: panel de 2 series "Catálogo vs Personalizado"

**Estado:** ✅ Hecha — verificada en vivo por el usuario en `/admin`
(Dashboard).

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/03)

Ningún mockup cubre este caso (`01-dashboard.html` solo mockea paneles de
una sola serie, que heredan el coral default de `.dash-bar-fill` sin
necesitar color inline). `DashboardPage.tsx` sí tiene un panel real de 2
series ("Catálogo vs Personalizado") que necesita dos colores
distinguibles — borrar el inline sin más los dejaría a los dos del mismo
coral. Ver el análisis completo en `analisis.md` sección 5.

## Pasos

- [x] `DashboardPage.tsx:216` (barra "Catálogo"): `background: "#2563eb"`
      → `background: "#F07058"` (coral).
- [x] `DashboardPage.tsx:225` (barra "Personalizado"): `background:
      "#7c3aed"` → `background: "#1E2A4A"` (navy) — se reusan los dos
      únicos colores de marca ya existentes, no se inventa un tercero.
- [x] `DashboardPage.tsx:246` (3 barras de "Ventas por canal", antes todas
      `#0891b2`): se sacó el `background` inline sin reemplazo — hereda el
      coral default de `.dash-bar-fill` (ya definido en `admin.css` tras
      la Tarea 1). Confirmado que esto no es una regresión: las 3 barras
      ya eran del mismo color entre sí.
- [x] Hallazgo adicional durante la verificación (no estaba en el plan
      original): `ADMIN_ORDER_STATUS` (`types.ts:171-172`, usado en
      `DashboardPage.tsx:175` para el badge de "Últimos pedidos" y también
      en `OrdersPage.tsx`) tiene `#1d4ed8`/`#7c3aed` — coincide con el
      viejo accent pero es un semáforo categórico de 6 estados de pedido,
      no el accent interactivo. **Se deja sin cambios**, documentado en
      `analisis.md` sección 9bis. El panel "Ingresos y egresos (últimos 6
      meses)" también se revisó — usa `MOVEMENT_TYPE_UI.income/expense.color`
      (verde/rojo semántico, `types.ts:325-326`), no un hex propio — no
      necesita cambios.

## Cómo se verificó

`npx tsc --noEmit` limpio. Verificación visual en vivo por el usuario en
`/admin` (Dashboard, sección "Paneles"): "Catálogo vs Personalizado"
muestra "Catálogo (16 u.)" en coral y "Personalizado (2 u.)" en navy,
claramente distinguibles; "Ventas por canal" muestra las barras en coral,
consistente.

## Definition of Done

- [x] En "Catálogo vs Personalizado" las dos barras se distinguen a simple
      vista (coral vs. navy).
- [x] En "Ventas por canal" las 3 barras se ven coral — mismo nivel de
      distinción entre sí que antes del cambio (ninguno, por diseño ya
      existente, no por este cambio).
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
