// T21/03 — verifica el tramo de datos: admin PATCH announcementText → DB →
// GET /public/:slug/config lo refleja (o refleja null al vaciarlo), sin
// delay. La lógica de qué se muestra según el valor (texto propio /
// autogenerado / nada) vive en StoreLayout.tsx (frontend) y no es
// verificable por curl — queda para la pasada visual del usuario.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2103temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2103temp!pass-7Ln5";
const TEST_TEXT = "Envío gratis esta semana en toda la tienda";

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

  console.log("\n1) Admin staff temporal en la org real + estado original");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const before = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("announcementText original es null", before.announcementText === null, before.announcementText);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Setear announcementText");
  const patch1 = await api("PATCH", "/admin/catalog-config", token, { announcementText: TEST_TEXT });
  check("PATCH 200", patch1.status === 200, JSON.stringify(patch1.body));
  const after1 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("público refleja el texto sin delay", after1.announcementText === TEST_TEXT, after1.announcementText);

  console.log("\n3) Vaciarlo (string vacío → el admin lo manda como null, mismo criterio que los otros campos de texto)");
  const patch2 = await api("PATCH", "/admin/catalog-config", token, { announcementText: null });
  check("PATCH 200", patch2.status === 200);
  const after2 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("vuelve a null (StoreLayout.tsx cae al autogenerado)", after2.announcementText === null, after2.announcementText);

  console.log("\n4) Límite de 120 caracteres respetado por el schema");
  const tooLong = await api("PATCH", "/admin/catalog-config", token, { announcementText: "x".repeat(121) });
  check("121 caracteres → 400 (validación)", tooLong.status === 400, tooLong.status);

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
