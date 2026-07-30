# 01 — Flujo crítico

## Objetivo del usuario

Que Edgar (dueño de local, sin experiencia técnica, iPhone) tenga su primer producto visible en la tienda pública y lo pueda compartir en Instagram, lo más rápido posible.

## Mapa del flujo actual

Contado sobre el código real (`router.tsx`, `ProductsPage`, `ProductEditPage`, `VariantEditor`, `HomeSectionsPage`, `StoreLayout`), asumiendo que la cuenta admin ya existe (el alta de organización/usuario la hace la plataforma, no es self-serve):

1. Login (`/admin/login`, email + contraseña) → entra al Dashboard.
2. Dashboard vacío — sin ningún indicador de "qué hacer primero".
3. Va a **Categorías** (sidebar) → completa Nombre (+ Slug autogenerado, editable) → "Crear". *Prerequisito silencioso: sin categoría, "Productos" ni siquiera muestra el formulario de alta.*
4. Va a **Productos** (sidebar) → completa Nombre + Categoría + Precio → "Crear y editar".
5. Cae en la ficha del producto (`/admin/products/:id`) → sube al menos 1 imagen (`ImageDropzone`).
6. En la misma ficha → agrega al menos 1 variante (talle + color + stock) → "Agregar variante". *Sin esto la ficha pública queda con "Sin variantes disponibles" y no se puede comprar.*
7. Guarda los datos del producto (nombre/descripción/precio/marca) → "Guardar cambios".
8. Va a **Home** (sidebar, 9º ítem — lejos de "Productos") → elige la categoría recién creada en el selector → "Agregar". *Sin este paso el producto NO aparece en ningún lugar de la tienda pública, aunque los pasos 3-7 estén perfectos.*
9. Abre `/store/:slug` para confirmar que el producto aparece.
10. Click en el producto → ficha pública (`/store/:slug/p/:id`).
11. Click "🔗 Compartir" → en iPhone Safari abre el share sheet nativo (puede ir directo a Instagram) o copia el link al portapapeles.

**11 pasos reales**, repartidos en 4 pantallas de sidebar distintas y no consecutivas (Categorías → Productos → Home → tienda pública) — muy por encima del principio de "máximo 3 pasos para cualquier tarea crítica". Ninguno de los pasos 3, 6 y 8 tiene una señal visual de que sea un prerequisito antes de llegar a él; el sistema no falla ni avisa, simplemente el producto no aparece.

## Puntos de fricción

### 🔴 [ALTO] El producto no aparece en la tienda sin un paso manual, desconectado y no anunciado: "Home"
**Dónde:** `ProductEditPage.tsx` / `ProductsPage.tsx` vs `HomeSectionsPage.tsx` (`/admin/home`).
**Qué pasa:** la portada de la tienda pública (`/public/:slug/home`, consumida por `CatalogHomePage`) solo muestra productos a través de `home_sections` — una entidad totalmente separada de "producto" o "categoría". Crear una categoría, cargar un producto, subirle imagen y variante no lo hace aparecer en ningún lado: hace falta ir a "Home" (9º ítem del sidebar, después de Stock/Pedidos/Clientes/Finanzas) y agregar manualmente esa categoría como sección. No hay ningún link, tip ni advertencia en Productos o en la ficha del producto que lo mencione.
**Por qué importa:** es el escenario más probable de abandono en el primer uso — Edgar puede hacer todo "bien" (según lo que el sistema le pide en cada pantalla) y aun así, al entrar a su propia tienda, ver una página vacía sin ningún mensaje de error. No hay forma de saber qué falta sin ya conocer la arquitectura interna.
**Solución propuesta:** al crear la primera categoría de una org, crear automáticamente su `home_section` (`visible: true`) — cero pasos extra para el caso común (una tienda chica probablemente quiere mostrar todas sus categorías). "Home" pasa a ser para reordenar/ocultar, no para el alta inicial.

### 🔴 [ALTO] Producto sin variante = no se puede comprar, y el aviso llega demasiado tarde
**Dónde:** `VariantEditor.tsx` (paso presentado como uno más, no obligatorio) → `ProductDetailView.tsx` (botón deshabilitado "Sin variantes disponibles").
**Qué pasa:** el producto se guarda y queda "visible" sin ninguna variante cargada. El único indicio de que falta algo es la vista previa lateral en el editor, o directamente la tienda pública con un botón deshabilitado — sin ninguna explicación de qué falta ni cómo resolverlo desde ahí.
**Por qué importa:** para el usuario objetivo (talle/color en campos de texto libre, sin experiencia previa con "variantes" como concepto) es fácil completar nombre+precio+categoría, guardar, y asumir que "ya está" — recién en la tienda descubre que no se puede comprar, y tiene que volver al admin a resolverlo sin saber bien por qué.
**Solución propuesta:** marcar el bloque de variantes como obligatorio visualmente (no un card más entre otros), y mostrar una advertencia explícita en la propia ficha del producto ("Sin variantes, tus clientes no van a poder comprarlo") en vez de dejar que la tienda pública sea el primer lugar donde se nota.

### 🟡 [MEDIO] "Slug" es terminología técnica expuesta sin necesidad
**Dónde:** `TaxonomyManager.tsx` (categorías/colecciones) y `CatalogConfigPage.tsx` (slug de la tienda).
**Qué pasa:** el campo "Slug" (con mensaje de validación "solo minúsculas, números y guiones") está visible y editable desde el primer formulario que completa cualquier usuario nuevo, aunque se autogenera solo a partir del nombre.
**Por qué importa:** un dueño de local sin experiencia técnica no tiene por qué saber qué es un "slug" — genera duda o un error de validación innecesario en el paso 3 del flujo, el primer formulario de todo el sistema.
**Solución propuesta:** ocultar el campo detrás de un link secundario ("Editar URL") colapsado por default; en el flujo normal solo se ve el campo Nombre.

### 🟡 [MEDIO] La categoría como prerequisito de producto es silenciosa hasta que se topa con ella
**Dónde:** `ProductsPage.tsx` — si `categories.length === 0`, el formulario de alta desaparece y se reemplaza por un texto con link a Categorías.
**Qué pasa:** está bien resuelto en el momento (mensaje claro, con link directo), pero nada en el Dashboard o en el flujo general anticipa este prerequisito — el usuario llega a "Productos" esperando cargar su producto y se encuentra con un desvío no anunciado.
**Por qué importa:** suma un paso no anticipado al conteo total; multiplica la sensación de "cada pantalla me manda a otra pantalla" en el primer uso.
**Solución propuesta:** ver mejora estructural de onboarding — un checklist inicial que declare el orden correcto de entrada, en vez de dejar que cada pantalla lo revele una por una.

### 🟢 [BAJO] Dashboard vacío sin ningún llamado a la acción
**Dónde:** `DashboardPage.tsx`.
**Qué pasa:** el primer login de un admin nuevo aterriza en un dashboard de métricas (ingresos, pedidos del mes, etc.) todo en cero, sin ningún CTA orientado a la tarea real del día uno.
**Por qué importa:** es la primera pantalla que ve el usuario y no lo dirige a la tarea #1 (cargar su primer producto) — pierde la oportunidad más valiosa de reducir fricción, gratis.
**Solución propuesta:** estado vacío distinto cuando no hay productos todavía, con un botón directo "Cargar mi primer producto".

### 🟢 [BAJO] Talle/Color son texto libre, sin sugerencias
**Dónde:** `VariantEditor.tsx`.
**Qué pasa:** talle y color se tipean a mano, sin ningún `datalist` de sugerencias — a diferencia de "Marca" en `ProductEditPage.tsx`, que sí usa ese patrón (`SUGGESTED_BRANDS`).
**Por qué importa:** más tipeo y más inconsistencia de datos entre productos (mismo talle escrito distinto) — fricción menor, pero acumulable a medida que se cargan más productos.
**Solución propuesta:** mismo patrón `datalist` ya usado para Marca, con valores sugeridos (S, M, L, XL, Único...).

## Quick wins

- Auto-crear la `home_section` (visible) al crear la primera categoría de la org — resuelve el hallazgo 🔴 más grave sin agregar ningún paso al flujo.
- Agregar un `datalist` de talles sugeridos en `VariantEditor`, igual al que ya existe para Marca.
- Colapsar el campo "Slug" detrás de un link opcional en `TaxonomyManager` y `CatalogConfigPage`.
- Aviso inline en `ProductEditPage` cuando el producto no tiene variantes: "Sin variantes, no se puede comprar — agregá al menos una talle/color abajo."

## Mejoras estructurales

- Checklist de onboarding real en el Dashboard vacío (Categoría → Producto → Home), con progreso visible, en vez de que cada prerequisito se descubra pantalla por pantalla.
- Repensar la relación producto↔home_sections para que el default sea "toda categoría activa se muestra" y "ocultar del home" sea la excepción manual — no al revés como está hoy.
- Unificar Categorías, Colecciones y Home en un único flujo guiado de "publicar mi tienda" en vez de 3 pantallas de sidebar independientes y sin relación visual entre sí.
