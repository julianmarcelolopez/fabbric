// T21/09 — verificación real de punta a punta: setea facebook vía PATCH
// /admin/catalog-config (mismo endpoint que instagram/whatsapp/etc.), confirma
// que aparece en GET /public/eliathi-modas/config, y lo deja exactamente como
// estaba (facebook null) al terminar.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2109temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2109temp!pass-3Bq7";
const FACEBOOK_URL = "https://facebook.com/eliathimodas";

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

async function cleanupTempAdmin() {
  await sql`delete from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

try {
  console.log("— Pre-cleanup —");
  await cleanupTempAdmin();

  console.log("\n1) Admin staff temporal + estado real de Eliathi Modas");
  const [config] = await sql`select org_id as id, facebook from catalog_configs where slug = 'eliathi-modas'`;
  check("config de Eliathi Modas encontrada", !!config);
  check("facebook original es null (estado esperado antes del cambio)", config?.facebook === null, config?.facebook);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await fetch(`${API}/superadmin/organizations/${config.id}/admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${superT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEMP_ADMIN_EMAIL, password: TEMP_ADMIN_PASSWORD, role: "staff" }),
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Setear facebook vía PATCH /admin/catalog-config");
  const patchRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ facebook: FACEBOOK_URL }),
  });
  const patchBody = await patchRes.json();
  check("PATCH 200", patchRes.status === 200, JSON.stringify(patchBody));
  check("devuelve facebook = el seteado", patchBody?.facebook === FACEBOOK_URL, patchBody?.facebook);

  console.log("\n3) Aparece en GET /public/eliathi-modas/config");
  const publicConfig = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("config pública tiene facebook = el seteado", publicConfig?.facebook === FACEBOOK_URL, publicConfig?.facebook);

  console.log("\n4) Límite de 100 caracteres se respeta");
  const tooLongRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ facebook: "x".repeat(101) }),
  });
  check("101 caracteres → 400", tooLongRes.status === 400, String(tooLongRes.status));

  console.log("\n5) Vaciar (null) vuelve a ocultar el campo");
  const clearRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ facebook: null }),
  });
  const clearBody = await clearRes.json();
  check("PATCH null 200", clearRes.status === 200);
  check("facebook vuelve a null", clearBody?.facebook === null, clearBody?.facebook);
  const restoredPublic = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("GET público vuelve a facebook null", restoredPublic.facebook === null, restoredPublic.facebook);

  console.log("\n— Cleanup —");
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
