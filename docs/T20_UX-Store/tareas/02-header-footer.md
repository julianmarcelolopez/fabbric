# 02 — Header y footer

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

El header y footer nuevos, compartidos por las 5 páginas de la tienda — announcement bar, nav de categorías, logo centrado, iconos de acción, y el footer de 4 columnas con barra inferior. Es el segundo prerequisito estructural (después de `01`): todas las páginas siguientes asumen que este layout ya envuelve el contenido.

## Referencia visual

Presente en los 5 mockups de forma casi idéntica — usar `mockup_eliathi_home.html` como referencia principal (`.announcement`, `header`, `.header-inner`, `nav`, `.logo-wrap`, `.header-actions`, `footer`, `.footer-top`, `.footer-bottom`). El estado `nav a.active` (link de categoría resaltado) se ve en `mockup_eliathi_categorias.html` y `mockup_eliathi_categoria.html`.

## Componentes a crear o modificar

- Announcement bar (nuevo).
- Header v2: nav de categorías, logo centrado, iconos de búsqueda/cuenta/carrito con badge (nuevo, reemplaza el header actual).
- WhatsApp float (nuevo, vive a nivel de layout, no de página — visible en las 5 pantallas).
- Footer v2: 4 columnas + barra inferior con medios de pago (nuevo, reemplaza el footer actual de una columna).

## Variables CSS que usa o define

Consume `--tenant-primary`, `--navy`, `--white`, `--off`, `--gray`, `--font-body`, `--tenant-font-display` (definidas en `01`). No define variables nuevas.

## Archivos a modificar

- `frontend/src/features/store/StoreLayout.tsx` — reescritura del header y footer (la lógica de fetch de `config` y los providers de carrito/auth no cambian, solo el JSX/CSS que envuelven).
- `frontend/src/features/catalog/catalog.css` — estilos de header/footer/announcement/whatsapp-float.

## Criterio de completado

- Header, announcement bar, footer y botón de WhatsApp se ven en las 5 páginas de la tienda (verificable ya con solo esta tarea + `01`, aunque las páginas en sí sigan con el layout viejo por dentro).
- El nav de categorías muestra categorías reales de la org (no hardcodeadas como en el mockup) — ver Notas sobre qué fuente de datos usar.
- El botón de WhatsApp usa el número real de `config.whatsapp` (mismo patrón `wa.me/` que ya existe en el footer actual) y no aparece si la org no cargó WhatsApp.
- Los iconos de redes sociales del footer usan `config.instagram`/`config.whatsapp` reales; el ícono de Facebook del mockup se omite si no hay campo real (ver `analisis.md` sección 6) o se oculta condicionalmente.
- `tsc --noEmit` limpio; verificado en navegador en `/store/eliathi-modas`.

## Notas y dependencias

- **Depende de `01`** (tokens/fuentes).
- **Es prerequisito de `03` a `07`** — todas envuelven su contenido en este header/footer.
- **Qué categorías mostrar en el nav**: el mockup muestra una selección curada ("Remeras, Jeans, Buzos, Ofertas"), no todas las categorías de la org. Sin un campo nuevo de "featured en header" (backend-touching, ver `analisis.md` sección 6), la alternativa sin tocar backend es reusar las categorías que ya están en `home_sections` (mismo criterio que ya decide qué se muestra en el home) — confirmar este criterio antes de implementar, no asumirlo.
- **Announcement bar**: sin un campo de texto libre configurable (backend-touching), la alternativa es generar el texto automáticamente a partir de zonas de envío reales (`analisis.md` sección 6) — confirmar el criterio antes de implementar.
- El buscador (ícono 🔍) y "mi cuenta" (👤) del mockup: el segundo ya existe como concepto (login de Google del portal cliente, `CustomerAuthContext`) y puede mapearse; el buscador no tiene ninguna funcionalidad real detrás en la tienda pública todavía (ver `analisis.md` sección 6, filtros/búsqueda) — aclarar en la implementación si el ícono queda decorativo o se pospone.

## Resultado

Decisiones del usuario antes de implementar: nav con categorías de `home_sections` (máx. 6) + link fijo "Ver todo" a `/store/:slug/categorias` (la ruta de la tarea `04`, todavía no existe — el link queda armado igual, a propósito); announcement bar auto-generado desde la zona de envío gratis más accesible, formato `"Envío gratis en [zona] en compras mayores a $[monto] · 3 cuotas sin interés"`, oculto si ninguna zona tiene envío gratis configurado; buscador decorativo con `disabled` + comentario; ícono de cuenta mapeado a `CustomerAuthContext` (Google); Facebook omitido del footer.

- **`StoreLayout.tsx`** reescrito: 3 fetches en paralelo (`config`, `shipping-zones`, `home` — este último solo para derivar las categorías del nav, sin pasarlas al contenido). Nuevo `AccountButton` (ícono 👤 si no hay sesión → dispara `signInWithGoogle()`; avatar con inicial + dropdown "Mis pedidos"/"Salir" si hay sesión — extrapolación propia, el mockup no define el estado logueado, documentada como tal). `CartButton` pasa de texto ("🛒 Carrito (2)") a ícono + badge numérico, igual que el mockup.
- **`catalog.css`**: agregadas todas las clases nuevas de header/footer/announcement/whatsapp-float/account-menu. **No se tocaron** `.store-topbar`/`.store-brand`/`.store-brand-badge` (siguen en uso por el preview de `MyStorePage.tsx`, T19/07) ni `.store-auth-btn`/`.store-back` (en uso por `CartDrawer.tsx` y `CategoryPage.tsx`, todavía sin rediseñar) — confirmado con grep antes de tocar nada, para no romper esos tres puntos. Solo se eliminaron las reglas verdaderamente huérfanas (`.store-footer`, `.store-footer-links`, `.store-powered`, `.store-user`, `.store-topbar-spacer`), confirmado que no las usaba ningún otro archivo antes de borrarlas.
- **Bonus de la tarea 01**: `.store` pasó a usar `var(--off)`/`var(--font-body)` en vez de los hardcodes de T13 (`#F7F3EC`/Poppins) — quedaba pendiente de esa tarea, se completó acá al ser el lugar natural (header/footer viven dentro de `.store`).

**Bug encontrado y corregido durante la verificación**: el logo real de Eliathi Modas tiene fondo blanco opaco (no transparente) — el filtro `brightness(0) invert(1)` copiado literal del mockup (pensado para un logo con fondo transparente) dejaba todo blanco, fondo y trazo por igual, mostrándose como un rectángulo vacío en el footer. Se abrió el PNG real (`public/images/eliathi.png`) para confirmar el diagnóstico antes de tocar CSS. Solución: sacar el filtro, poner el logo dentro de un chip con fondo blanco — se ve correctamente sobre el navy del footer.

**Decisión de scope explícita**: el usuario pidió hacer configurable el texto del announcement bar desde el admin; se le explicó que eso requiere un campo nuevo en `catalog_configs` (backend, fuera del alcance declarado de T20) y decidió dejarlo para más adelante — sigue auto-generándose desde zonas de envío reales, documentado en `analisis.md`/tarea `08`.

**Verificación real en navegador** (usuario, con la org real, incluyendo un caso "con contenido" probado a propósito: activé temporalmente `freeShippingFrom` en la zona "CABA" por API, confirmé el announcement bar con el texto armado correctamente, y la revertí después dejando la org real sin cambios): header con nav de 5 categorías reales + "Ver todo", logo centrado, iconos de búsqueda (deshabilitado)/compartir/cuenta (avatar con inicial "J", sesión ya logueada)/carrito, banner, WhatsApp flotante, y footer completo con columnas Marca/Tienda/Contacto + barra inferior — confirmado en dos rondas (la segunda después de corregir el logo).

`tsc --noEmit` y `vite build` limpios en cada paso.
