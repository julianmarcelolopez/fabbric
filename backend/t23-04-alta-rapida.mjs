// T23/04 — verifica POST /admin/products/alta-rapida: crea producto+variante
// atómicamente (visibleInCatalog false, stockLocal 1 fijos), rechaza
// categoryId inválido/ajeno sin crear nada, rechaza barcode duplicado en la
// MISMA org con 409 sin dejar nada escrito, permite el mismo barcode en
// otra org, y aísla por organización. Crea datos temporales y los borra.
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
  const slug = `t23-04-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2304${tag}${STAMP}@gmail.com`;
  const password = "T2304temp!pass-6Ht2";

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

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { orgId: org.id, userId: created.user.id, categoryId: cat.id, token: signIn.session.access_token };
}

async function post(path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

async function cleanup(orgIds, userIds) {
  await sql`delete from product_variants where org_id = any(${orgIds})`;
  await sql`delete from products where org_id = any(${orgIds})`;
  await sql`delete from categories where org_id = any(${orgIds})`;
  await sql`delete from admin_users where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
  for (const id of userIds) await supa.auth.admin.deleteUser(id).catch(() => {});
}

async function main() {
  console.log("T23/04 — POST /admin/products/alta-rapida\n");

  const a = await makeAdminOrg("a");
  const b = await makeAdminOrg("b");
  const orgIds = [a.orgId, b.orgId];
  const userIds = [a.userId, b.userId];

  const BARCODE = `TEST-ALTA-${STAMP}`;

  try {
    // ── Alta válida ──────────────────────────────────────────────────────
    const r1 = await post("/admin/products/alta-rapida", a.token, {
      categoryId: a.categoryId,
      name: "Remera Taverniti",
      brand: "Taverniti",
      price: 25000,
      talle: "M",
      color: "Negro",
      barcode: BARCODE,
    });
    check("alta válida → 201", r1.status === 201, JSON.stringify(r1.body));
    check("product.visibleInCatalog === false", r1.body?.product?.visibleInCatalog === false);
    check("variant.stockLocal === 1", r1.body?.variant?.stockLocal === 1);
    check("variant.barcode correcto", r1.body?.variant?.barcode === BARCODE);
    check("variant.productId === product.id", r1.body?.variant?.productId === r1.body?.product?.id);

    const [prodRow] = await sql`select * from products where id = ${r1.body.product.id}`;
    check("producto persistido con los datos correctos", prodRow?.name === "Remera Taverniti" && prodRow?.price === 25000);

    // ── categoryId inválido ─────────────────────────────────────────────
    const [{ count: prodsBefore }] = await sql`select count(*)::int as count from products where org_id = ${a.orgId}`;
    const r2 = await post("/admin/products/alta-rapida", a.token, {
      categoryId: "00000000-0000-0000-0000-000000000000",
      name: "Producto inválido",
      price: 1000,
      talle: "M",
      color: "Negro",
      barcode: `OTRO-${STAMP}`,
    });
    check("categoryId inexistente → 400", r2.status === 400, JSON.stringify(r2.body));
    const [{ count: prodsAfterInvalidCat }] = await sql`select count(*)::int as count from products where org_id = ${a.orgId}`;
    check("no se creó nada con categoría inválida", prodsAfterInvalidCat === prodsBefore);

    // ── categoryId de otra organización ─────────────────────────────────
    const r3 = await post("/admin/products/alta-rapida", a.token, {
      categoryId: b.categoryId,
      name: "Producto cruzado",
      price: 1000,
      talle: "M",
      color: "Negro",
      barcode: `CRUZ-${STAMP}`,
    });
    check("categoryId de otra org → 400", r3.status === 400, JSON.stringify(r3.body));

    // ── barcode duplicado en la MISMA organización → 409, nada escrito ──
    const [{ count: variantsBefore }] = await sql`select count(*)::int as count from product_variants where org_id = ${a.orgId}`;
    const r4 = await post("/admin/products/alta-rapida", a.token, {
      categoryId: a.categoryId,
      name: "Remera repetida",
      price: 30000,
      talle: "L",
      color: "Azul",
      barcode: BARCODE, // mismo código que la primera alta
    });
    check("barcode duplicado en la misma org → 409 conflict", r4.status === 409 && r4.body?.error?.code === "conflict", JSON.stringify(r4.body));
    const [{ count: prodsAfterDup }] = await sql`select count(*)::int as count from products where org_id = ${a.orgId}`;
    const [{ count: variantsAfterDup }] = await sql`select count(*)::int as count from product_variants where org_id = ${a.orgId}`;
    check("no quedó un producto huérfano tras el 409 (conteo sin cambios)", prodsAfterDup === prodsBefore);
    check("no quedó ninguna variante nueva tras el 409", variantsAfterDup === variantsBefore);

    // ── mismo barcode en OTRA organización → permitido ───────────────────
    const r5 = await post("/admin/products/alta-rapida", b.token, {
      categoryId: b.categoryId,
      name: "Remera de otra tienda",
      price: 20000,
      talle: "S",
      color: "Blanco",
      barcode: BARCODE, // mismo código, otra org
    });
    check("mismo barcode en otra organización → 201, permitido", r5.status === 201, JSON.stringify(r5.body));

    // ── sin token ──────────────────────────────────────────────────────
    const r6 = await fetch(`${API}/admin/products/alta-rapida`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: a.categoryId,
        name: "Sin auth",
        price: 1000,
        talle: "M",
        color: "Negro",
        barcode: `NOAUTH-${STAMP}`,
      }),
    });
    check("sin token → 401", r6.status === 401);
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
