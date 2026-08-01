// T21/05 — verificación real de filtros/orden combinados con datos
// controlados: categoría temporal + 3 productos con variantes conocidas, para
// poder predecir exactamente qué debería devolver cada combinación de
// filtros. Cubre: talle solo, color solo, talle+color combinados (misma
// variante), talle sin stock (no debe matchear), marca, rango de precio,
// sort (los 3 valores), y que availableFilters refleje TODA la categoría
// (no lo que queda tras filtrar). Borra todo al final.
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

const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t2105temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T2105temp!pass-5Bk8";
const CAT_SLUG = "t21-05-temp-categoria";

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

async function cleanupCategory() {
  const [cat] = await sql`select id from categories where slug = ${CAT_SLUG}`;
  if (cat) {
    const prods = await sql`select id from products where category_id = ${cat.id}`;
    for (const p of prods) {
      await sql`delete from product_variants where product_id = ${p.id}`;
      await sql`delete from products where id = ${p.id}`;
    }
    await sql`delete from home_sections where ref_type = 'category' and ref_id = ${cat.id}`;
    await sql`delete from categories where id = ${cat.id}`;
  }
}

async function cleanupTempAdmin() {
  await sql`delete from admin_users where email = ${TEMP_ADMIN_EMAIL}`;
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

function ids(products) {
  return products.map((p) => p.id).sort();
}

try {
  console.log("— Pre-cleanup —");
  await cleanupCategory();
  await cleanupTempAdmin();

  console.log("\n1) Admin staff temporal + categoría temporal");
  const [org] = await sql`select org_id as id from catalog_configs where slug = 'eliathi-modas'`;
  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const createdAdmin = await api("POST", `/superadmin/organizations/${org.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL,
    password: TEMP_ADMIN_PASSWORD,
    role: "staff",
  });
  check("admin temporal creado", createdAdmin.status === 201);
  const token = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  const cat = await api("POST", "/admin/categories", token, { name: "T21-05 Temp", slug: CAT_SLUG });
  check("categoría creada", cat.status === 201, JSON.stringify(cat.body));

  console.log("\n2) Armar 3 productos con variantes conocidas");
  // A: MarcaA, $100.00, talle M/Rojo stock 5, talle L/Rojo stock 0 (sin stock)
  const a = await api("POST", "/admin/products", token, {
    categoryId: cat.body.id,
    name: "T21-05 Producto A",
    price: 10000,
    brand: "MarcaA",
  });
  await api("POST", `/admin/products/${a.body.id}/variants`, token, { talle: "M", color: "Rojo", stockOnline: 5 });
  await api("POST", `/admin/products/${a.body.id}/variants`, token, { talle: "L", color: "Rojo", stockOnline: 0 });

  // B: MarcaB, $200.00, talle M/Azul stock 3
  const b = await api("POST", "/admin/products", token, {
    categoryId: cat.body.id,
    name: "T21-05 Producto B",
    price: 20000,
    brand: "MarcaB",
  });
  await api("POST", `/admin/products/${b.body.id}/variants`, token, { talle: "M", color: "Azul", stockOnline: 3 });

  // C: MarcaA, $300.00, talle S/Rojo stock 2
  const c = await api("POST", "/admin/products", token, {
    categoryId: cat.body.id,
    name: "T21-05 Producto C",
    price: 30000,
    brand: "MarcaA",
  });
  await api("POST", `/admin/products/${c.body.id}/variants`, token, { talle: "S", color: "Rojo", stockOnline: 2 });

  check("3 productos creados", a.status === 201 && b.status === 201 && c.status === 201);

  const base = `${API}/public/eliathi-modas/categories/${CAT_SLUG}/products`;

  console.log("\n3) Sin filtros — baseline");
  const all = await fetch(`${base}?page=1`).then((r) => r.json());
  check("totalCount = 3", all.totalCount === 3, all.totalCount);

  console.log("\n4) talle=M → A y B (no C)");
  const byTalle = await fetch(`${base}?talle=M`).then((r) => r.json());
  check("2 productos (A, B)", JSON.stringify(ids(byTalle.products)) === JSON.stringify(ids([a.body, b.body])), JSON.stringify(byTalle.products.map((p) => p.name)));

  console.log("\n5) color=Rojo → A y C (no B)");
  const byColor = await fetch(`${base}?color=Rojo`).then((r) => r.json());
  check("2 productos (A, C)", JSON.stringify(ids(byColor.products)) === JSON.stringify(ids([a.body, c.body])), JSON.stringify(byColor.products.map((p) => p.name)));

  console.log("\n6) talle=M&color=Rojo → solo A (misma variante, no la unión de talle=M y color=Rojo por separado)");
  const combo = await fetch(`${base}?talle=M&color=Rojo`).then((r) => r.json());
  check("1 producto (A)", combo.products.length === 1 && combo.products[0].id === a.body.id, JSON.stringify(combo.products.map((p) => p.name)));

  console.log("\n7) talle=L → 0 productos (la única variante L tiene stock 0)");
  const byTalleNoStock = await fetch(`${base}?talle=L`).then((r) => r.json());
  check("0 productos", byTalleNoStock.totalCount === 0, byTalleNoStock.totalCount);

  console.log("\n8) marca=MarcaA → A y C");
  const byMarca = await fetch(`${base}?marca=MarcaA`).then((r) => r.json());
  check("2 productos (A, C)", JSON.stringify(ids(byMarca.products)) === JSON.stringify(ids([a.body, c.body])));

  console.log("\n9) precioMin=15000&precioMax=25000 → solo B");
  const byPrecio = await fetch(`${base}?precioMin=15000&precioMax=25000`).then((r) => r.json());
  check("1 producto (B)", byPrecio.products.length === 1 && byPrecio.products[0].id === b.body.id);

  console.log("\n10) Combinado: marca=MarcaA + precioMin=20000 → solo C");
  const combined = await fetch(`${base}?marca=MarcaA&precioMin=20000`).then((r) => r.json());
  check("1 producto (C)", combined.products.length === 1 && combined.products[0].id === c.body.id);

  console.log("\n11) sort=precio_asc / precio_desc / nuevos");
  const sortAsc = await fetch(`${base}?sort=precio_asc`).then((r) => r.json());
  check("asc: A, B, C", sortAsc.products.map((p) => p.id).join() === [a.body.id, b.body.id, c.body.id].join());
  const sortDesc = await fetch(`${base}?sort=precio_desc`).then((r) => r.json());
  check("desc: C, B, A", sortDesc.products.map((p) => p.id).join() === [c.body.id, b.body.id, a.body.id].join());
  const sortNew = await fetch(`${base}?sort=nuevos`).then((r) => r.json());
  check("nuevos: C, B, A (creados en ese orden)", sortNew.products.map((p) => p.id).join() === [c.body.id, b.body.id, a.body.id].join());

  console.log("\n12) availableFilters refleja TODA la categoría, no lo ya filtrado");
  const filteredView = await fetch(`${base}?talle=M`).then((r) => r.json());
  check("talles incluye S aunque el filtro actual sea talle=M", filteredView.availableFilters.talles.includes("S"), JSON.stringify(filteredView.availableFilters));
  check("talles NO incluye L (0 stock)", !filteredView.availableFilters.talles.includes("L"), JSON.stringify(filteredView.availableFilters.talles));
  check("colores = [Azul, Rojo]", JSON.stringify(filteredView.availableFilters.colores) === JSON.stringify(["Azul", "Rojo"]));
  check("marcas = [MarcaA, MarcaB]", JSON.stringify(filteredView.availableFilters.marcas) === JSON.stringify(["MarcaA", "MarcaB"]));

  console.log("\n13) Sin filtros/orden, comportamiento idéntico al de antes (orden sortOrder,name)");
  check("orden default: A, B, C (orden de creación == sortOrder 0 + nombre)", all.products.map((p) => p.id).join() === [a.body.id, b.body.id, c.body.id].join());

  console.log("\n— Cleanup final —");
  await cleanupCategory();
  await cleanupTempAdmin();
  const [{ count: leftovers }] = await sql`select count(*)::int as count from categories where slug = ${CAT_SLUG}`;
  check("sin residuos en DB", leftovers === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupCategory();
    await cleanupTempAdmin();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
