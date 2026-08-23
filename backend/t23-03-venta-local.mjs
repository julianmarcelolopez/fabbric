// T23/03 — verifica POST /admin/orders/venta-local: venta con varias líneas
// (pedido paid + orderItems + stock descontado + movimiento financiero, todo
// en una transacción), rechazo total por stock insuficiente (sin nada
// parcial), reuso de cartera por medio de pago, "mercadopago" usando la
// MISMA cartera que el webhook online, y aislamiento por organización.
// Crea datos temporales y los borra al final.
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
  const slug = `t23-03-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2303${tag}${STAMP}@gmail.com`;
  const password = "T2303temp!pass-4Wq7";

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

async function makeProductVariant(org, { name, price, costPrice, talle, color, stockLocal }) {
  const [prod] = await sql`
    insert into products (org_id, category_id, name, brand, price, cost_price)
    values (${org.orgId}, ${org.categoryId}, ${name}, 'Taverniti', ${price}, ${costPrice}) returning id`;
  const [variant] = await sql`
    insert into product_variants (product_id, org_id, talle, color, stock_local)
    values (${prod.id}, ${org.orgId}, ${talle}, ${color}, ${stockLocal}) returning id`;
  return { productId: prod.id, variantId: variant.id };
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

async function stockLocalOf(variantId) {
  const [row] = await sql`select stock_local from product_variants where id = ${variantId}`;
  return row.stock_local;
}

async function cleanup(orgIds, userIds) {
  await sql`delete from financial_movements where org_id = any(${orgIds})`;
  await sql`delete from stock_movements where org_id = any(${orgIds})`;
  await sql`delete from order_items where org_id = any(${orgIds})`;
  await sql`delete from orders where org_id = any(${orgIds})`;
  await sql`delete from wallets where org_id = any(${orgIds})`;
  await sql`delete from product_variants where org_id = any(${orgIds})`;
  await sql`delete from products where org_id = any(${orgIds})`;
  await sql`delete from categories where org_id = any(${orgIds})`;
  await sql`delete from admin_users where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
  for (const id of userIds) await supa.auth.admin.deleteUser(id).catch(() => {});
}

async function main() {
  console.log("T23/03 — POST /admin/orders/venta-local\n");

  const a = await makeAdminOrg("a");
  const b = await makeAdminOrg("b");
  const orgIds = [a.orgId, b.orgId];
  const userIds = [a.userId, b.userId];

  const v1 = await makeProductVariant(a, {
    name: "Remera",
    price: 10000,
    costPrice: 4000,
    talle: "M",
    color: "Negro",
    stockLocal: 5,
  });
  const v2 = await makeProductVariant(a, {
    name: "Buzo",
    price: 25000,
    costPrice: 12000,
    talle: "L",
    color: "Azul",
    stockLocal: 3,
  });
  const vOther = await makeProductVariant(b, {
    name: "Campera",
    price: 50000,
    costPrice: 20000,
    talle: "S",
    color: "Rojo",
    stockLocal: 10,
  });

  try {
    // ── Venta válida con 2 líneas ────────────────────────────────────────
    const r1 = await post("/admin/orders/venta-local", a.token, {
      items: [
        { variantId: v1.variantId, qty: 2 },
        { variantId: v2.variantId, qty: 1 },
      ],
      medioPago: "efectivo",
    });
    check("venta válida → 201", r1.status === 201, JSON.stringify(r1.body));
    check("pedido nace paid", r1.body?.status === "paid");
    check("total correcto (2×10000 + 1×25000)", r1.body?.total === 45000, String(r1.body?.total));

    check("stock v1 descontado (5 → 3)", (await stockLocalOf(v1.variantId)) === 3);
    check("stock v2 descontado (3 → 2)", (await stockLocalOf(v2.variantId)) === 2);

    const items1 = await sql`select * from order_items where order_id = ${r1.body.id}`;
    check("2 orderItems creados", items1.length === 2);
    check(
      "unitCostSnapshot presente",
      items1.every((i) => i.unit_cost_snapshot !== null)
    );

    const movs1 = await sql`select * from stock_movements where org_id = ${a.orgId} and note = ${`venta local #${r1.body.orderNumber}`}`;
    check("2 stockMovements tipo venta/local", movs1.length === 2 && movs1.every((m) => m.type === "venta" && m.channel === "local"));

    const wallet1 = await sql`select * from wallets where org_id = ${a.orgId} and name = 'Efectivo'`;
    check("cartera Efectivo creada", wallet1.length === 1);
    const fin1 = await sql`select * from financial_movements where order_id = ${r1.body.id}`;
    check("movimiento financiero vinculado, monto correcto", fin1.length === 1 && fin1[0].amount === 45000);
    check("movimiento en la cartera Efectivo", fin1[0]?.wallet_id === wallet1[0]?.id);

    // ── Reuso de cartera: segunda venta en efectivo no duplica la cartera ──
    const r1b = await post("/admin/orders/venta-local", a.token, {
      items: [{ variantId: v1.variantId, qty: 1 }],
      medioPago: "efectivo",
    });
    check("segunda venta en efectivo → 201", r1b.status === 201);
    const wallet1b = await sql`select id from wallets where org_id = ${a.orgId} and name = 'Efectivo'`;
    check("sigue habiendo UNA sola cartera Efectivo", wallet1b.length === 1);

    // ── mercadopago reusa la MISMA cartera que el webhook online ──────────
    const r2 = await post("/admin/orders/venta-local", a.token, {
      items: [{ variantId: v2.variantId, qty: 1 }],
      medioPago: "mercadopago",
    });
    check("venta con mercadopago → 201", r2.status === 201, JSON.stringify(r2.body));
    const mpWallets = await sql`select id from wallets where org_id = ${a.orgId} and name = 'Mercado Pago'`;
    check("cartera 'Mercado Pago' única (misma que usa el webhook online)", mpWallets.length === 1);

    // ── Stock insuficiente: rechaza TODO, nada queda parcial ──────────────
    const stockV1Before = await stockLocalOf(v1.variantId);
    const stockV2Before = await stockLocalOf(v2.variantId);
    const [{ count: ordersBefore }] = await sql`select count(*)::int as count from orders where org_id = ${a.orgId}`;
    const [{ count: movsBefore }] = await sql`select count(*)::int as count from stock_movements where org_id = ${a.orgId}`;
    const [{ count: finBefore }] = await sql`select count(*)::int as count from financial_movements where org_id = ${a.orgId}`;

    const r3 = await post("/admin/orders/venta-local", a.token, {
      items: [
        { variantId: v1.variantId, qty: 1 }, // esta línea SÍ tiene stock — pero la operación debe abortar igual
        { variantId: v2.variantId, qty: 50 }, // esta no — queda 1 de stock a esta altura del test
      ],
      medioPago: "tarjeta",
    });
    check("stock insuficiente → 400 insufficient_stock", r3.status === 400 && r3.body?.error?.code === "insufficient_stock", JSON.stringify(r3.body));
    check("stock v1 SIN CAMBIOS (rollback de la línea previa del mismo intento)", (await stockLocalOf(v1.variantId)) === stockV1Before);
    check("stock v2 SIN CAMBIOS", (await stockLocalOf(v2.variantId)) === stockV2Before);
    const [{ count: ordersAfter }] = await sql`select count(*)::int as count from orders where org_id = ${a.orgId}`;
    check("no se creó ningún pedido nuevo", ordersAfter === ordersBefore);
    const [{ count: movsAfter }] = await sql`select count(*)::int as count from stock_movements where org_id = ${a.orgId}`;
    check("no se creó ningún movimiento de stock nuevo", movsAfter === movsBefore);
    const [{ count: finAfter }] = await sql`select count(*)::int as count from financial_movements where org_id = ${a.orgId}`;
    check("no se creó ningún movimiento financiero nuevo", finAfter === finBefore);
    const walletTarjeta = await sql`select id from wallets where org_id = ${a.orgId} and name = 'Tarjeta'`;
    check("tampoco se creó la cartera Tarjeta (nada de la operación quedó)", walletTarjeta.length === 0);

    // ── Aislamiento: variante de otra organización ─────────────────────────
    const r4 = await post("/admin/orders/venta-local", a.token, {
      items: [{ variantId: vOther.variantId, qty: 1 }],
      medioPago: "efectivo",
    });
    check("variante de otra organización → 400 invalid_items", r4.status === 400 && r4.body?.error?.code === "invalid_items", JSON.stringify(r4.body));

    // ── Sin token ──────────────────────────────────────────────────────────
    const r5 = await fetch(`${API}/admin/orders/venta-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ variantId: v1.variantId, qty: 1 }], medioPago: "efectivo" }),
    });
    check("sin token → 401", r5.status === 401);
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
