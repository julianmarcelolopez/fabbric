// T21/01 — verificación real de punta a punta: sube una imagen real a la
// categoría "Jeans" de Eliathi Modas vía el endpoint nuevo, confirma que
// aparece en /public/.../home y /public/.../categories/jeans/products (los
// dos endpoints que CatalogHomePage.tsx y CategoriesIndexPage.tsx/CategoryPage.tsx
// consumen), y la deja exactamente como estaba (imageUrl null + archivo
// borrado de Storage) al terminar — es una categoría real, no de prueba.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2101temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2101temp!pass-8Wc3";

// PNG 1x1 rojo válido, embebido — no depende de ningún archivo externo.
const PNG_1X1_RED = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
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

  console.log("\n1) Admin staff temporal + categoría real Jeans");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const [category] = await sql`select id, image_url from categories where org_id = ${org.id} and slug = 'jeans'`;
  check("categoría Jeans encontrada", !!category);
  check("imageUrl original es null (estado esperado antes del cambio)", category?.image_url === null, category?.image_url);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await fetch(`${API}/superadmin/organizations/${org.id}/admins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${superT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEMP_ADMIN_EMAIL, password: TEMP_ADMIN_PASSWORD, role: "staff" }),
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Subir imagen real a POST /admin/categories/:id/image");
  const form = new FormData();
  form.append("file", new Blob([PNG_1X1_RED], { type: "image/png" }), "test.png");
  const uploadRes = await fetch(`${API}/admin/categories/${category.id}/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadBody = await uploadRes.json();
  check("upload 200", uploadRes.status === 200, JSON.stringify(uploadBody));
  check("devuelve imageUrl real de Supabase Storage", !!uploadBody?.imageUrl?.includes("/storage/v1/object/public/"), uploadBody?.imageUrl);

  console.log("\n3) Aparece en GET /public/eliathi-modas/home");
  const home = await fetch(`${API}/public/eliathi-modas/home`).then((r) => r.json());
  const section = home.find((s) => s.refType === "category" && s.refSlug === "jeans");
  check("sección Jeans tiene refImageUrl = el subido", section?.refImageUrl === uploadBody.imageUrl, section?.refImageUrl);

  console.log("\n4) Aparece en GET /public/eliathi-modas/categories/jeans/products");
  const catProducts = await fetch(`${API}/public/eliathi-modas/categories/jeans/products`).then((r) => r.json());
  check("category.imageUrl = el subido", catProducts?.category?.imageUrl === uploadBody.imageUrl, catProducts?.category?.imageUrl);

  console.log("\n5) Reemplazar por una segunda imagen borra la anterior de Storage (best-effort)");
  const oldPath = uploadBody.imageUrl.split("/object/public/product-images/")[1];
  const form2 = new FormData();
  form2.append("file", new Blob([PNG_1X1_RED], { type: "image/png" }), "test2.png");
  const upload2Res = await fetch(`${API}/admin/categories/${category.id}/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form2,
  });
  const upload2Body = await upload2Res.json();
  check("segundo upload 200", upload2Res.status === 200);
  const { data: oldFileCheck } = await supa.storage.from("product-images").list(oldPath.split("/").slice(0, -1).join("/"));
  const oldStillThere = oldFileCheck?.some((f) => oldPath.endsWith(f.name));
  check("imagen anterior borrada de Storage", !oldStillThere);

  console.log("\n— Cleanup: dejar la categoría real sin imagen, como estaba —");
  const newPath = upload2Body.imageUrl.split("/object/public/product-images/")[1];
  await supa.storage.from("product-images").remove([newPath]);
  await sql`update categories set image_url = null where id = ${category.id}`;
  const [restored] = await sql`select image_url from categories where id = ${category.id}`;
  check("categoría Jeans restaurada a imageUrl null", restored.image_url === null);

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
