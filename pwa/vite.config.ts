import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
  // En producción vive en fabbric.aivance.cloud/stock (mismo dominio que
  // frontend/, servicio propio en EasyPanel con Path=/stock) — en dev sigue
  // en la raíz de localhost:5174, sin cambios.
  const base = command === "build" ? "/stock/" : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        // Sin esto, el manifest/service worker solo se generan en `vite build`
        // — en dev, /manifest.webmanifest cae al fallback de index.html. Se
        // apagó temporalmente durante el debugging del escaneo (T23, Fase 3
        // Tarea 2) porque cacheaba bundles viejos en el celular — ya
        // reactivado, ver esa tarea para el detalle.
        devOptions: { enabled: true },
        manifest: {
          name: "Eliathi Modas — Stock",
          short_name: "Stock",
          description: "Ingreso y egreso de productos por escaneo — Eliathi Modas",
          start_url: base,
          scope: base,
          display: "standalone",
          // Colores reales de la marca (T13/catalog_configs) — íconos son
          // placeholder (T23/02-scaffold-app), reemplazar por assets de diseño.
          background_color: "#F7F3EC",
          theme_color: "#FF6B4A",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
    ],
    // Las VITE_* viven en el .env.local de la raíz (mismo proyecto Supabase y
    // mismo backend que ya usa frontend/) — mismo patrón que frontend/vite.config.ts.
    envDir: resolve(root, ".."),
    server: {
      port: 5174,
      // Sin esto, Vite bloquea (403) las requests que llegan con un Host que no
      // reconoce — el túnel cloudflared usado para probar la cámara desde un
      // celular real (ver docs/T23.../tareas/02-scaffold-app/02-dockerizacion)
      // pega con Host: algo.trycloudflare.com, no localhost.
      allowedHosts: [".trycloudflare.com"],
    },
  };
});
