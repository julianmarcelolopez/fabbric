// T21/04 — verifica el tramo de datos: admin PATCH midBannerTitle/Subtitle →
// DB → GET /public/:slug/config los refleja, en las 3 combinaciones (los dos,
// solo título, ninguno), y que los límites de caracteres (60/120) se
// respetan. El render condicional (overlay solo con título, subtítulo solo
// si hay título) vive en CatalogHomePage.tsx (frontend) — queda para la
// pasada visual del usuario.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2104temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2104temp!pass-9Xr6";

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
  check("midBannerTitle original es null", before.midBannerTitle === null, before.midBannerTitle);
  check("midBannerSubtitle original es null", before.midBannerSubtitle === null, before.midBannerSubtitle);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Caso 1 — título + subtítulo");
  const p1 = await api("PATCH", "/admin/catalog-config", token, {
    midBannerTitle: "Nueva colección de invierno",
    midBannerSubtitle: "Prendas abrigadas, hasta agotar stock",
  });
  check("PATCH 200", p1.status === 200);
  const g1 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("título reflejado", g1.midBannerTitle === "Nueva colección de invierno", g1.midBannerTitle);
  check("subtítulo reflejado", g1.midBannerSubtitle === "Prendas abrigadas, hasta agotar stock", g1.midBannerSubtitle);

  console.log("\n3) Caso 2 — solo título (subtítulo vacío → null)");
  const p2 = await api("PATCH", "/admin/catalog-config", token, { midBannerSubtitle: null });
  check("PATCH 200", p2.status === 200);
  const g2 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("título sigue", g2.midBannerTitle === "Nueva colección de invierno", g2.midBannerTitle);
  check("subtítulo es null", g2.midBannerSubtitle === null, g2.midBannerSubtitle);

  console.log("\n4) Caso 3 — ninguno (vuelve al comportamiento de T20/03)");
  const p3 = await api("PATCH", "/admin/catalog-config", token, { midBannerTitle: null, midBannerSubtitle: null });
  check("PATCH 200", p3.status === 200);
  const g3 = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("título null", g3.midBannerTitle === null, g3.midBannerTitle);
  check("subtítulo null", g3.midBannerSubtitle === null, g3.midBannerSubtitle);

  console.log("\n5) Límites de caracteres (60 título / 120 subtítulo)");
  const badTitle = await api("PATCH", "/admin/catalog-config", token, { midBannerTitle: "x".repeat(61) });
  check("61 chars en título → 400", badTitle.status === 400, badTitle.status);
  const badSub = await api("PATCH", "/admin/catalog-config", token, { midBannerSubtitle: "x".repeat(121) });
  check("121 chars en subtítulo → 400", badSub.status === 400, badSub.status);

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
