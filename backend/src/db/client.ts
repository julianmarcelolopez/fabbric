import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

// prepare: false — requerido por el transaction pooler de Supabase (PgBouncer
// en transaction mode no soporta prepared statements)
const sql = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(sql, { schema });
