import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// En dev local las vars viven en .env.local en la raíz del monorepo.
// En Docker llegan por env_file — si el archivo no existe, este load no hace nada.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.local") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas o faltantes:");
  for (const [name, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${name}: ${errors?.join(", ")}`);
  }
  process.exit(1);
}

export const env = parsed.data;
