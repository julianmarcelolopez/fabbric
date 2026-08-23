// T23/02 — verifica GET /admin/variants/by-barcode/:code: encuentra la
// variante correcta con producto/categoría/imagen/stockLocal, 404 si no
// existe, y 404 (no 403) si el barcode es de otra organización. Crea datos
// temporales (2 orgs, admins, categorías, productos, variantes) y los borra
// al final.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

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

const STAMP = Date.now();

async function makeAdminOrg(tag) {
  const slug = `t23-02-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2302${tag}${STAMP}@gmail.com`;
  const password = "T2302temp!pass-9Rk3";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`
    insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`
    insert into products (org_id, category_id, name, brand, price)
    values (${org.id}, ${cat.id}, 'Remera de prueba', 'Taverniti', 25000) returning id`;

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return {
    orgId: org.id,
    userId: created.user.id,
    categoryId: cat.id,
    productId: prod.id,
    token: signIn.session.access_token,
  };
}

async function get(path, token) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function cleanup(orgIds, userIds) {
  await sql`delete from product_images where product_id in (select id from products where org_id = any(${orgIds}))`;
  await sql`delete from product_variants where org_id = any(${orgIds})`;
  await sql`delete from products where org_id = any(${orgIds})`;
  await sql`delete from categories where org_id = any(${orgIds})`;
  await sql`delete from admin_users where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
  for (const id of userIds) {
    await supa.auth.admin.deleteUser(id).catch(() => {});
  }
}

async function main() {
  console.log("T23/02 — GET /admin/variants/by-barcode/:code\n");

  const a = await makeAdminOrg("a");
  const b = await makeAdminOrg("b");
  const orgIds = [a.orgId, b.orgId];
  const userIds = [a.userId, b.userId];

  const BARCODE = `TEST-BC-${STAMP}`;

  const [variant] = await sql`
    insert into product_variants (product_id, org_id, talle, color, barcode, stock_local)
    values (${a.productId}, ${a.orgId}, 'M', 'Negro', ${BARCODE}, 7) returning id`;
  await sql`
    insert into product_images (product_id, org_id, storage_path, url, sort_order)
    values (${a.productId}, ${a.orgId}, 'fake/path.jpg', 'https://example.com/fake.jpg', 0)`;

  try {
    // Encontrado, con datos completos
    const r1 = await get(`/admin/variants/by-barcode/${BARCODE}`, a.token);
    check("barcode existente → 200", r1.status === 200, JSON.stringify(r1.body));
    check("id de variante correcto", r1.body?.id === variant.id);
    check("product.name correcto", r1.body?.product?.name === "Remera de prueba");
    check("product.brand correcto", r1.body?.product?.brand === "Taverniti");
    check("category.name presente", r1.body?.category?.name === `t23-02-a-${STAMP}`);
    check("stockLocal correcto", r1.body?.stockLocal === 7);
    check("imageUrl presente", r1.body?.imageUrl === "https://example.com/fake.jpg");

    // No encontrado
    const r2 = await get(`/admin/variants/by-barcode/NO-EXISTE-${STAMP}`, a.token);
    check("barcode inexistente → 404", r2.status === 404, JSON.stringify(r2.body));

    // Existe pero es de OTRA organización → 404, no 403
    const r3 = await get(`/admin/variants/by-barcode/${BARCODE}`, b.token);
    check("barcode de otra organización → 404 (no 403)", r3.status === 404, JSON.stringify(r3.body));

    // Sin token → 401
    const r4 = await fetch(`${API}/admin/variants/by-barcode/${BARCODE}`);
    check("sin token → 401", r4.status === 401);
  } finally {
    await cleanup(orgIds, userIds);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = any(${orgIds})`;
    check("datos de prueba limpiados", leftover.n === 0);
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  await sql.end();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
