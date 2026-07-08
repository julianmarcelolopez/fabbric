import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

// Cliente con la secret key (solo backend): Auth Admin API ahora, Storage en T2.
// Módulo simple (no plugin de Fastify) para poder usarlo también desde scripts (seed).
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
