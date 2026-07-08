/**
 * Seed de desarrollo: primera organización + su owner, y opcionalmente un super_admin.
 * Idempotente: correrlo N veces no duplica ni falla.
 *
 *   npm run db:seed                  → org + owner
 *   npm run db:seed -- --super-admin → org + owner + super_admin
 *
 * Credenciales por env (.env.local): SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD,
 * y para el flag: SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { adminUsers, organizations } from "../src/db/schema.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

const ORG_NAME = process.env.SEED_ORG_NAME ?? "Demo";
const ORG_SLUG = process.env.SEED_ORG_SLUG ?? "demo";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name} en .env.local`);
    process.exit(1);
  }
  return value;
}

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(`  auth.users: ${email} ya existe (${existing.id})`);
    return existing.id;
  }
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  console.log(`  auth.users: ${email} creado (${created.data.user.id})`);
  return created.data.user.id;
}

async function ensureOrg(name: string, slug: string) {
  const [existing] = await db.select().from(organizations).where(eq(organizations.slug, slug));
  if (existing) {
    console.log(`  organizations: "${slug}" ya existe (${existing.id})`);
    return existing;
  }
  const [org] = await db.insert(organizations).values({ name, slug }).returning();
  console.log(`  organizations: "${slug}" creada (${org.id})`);
  return org;
}

async function ensureAdminRow(
  id: string,
  orgId: string | null,
  email: string,
  role: "super_admin" | "owner" | "staff"
) {
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
  if (existing) {
    console.log(`  admin_users: ${email} ya existe (role=${existing.role})`);
    return existing;
  }
  const [row] = await db.insert(adminUsers).values({ id, orgId, email, role }).returning();
  console.log(`  admin_users: ${email} creado (role=${role})`);
  return row;
}

console.log("Seed: organización + owner");
const org = await ensureOrg(ORG_NAME, ORG_SLUG);
const ownerEmail = requireEnv("SEED_ADMIN_EMAIL");
const ownerId = await ensureAuthUser(ownerEmail, requireEnv("SEED_ADMIN_PASSWORD"));
await ensureAdminRow(ownerId, org.id, ownerEmail, "owner");

if (process.argv.includes("--super-admin")) {
  console.log("Seed: super_admin");
  const superEmail = requireEnv("SEED_SUPERADMIN_EMAIL");
  const superId = await ensureAuthUser(superEmail, requireEnv("SEED_SUPERADMIN_PASSWORD"));
  await ensureAdminRow(superId, null, superEmail, "super_admin");
}

console.log("Seed OK");
process.exit(0);
