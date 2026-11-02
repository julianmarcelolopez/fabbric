# Status — T40 Buscador antes que "Nuevo producto"

Ver el problema y la propuesta completa en
[`specs/T40_BuscadorProductosAdmin.md`](specs/T40_BuscadorProductosAdmin.md)
y el plan de implementación + mockup visual en
[`plan.md`](plan.md).
Este archivo es solo el estado — se actualiza a medida que avanza, sin
repetir el análisis.

## Estado general: 🔶 Implementado, falta verificación visual

| Paso | Estado |
|---|---|
| Diagnóstico del layout actual | ✅ Hecho |
| Propuesta de diseño (buscador arriba, alta como botón) | ✅ Aprobada por el usuario |
| Mockup visual interactivo (Antes/Después) | ✅ Hecho — ver `plan.md` |
| Implementación en `ProductsPage.tsx` | ✅ Hecho |
| Verificación en navegador | ⬜ Pendiente |

## Implementación (2026-11-02)

`frontend/src/features/admin/pages/ProductsPage.tsx`:

- "Nuevo producto" ya no es una tarjeta siempre abierta — es un botón
  `+ Nuevo producto` (alineado a la derecha, arriba de la lista) que abre
  un modal con el mismo formulario y la misma lógica de `create()` de
  siempre, sin tocarla. El modal se cierra con "Cancelar" o clic afuera.
- **Ajuste respecto al plan original**: el botón quedó dentro de
  `ProductsList` (no en el `<h1>` que maneja el componente padre
  `ProductsPage`) para no tener que levantar `categories`/`create()`/el
  estado del formulario al padre solo por la posición — visualmente cae
  igual, justo debajo del título y las tabs, que es lo que importaba del
  pedido original.
- El buscador pasa a su propia fila, primero, con ícono de lupa y más
  padding/tamaño de fuente — ya no comparte fila con los `<select>` de
  filtro.
- Los filtros (categoría/marca/estado/visible/orden) quedan en la fila de
  abajo, con `fontSize: 13` para que pesen visualmente menos que el
  buscador.

Sin cambios en `create()`, el `useMemo` de `visibleProducts`, paginación,
ni las columnas de la tabla (incluida "Código de barras" de T39).

**Verificación**: `tsc --noEmit` y `vite build` limpios. `backend`/
`frontend` corriendo en Docker (bind-mount, los cambios ya están
disponibles sin rebuild) — falta que el usuario lo confirme en el
navegador.
