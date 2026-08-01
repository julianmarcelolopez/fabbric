// T20/08 — verifica que accentColor/logoUrl editados desde /admin/store se
// reflejan en tiempo real en GET /public/:slug/config (el dato que StoreLayout
// usa para --accent, de donde --tenant-primary toma su valor real desde 01).
// El cableado CSS (--accent → --tenant-primary) ya se verificó visualmente en
// browser en tareas anteriores (02/03) — esto verifica el tramo de datos:
// admin PATCH → catalog_configs → endpoint público, sin caché de por medio.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2008temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2008temp!pass-6Yq1";
const TEST_COLOR = "#00A8E8";

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

async function cleanupTempAdmin() {
  await sql`delete from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

try {
  console.log("— Pre-cleanup —");
  await cleanupTempAdmin();

  console.log("\n1) Admin staff temporal en la org real + color original");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  const before = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  const originalColor = before.accentColor;
  check("color original leído", typeof originalColor === "string", originalColor);

  console.log(`\n2) PATCH accentColor → ${TEST_COLOR}`);
  const patch1 = await api("PATCH", "/admin/catalog-config", token, { accentColor: TEST_COLOR });
  check("PATCH 200", patch1.status === 200, JSON.stringify(patch1.body));

  const after1 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("público refleja el color nuevo sin delay", after1.accentColor === TEST_COLOR, after1.accentColor);
  check("logoUrl sigue presente (no se pisó)", after1.logoUrl === before.logoUrl);

  console.log("\n3) Revertir al color original");
  const patch2 = await api("PATCH", "/admin/catalog-config", token, { accentColor: originalColor });
  check("revert 200", patch2.status === 200);
  const after2 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("color restaurado", after2.accentColor === originalColor, after2.accentColor);

  console.log("\n— Cleanup final —");
  await cleanupTempAdmin();
  const [{ count: leftovers }] = await sql`select count(*)::int as count from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  check("admin temporal borrado", leftovers === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupTempAdmin();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
