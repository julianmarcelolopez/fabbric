// T21/08 — verificación real de punta a punta: sube una imagen real como
// heroImageUrl de Eliathi Modas vía el endpoint nuevo, confirma que aparece
// en GET /public/eliathi-modas/config (lo que consume CatalogHomePage.tsx),
// que reemplazarla borra la anterior de Storage, y la deja exactamente como
// estaba (heroImageUrl null + archivo borrado) al terminar.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2108temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2108temp!pass-9Zk4";

// PNG 1x1 azul válido, embebido — no depende de ningún archivo externo.
const PNG_1X1_BLUE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

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
  const [config] = await sql`select org_id as id, hero_image_url from catalog_configs where slug = 'eliathi-modas'`;
  check("config de Eliathi Modas encontrada", !!config);
  check("heroImageUrl original es null (estado esperado antes del cambio)", config?.hero_image_url === null, config?.hero_image_url);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await fetch(`${API}/superadmin/organizations/${config.id}/admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${superT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEMP_ADMIN_EMAIL, password: TEMP_ADMIN_PASSWORD, role: "staff" }),
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Subir imagen real a POST /admin/catalog-config/hero-image");
  const form = new FormData();
  form.append("file", new Blob([PNG_1X1_BLUE], { type: "image/png" }), "hero.png");
  const uploadRes = await fetch(`${API}/admin/catalog-config/hero-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadBody = await uploadRes.json();
  check("upload 200", uploadRes.status === 200, JSON.stringify(uploadBody));
  check(
    "devuelve heroImageUrl real de Supabase Storage",
    !!uploadBody?.heroImageUrl?.includes("/storage/v1/object/public/"),
    uploadBody?.heroImageUrl
  );

  console.log("\n3) Aparece en GET /public/eliathi-modas/config");
  const publicConfig = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("config pública tiene heroImageUrl = el subido", publicConfig?.heroImageUrl === uploadBody.heroImageUrl, publicConfig?.heroImageUrl);

  console.log("\n4) Sin archivo → 400");
  const noFileRes = await fetch(`${API}/admin/catalog-config/hero-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data; boundary=x" },
    body: "--x--",
  });
  check("sin archivo → 400", noFileRes.status === 400, String(noFileRes.status));

  console.log("\n5) Reemplazar por una segunda imagen borra la anterior de Storage (best-effort)");
  const oldPath = uploadBody.heroImageUrl.split("/object/public/product-images/")[1];
  const form2 = new FormData();
  form2.append("file", new Blob([PNG_1X1_BLUE], { type: "image/png" }), "hero2.png");
  const upload2Res = await fetch(`${API}/admin/catalog-config/hero-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form2,
  });
  const upload2Body = await upload2Res.json();
  check("segundo upload 200", upload2Res.status === 200);
  const { data: oldFileCheck } = await supa.storage.from("product-images").list(oldPath.split("/").slice(0, -1).join("/"));
  const oldStillThere = oldFileCheck?.some((f) => oldPath.endsWith(f.name));
  check("imagen anterior borrada de Storage", !oldStillThere);

  console.log("\n— Cleanup: dejar Eliathi Modas sin heroImageUrl, como estaba —");
  const newPath = upload2Body.heroImageUrl.split("/object/public/product-images/")[1];
  await supa.storage.from("product-images").remove([newPath]);
  await sql`update catalog_configs set hero_image_url = null where org_id = ${config.id}`;
  const [restored] = await sql`select hero_image_url from catalog_configs where org_id = ${config.id}`;
  check("Eliathi Modas restaurada a heroImageUrl null", restored.hero_image_url === null);
  const restoredPublic = await fetch(`${API}/public/eliathi-modas/config`).then((r) => r.json());
  check("GET público vuelve a heroImageUrl null", restoredPublic.heroImageUrl === null, restoredPublic.heroImageUrl);

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
