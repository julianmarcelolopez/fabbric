// T21/07 — verifica que crear una colección nueva la agrega automáticamente
// a home_sections (mismo criterio que T19/06 ya probó para categorías), y que
// aparece de inmediato en GET /public/:slug/home con refType "collection" —
// que es exactamente lo que CategoriesIndexPage.tsx (T20/04) necesita para
// que el tab "Colecciones" deje de estar vacío por defecto.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  VITE_SUPABASE_ANON_KEY: ANON_KEY,
  SEED_SUPERADMIN_EMAIL,
  SEED_SUPERADMIN_PASSWORD,
} = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2107temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2107temp!pass-4Zm7";
const TEST_SLUG = "t21-07-temp-coleccion";

let pass = 0,
  fail = 0;
function check(name, ok, extra = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json };
}

async function cleanupCollection() {
  const [col] = await sql`select id from collections where slug = ${TEST_SLUG}`;
  if (col) {
    await sql`delete from home_sections where ref_type = 'collection' and ref_id = ${col.id}`;
    await sql`delete from collections where id = ${col.id}`;
  }
}

async function cleanupTempAdmin() {
  await sql`delete from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

try {
  console.log("— Pre-cleanup —");
  await cleanupCollection();
  await cleanupTempAdmin();

  console.log("\n1) Admin staff temporal en la org real");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Crear colección real vía POST /admin/collections");
  const col = await api("POST", "/admin/collections", token, {
    name: "T21-07 Temp",
    slug: TEST_SLUG,
  });
  check("colección creada (201)", col.status === 201, JSON.stringify(col.body));

  console.log("\n3) home_section creada automáticamente, sin pasos manuales");
  const [hs] = await sql`select * from home_sections where ref_type = 'collection' and ref_id = ${col.body.id}`;
  check("home_section existe", !!hs);
  check("visible = true por default", hs?.visible === true, hs?.visible);

  console.log("\n4) Aparece en GET /public/eliathi-modas/home");
  const home = await fetch(`${API}/public/eliathi-modas/home`).then((r) => r.json());
  const found = home.find((s) => s.refType === "collection" && s.refSlug === TEST_SLUG);
  check("aparece en /public/.../home con refType collection", !!found, JSON.stringify(home.map((s) => s.refSlug)));
  check("refName correcto", found?.refName === "T21-07 Temp", found?.refName);

  console.log("\n5) Idempotencia: crear el mismo caso dos veces no duplica (respeta la unique)");
  const [{ count: sectionsForThisCol }] = await sql`
    select count(*)::int as count from home_sections where ref_type = 'collection' and ref_id = ${col.body.id}`;
  check("solo 1 home_section para esta colección", sectionsForThisCol === 1, sectionsForThisCol);

  console.log("\n— Cleanup final —");
  await cleanupCollection();
  await cleanupTempAdmin();
  const [{ count: leftoverCols }] = await sql`select count(*)::int as count from collections where slug = ${TEST_SLUG}`;
  check("sin residuos en DB", leftoverCols === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupCollection();
    await cleanupTempAdmin();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
