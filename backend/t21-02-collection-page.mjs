// T21/02 — verificación real: crea una colección temporal, le asigna 2
// productos reales existentes, confirma que GET /public/eliathi-modas/
// collections/:slug/products devuelve exactamente esos productos paginados
// (mismo contrato que categorías), y que una colección SIN productos
// devuelve un estado vacío sin error (lo que CategoryPage.tsx con
// mode="collection" necesita para mostrar "Todavía no hay productos..."
// en vez de romper). Borra todo al final.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2102temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2102temp!pass-2Fq9";
const COL_SLUG = "t21-02-temp-coleccion";
const EMPTY_COL_SLUG = "t21-02-temp-vacia";

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

async function cleanupCollections() {
  const cols = await sql`select id from collections where slug in (${COL_SLUG}, ${EMPTY_COL_SLUG})`;
  for (const c of cols) {
    await sql`delete from home_sections where ref_type = 'collection' and ref_id = ${c.id}`;
    await sql`delete from product_collections where collection_id = ${c.id}`;
    await sql`delete from collections where id = ${c.id}`;
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
  await cleanupCollections();
  await cleanupTempAdmin();

  console.log("\n1) Admin staff temporal + 2 productos reales de Eliathi Modas");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const realProducts = await sql`
    select id from products where org_id = ${org.id} and visible_in_catalog = true and status <> 'paused' limit 2`;
  check("hay al menos 2 productos reales para la prueba", realProducts.length === 2, realProducts.length);

  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n2) Crear colección con productos + colección vacía");
  const col = await api("POST", "/admin/collections", token, { name: "T21-02 Temp", slug: COL_SLUG });
  check("colección con productos creada", col.status === 201, JSON.stringify(col.body));
  const emptyCol = await api("POST", "/admin/collections", token, { name: "T21-02 Vacía", slug: EMPTY_COL_SLUG });
  check("colección vacía creada", emptyCol.status === 201);

  for (const p of realProducts) {
    const assign = await api("PUT", `/admin/products/${p.id}/collections`, token, { collectionIds: [col.body.id] });
    check(`producto ${p.id} asignado a la colección`, assign.status === 200, JSON.stringify(assign.body));
  }

  console.log("\n3) GET /public/eliathi-modas/collections/:slug/products — colección con productos");
  const withProducts = await fetch(`${API}/public/eliathi-modas/collections/${COL_SLUG}/products?page=1`).then((r) =>
    r.json()
  );
  check("collection.name correcto", withProducts?.collection?.name === "T21-02 Temp", withProducts?.collection?.name);
  check("totalCount = 2", withProducts?.totalCount === 2, withProducts?.totalCount);
  check("products.length = 2", withProducts?.products?.length === 2, withProducts?.products?.length);
  check(
    "los 2 productos son los reales asignados",
    realProducts.every((p) => withProducts.products.some((wp) => wp.id === p.id))
  );

  console.log("\n4) GET .../collections/:slug/products — colección vacía (sin romper)");
  const emptyRes = await fetch(`${API}/public/eliathi-modas/collections/${EMPTY_COL_SLUG}/products?page=1`);
  const emptyBody = await emptyRes.json();
  check("200 (no error)", emptyRes.status === 200, emptyRes.status);
  check("totalCount = 0", emptyBody?.totalCount === 0, emptyBody?.totalCount);
  check("products = []", Array.isArray(emptyBody?.products) && emptyBody.products.length === 0);
  check("totalPages = 1 (no 0)", emptyBody?.totalPages === 1, emptyBody?.totalPages);

  console.log("\n5) Colección inexistente → 404 (no 500)");
  const missing = await fetch(`${API}/public/eliathi-modas/collections/no-existe-esto/products`);
  check("404", missing.status === 404, missing.status);

  console.log("\n— Cleanup final —");
  await cleanupCollections();
  await cleanupTempAdmin();
  const [{ count: leftoverCols }] = await sql`
    select count(*)::int as count from collections where slug in (${COL_SLUG}, ${EMPTY_COL_SLUG})`;
  check("sin residuos de colecciones en DB", leftoverCols === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupCollections();
    await cleanupTempAdmin();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
