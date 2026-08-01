// T21/06 — verifica el tramo de datos: admin PATCH returnPolicy → DB →
// GET /public/:slug/config lo refleja (o null al vaciarlo), y el límite de
// 2000 caracteres se respeta. El render condicional (solo en el panel
// "Envíos y cambios", benefit strip sin cambios) vive en
// ProductDetailView.tsx (frontend) — queda para la pasada visual del usuario.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2106temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2106temp!pass-1Qw4";
const TEST_POLICY = "Cambios dentro de los 30 días con ticket de compra, prenda sin uso y con etiqueta.";

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

  console.log("\n1) Admin staff temporal + estado original");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const before = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("returnPolicy original es null", before.returnPolicy === null, before.returnPolicy);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Setear returnPolicy");
  const p1 = await api("PATCH", "/admin/catalog-config", token, { returnPolicy: TEST_POLICY });
  check("PATCH 200", p1.status === 200, JSON.stringify(p1.body));
  const g1 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("público refleja el texto sin delay", g1.returnPolicy === TEST_POLICY, g1.returnPolicy);

  console.log("\n3) Vaciarlo (vuelve al fallback de WhatsApp)");
  const p2 = await api("PATCH", "/admin/catalog-config", token, { returnPolicy: null });
  check("PATCH 200", p2.status === 200);
  const g2 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("vuelve a null", g2.returnPolicy === null, g2.returnPolicy);

  console.log("\n4) Límite de 2000 caracteres");
  const tooLong = await api("PATCH", "/admin/catalog-config", token, { returnPolicy: "x".repeat(2001) });
  check("2001 caracteres → 400", tooLong.status === 400, tooLong.status);

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
