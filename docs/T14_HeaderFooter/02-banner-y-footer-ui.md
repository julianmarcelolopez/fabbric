# Tarea 2 — Banner, footer y botón compartir

**Estado:** ✅ Completada (2026-07-24) — verificada en navegador por el usuario, sin defectos
**Depende de:** [01-schema-y-endpoints.md](01-schema-y-endpoints.md)

## Objetivo

Que Edgar pueda cargar el banner y sus datos de contacto desde el admin, y que se vean en la tienda pública.

## Pasos

**Admin:**
- [x] `frontend/src/features/admin/types.ts`: sumar `bannerUrl: string | null`, `whatsapp`, `instagram`, `email`, `address`, `businessHours: string | null` a `CatalogConfig` (hoy tiene `id`/`slug`/`storeName`/`logoUrl`/`accentColor`/`theme`/`businessDescription`/`lowStockThreshold`/`active`).
- [x] `CatalogConfigPage.tsx`: nueva sección "Banner" (mismo patrón que el bloque "Logo" ya existente: preview + botón subir/reemplazar, reusando `apiUpload<CatalogConfig>` genérico apuntando a `/admin/catalog-config/banner`) + campos de texto para WhatsApp/Instagram/mail/dirección/horario en el form existente (mismo patrón de `businessDescription`: van en el PATCH normal, `.trim() === "" ? null : valor`).

**Tienda pública** (`frontend/src/features/store/types.ts`, **falta en el draft original de esta tarea**):
- [x] `PublicStoreConfig` (hoy solo tiene `storeName`/`logoUrl`/`accentColor`/`theme`/`businessDescription`): sumar los 6 campos nuevos — sin esto `StoreLayout.tsx` ni compila al leer `config.bannerUrl`.

**`StoreLayout.tsx`:**
- [x] Banner: si `config.bannerUrl` está cargado, imagen full-width **arriba** de `<header className="store-topbar">` (dentro del `<div className="store">`); si no, no se renderiza nada (sin banner no rompe el layout — mismo criterio que el resto de los campos opcionales).
- [x] Footer (hoy solo `businessDescription` + "tienda creada con fabbric"): agregar una fila de links condicionales, cada uno solo si el campo está cargado:
  - WhatsApp → `https://wa.me/<numero>`, con el número **limpiado de todo lo que no sea dígito** antes de armar el link (`config.whatsapp.replace(/\D/g, "")`) — el usuario puede haber tipeado espacios, `+`, guiones.
  - Instagram → link directo (asumir que el usuario carga la URL completa, no solo el handle — más simple, sin necesidad de armar `instagram.com/<handle>` a mano).
  - Mail → `mailto:<email>`.
  - Dirección y horario → texto plano, sin link.
- [x] Botón "Compartir" en la topbar (nuevo componente `ShareButton`, mismo patrón que `CartButton`): `navigator.share({ title: config.storeName, url: location.href })` si el navegador lo soporta; si no, `navigator.clipboard.writeText(location.href)` + algún feedback simple (ej. cambiar el texto del botón a "¡Copiado!" por un momento).

**CSS** (`frontend/src/features/catalog/catalog.css`, sección tienda — no tocar `admin.css`):
- [x] `.store-banner` (o similar): imagen full-width, `object-fit: cover`, alto acotado (ej. `max-height: 240px`) para que un banner de proporción rara no rompa el layout.
- [x] `.store-footer-links`: fila de links en el footer, mismo criterio visual que el resto (`color: #6b7280`, hover con `--accent`).
- [x] Botón "Compartir": reusar la clase `.store-auth-btn` que ya existe (mismo look que "Carrito"/"Ingresar con Google") — no inventar un estilo nuevo.

## Definition of Done

- [x] `tsc --noEmit` limpio; `vite build` compila sin errores.
- [x] Verificación visual en navegador → confirmado por el usuario, sin problemas.

## Nota de implementación

Compartir usa `ShareButton`, un componente nuevo junto a `CartButton`/`CustomerMenu` en `StoreLayout.tsx` — mismo `.store-auth-btn`, con feedback local "¡Copiado!" cuando cae al fallback de portapapeles (sin `navigator.share`). El campo Instagram se guarda como URL completa, no handle — evita tener que armar `instagram.com/<handle>` a mano y le da al usuario libertad de pegar cualquier link (post, perfil, etc.).
