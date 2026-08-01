// T20/05 — verificación real de paginación numerada. En vez de usar las
// credenciales del owner real (SEED_ADMIN_PASSWORD resultó no coincidir),
// se crea un admin "staff" temporal para la org real de Eliathi Modas (mismo
// patrón que backend/t10b-test.mjs pero sin crear una org nueva), se usa
// para crear 23 productos temporales en la categoría "Jeans" ya existente
// (2 reales + 23 = 25 → totalPages = 2 a CATEGORY_PAGE_SIZE=24), se verifica
// /public/eliathi-modas/categories/jeans/products, y se borra todo al final
// (productos directo en DB — no hay DELETE /admin/products — y el admin
// temporal vía API + Supabase).
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

const NAME_PREFIX = "T20-05-temp-";
const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2005temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2005temp!pass-9Xk2";

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
  if (!res.ok) throw new Error(`login ${email}: ${JSON.stringify(body)}`);
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

async function cleanupProducts() {
  const deleted = await sql`delete from products where name like ${NAME_PREFIX + "%"} returning id`;
  return deleted.length;
}

async function cleanupTempAdmin() {
  await sql`delete from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

try {
  console.log("— Pre-cleanup —");
  console.log(`  productos residuales borrados: ${await cleanupProducts()}`);
  await cleanupTempAdmin();

  console.log("\n1) Ubicar org real (Eliathi Modas) + categoría Jeans");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  check("org eliathi-modas encontrada", !!org, JSON.stringify(org));
  const [cat] = await sql`select id from categories where org_id = ${org.id} and slug = 'jeans'`;
  check("categoría jeans encontrada", !!cat, JSON.stringify(cat));

  console.log("\n2) Crear admin staff temporal en la org real");
  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const created = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", created.status === 201, JSON.stringify(created.body));
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  console.log("\n3) Crear 23 productos temporales en Jeans (2 reales + 23 = 25 → 2 páginas)");
  let ok = 0;
  for (let i = 1; i <= 23; i++) {
    const r = await api("POST", "/admin/products", token, {
      categoryId: cat.id,
      name: `${NAME_PREFIX}${String(i).padStart(2, "0")}`,
      price: 1000 * i,
    });
    if (r.status === 201) ok++;
  }
  check("23 productos creados", ok === 23, `= ${ok}`);

  console.log("\n4) Verificar /public/eliathi-modas/categories/jeans/products");
  const p1 = await fetch(`${API}/public/eliathi-modas/categories/jeans/products?page=1`).then((r) => r.json());
  check("totalCount = 25", p1.totalCount === 25, `= ${p1.totalCount}`);
  check("totalPages = 2", p1.totalPages === 2, `= ${p1.totalPages}`);
  check("page 1 trae 24 productos", p1.products.length === 24, `= ${p1.products.length}`);

  const p2 = await fetch(`${API}/public/eliathi-modas/categories/jeans/products?page=2`).then((r) => r.json());
  check("page 2 trae 1 producto", p2.products.length === 1, `= ${p2.products.length}`);
  check(
    "page 2 no repite productos de la página 1",
    !p2.products.some((pr) => p1.products.some((p) => p.id === pr.id))
  );

  console.log("\n— Cleanup final —");
  const deleted = await cleanupProducts();
  check("productos temporales borrados", deleted === 23, `= ${deleted}`);
  await cleanupTempAdmin();
  const [{ count: leftoverAdmins }] = await sql`select count(*)::int as count from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  check("admin temporal borrado", leftoverAdmins === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupProducts();
    await cleanupTempAdmin();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
