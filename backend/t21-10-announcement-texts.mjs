// T21/10 — verificación real de punta a punta: announcementText (un solo
// texto) pasó a announcementTexts (lista, hasta 3, carrusel en el frontend
// con 2+). Setea la lista vía PATCH /admin/catalog-config, confirma que
// aparece en GET /public/eliathi-modas/config, valida el límite de 3
// mensajes y el de 120 caracteres por mensaje, y deja todo como estaba.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2110temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2110temp!pass-5Xy2";

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
  const [config] = await sql`select org_id as id, announcement_texts from catalog_configs where slug = 'eliathi-modas'`;
  const original = config?.announcement_texts ?? [];
  check("config de Eliathi Modas encontrada", !!config);
  console.log(`  (estado original: ${JSON.stringify(original)})`);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await fetch(`${API}/superadmin/organizations/${config.id}/admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${superT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEMP_ADMIN_EMAIL, password: TEMP_ADMIN_PASSWORD, role: "staff" }),
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Setear 2 mensajes vía PATCH /admin/catalog-config");
  const twoMessages = ["Hasta 6 cuotas sin interés", "Retirá gratis en nuestras tiendas"];
  const patchRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ announcementTexts: twoMessages }),
  });
  const patchBody = await patchRes.json();
  check("PATCH 200", patchRes.status === 200, JSON.stringify(patchBody));
  check("devuelve los 2 mensajes en orden", JSON.stringify(patchBody?.announcementTexts) === JSON.stringify(twoMessages), JSON.stringify(patchBody?.announcementTexts));

  console.log("\n3) Aparecen en GET /public/eliathi-modas/config");
  const publicConfig = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check(
    "config pública tiene los 2 mensajes",
    JSON.stringify(publicConfig?.announcementTexts) === JSON.stringify(twoMessages),
    JSON.stringify(publicConfig?.announcementTexts)
  );

  console.log("\n4) 4to mensaje (supera el máximo de 3) → 400");
  const tooManyRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ announcementTexts: ["a", "b", "c", "d"] }),
  });
  check("4 mensajes → 400", tooManyRes.status === 400, String(tooManyRes.status));

  console.log("\n5) Mensaje de 121 caracteres → 400");
  const tooLongRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ announcementTexts: ["x".repeat(121)] }),
  });
  check("121 caracteres → 400", tooLongRes.status === 400, String(tooLongRes.status));

  console.log("\n6) 1 solo mensaje se guarda igual (sin carrusel, pero válido)");
  const oneRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ announcementTexts: ["Envío gratis desde $50.000"] }),
  });
  const oneBody = await oneRes.json();
  check("1 mensaje → 200", oneRes.status === 200);
  check("devuelve el único mensaje", JSON.stringify(oneBody?.announcementTexts) === JSON.stringify(["Envío gratis desde $50.000"]), JSON.stringify(oneBody?.announcementTexts));

  console.log("\n7) Vaciar la lista vuelve al fallback autogenerado");
  const clearRes = await fetch(`${API}/admin/catalog-config`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ announcementTexts: [] }),
  });
  const clearBody = await clearRes.json();
  check("PATCH [] 200", clearRes.status === 200);
  check("announcementTexts vuelve a []", JSON.stringify(clearBody?.announcementTexts) === "[]", JSON.stringify(clearBody?.announcementTexts));

  console.log("\n— Cleanup: restaurar el estado original de Eliathi Modas —");
  await sql`update catalog_configs set announcement_texts = ${sql.array(original)} where org_id = ${config.id}`;
  const [restored] = await sql`select announcement_texts from catalog_configs where org_id = ${config.id}`;
  check("Eliathi Modas restaurada al estado original", JSON.stringify(restored.announcement_texts) === JSON.stringify(original), JSON.stringify(restored.announcement_texts));

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
