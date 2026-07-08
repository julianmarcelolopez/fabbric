import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../.env.local" });

if (!process.env.DIRECT_URL) {
  throw new Error(
    "DIRECT_URL no está definida — las migraciones usan la conexión directa (puerto 5432), no el pooler"
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // Los SQL de migración viven en supabase/migrations (raíz del repo), versionados
  out: "../supabase/migrations",
  dbCredentials: { url: process.env.DIRECT_URL },
});
