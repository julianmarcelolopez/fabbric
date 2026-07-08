import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Las VITE_* viven en el .env.local de la raíz del monorepo, no en frontend/
  envDir: resolve(root, ".."),
  server: { port: 5173 },
});
