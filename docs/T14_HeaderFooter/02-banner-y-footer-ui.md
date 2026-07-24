# Tarea 2 — Banner, footer y botón compartir

**Estado:** ⬜ Pendiente
**Depende de:** [01-schema-y-endpoints.md](01-schema-y-endpoints.md)

## Objetivo

Que Edgar pueda cargar el banner y sus datos de contacto desde el admin, y que se vean en la tienda pública.

## Pasos

- [ ] `frontend/src/features/admin/types.ts`: sumar `bannerUrl`, `whatsapp`, `instagram`, `email`, `address`, `businessHours` a `CatalogConfig`.
- [ ] `CatalogConfigPage.tsx`: nueva sección "Banner" (mismo patrón que el bloque "Logo" ya existente: preview + botón subir/reemplazar) + campos de texto para WhatsApp/Instagram/mail/dirección/horario.
- [ ] `frontend/src/features/store/StoreLayout.tsx`: `bannerUrl` se muestra como imagen de portada arriba de la topbar si está cargado (si no, no se renderiza nada — sin banner no rompe el layout).
- [ ] Footer: agregar links condicionales — WhatsApp (`https://wa.me/<numero>`), Instagram, mail (`mailto:`), dirección y horario, cada uno solo si está cargado — mismo patrón condicional que ya usa `businessDescription`.
- [ ] Botón "Compartir" en la topbar: Web Share API (`navigator.share`) con fallback a copiar el link de la tienda al portapapeles si el navegador no la soporta.

## Definition of Done

- [ ] `tsc --noEmit` limpio; Vite compila.
- [ ] Verificación en navegador → tarea 3.
