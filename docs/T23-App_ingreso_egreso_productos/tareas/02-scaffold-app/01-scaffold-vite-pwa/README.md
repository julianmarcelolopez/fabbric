# Tarea 1 — Scaffold Vite + React + PWA

**Estado:** ✅ Hecha (2026-08-17)
**Depende de:** —

## Objetivo

Proyecto base de la PWA, integrado al workspace del monorepo, con `vite-plugin-pwa` configurado y un manifest instalable — sin lógica de negocio todavía.

## Pasos

- [x] Carpeta `pwa/` creada en la raíz del monorepo.
- [x] `"pwa"` sumada a `workspaces` de `package.json` (raíz): `["frontend", "backend", "pwa", "packages/*"]`.
- [x] `pwa/package.json`: `@fabbric/pwa`, mismas versiones que `@fabbric/frontend` (`react`/`react-dom` 19, `vite` 6, `@vitejs/plugin-react`, `typescript`) + `vite-plugin-pwa` (resuelta por npm en `^1.3.0`) en `devDependencies` (es herramienta de build, no runtime — corregido a mano tras el `npm install` inicial, que la había puesto en `dependencies`).
- [x] `pwa/tsconfig.json` — igual a `frontend/tsconfig.json`.
- [x] `pwa/vite.config.ts`: `react()` + `VitePWA({...})`, `envDir` a la raíz, `server.port: 5174`. Se agregó además `devOptions: { enabled: true }` — sin esto el manifest no se sirve en `vite dev` (solo en `vite build`), y no se podía verificar en desarrollo.
- [x] `VitePWA`: `registerType: "autoUpdate"`, manifest con `name`/`short_name`/`start_url`/`display: "standalone"`, y los colores **reales** de la marca (`background_color: "#F7F3EC"`, `theme_color: "#FF6B4A"`, tomados de `catalog_configs` de la org real de Eliathi Modas).
- [x] Íconos: **placeholder generado por script** (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) — no se reusó el logo real (`catalog_configs.logo_url`, un `.jpg` no cuadrado) porque no había herramienta de conversión de imagen disponible en el entorno (`convert` en Windows es el conversor de disco NTFS, no ImageMagick — cuidado con ese binario). Se generaron PNGs válidos a mano (sin dependencias, con `zlib` de Node) usando los colores reales de la marca. Reemplazar por assets de diseño reales más adelante no requiere tocar código, solo los 3 archivos en `pwa/public/`.
- [x] `pwa/index.html` + `pwa/src/main.tsx` + `pwa/src/App.tsx` — placeholder centrado.

## Definition of Done

- [x] `npm install` desde la raíz instala `pwa/` sin errores — confirmado (`node_modules/@fabbric/pwa` symlinkeado).
- [x] `npx vite` (dentro de `pwa/`) levanta el servidor en `:5174` y sirve el placeholder (200).
- [x] Manifest válido: `GET /manifest.webmanifest` devuelve JSON válido con nombre, 3 íconos y `theme_color` correctos; los 3 PNGs se sirven con `Content-Type: image/png`.
- [x] `tsc --noEmit` limpio.

## Dependencias

- **La bloquean**: ninguna — es scaffold puro, no depende de que el backend esté corriendo.
- **Bloquea**: Tarea 2 (`02-dockerizacion`) — necesita que exista `pwa/package.json` para poder dockerizar.
