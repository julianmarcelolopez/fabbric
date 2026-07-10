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
  // Mercado Pago (T6): access token de la app (sandbox en dev)
  MP_ACCESS_TOKEN: z.string().min(1, "MP_ACCESS_TOKEN falta — ver docs/T6_Checkout/01"),
  // Base del SPA para las back_urls del checkout
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  // URL pública del backend para el webhook de MP (túnel en dev) — opcional hasta T6 tarea 7
  MP_WEBHOOK_URL: z.string().url().optional(),
  // Secret de firma del webhook — requerido recién cuando el webhook exista
  MP_WEBHOOK_SECRET: z.string().optional(),
  // SOLO TESTS/DEV: permite pagos simulados "TESTPAY:<status>:<orderId>" en el
  // webhook sin consultar la API real de MP. JAMÁS habilitar en producción.
  MP_FAKE_PAYMENTS: z.string().optional(),
  // Resend (T7): emails de cambio de estado. Sin key → modo degradado (se loguea)
  RESEND_API_KEY: z.string().optional(),
  // Remitente de los emails (dev: dominio de prueba de Resend)
  EMAIL_FROM: z.string().default("fabbric <onboarding@resend.dev>"),
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
