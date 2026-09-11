// T25/02 — verifica que POST /admin/orders/venta-local:
// - sin `factura` en el body: comportamiento idéntico a T23 (sin fila en invoices).
// - con `factura`: crea la fila `pendiente` e intenta la emisión (queda `error`,
//   porque esta org descartable no tiene config AFIP — es justo el caso que
//   prueba que un fallo de AFIP NO revierte la venta).
// Org descartable, se borra al final.
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

async function makeAdminOrgWithVariant() {
  const slug = `t25-02-${STAMP}`;
  const email = `julianmarcelolopez+t2502${STAMP}@gmail.com`;
  const password = "T2502temp!pass-9Rk3";

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
  const [variant] = await sql`
    insert into product_variants (product_id, org_id, talle, color, stock_local)
    values (${prod.id}, ${org.id}, 'M', 'Negro', 10) returning id`;

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { orgId: org.id, userId: created.user.id, variantId: variant.id, token: signIn.session.access_token };
}

async function post(path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await res.json().catch(() => null);
  return { status: res.status, body: responseBody };
}

async function cleanup(orgIds, userIds) {
  await sql`delete from invoices where org_id = any(${orgIds})`;
  await sql`delete from financial_movements where org_id = any(${orgIds})`;
  await sql`delete from wallets where org_id = any(${orgIds})`;
  await sql`delete from stock_movements where org_id = any(${orgIds})`;
  await sql`delete from order_items where org_id = any(${orgIds})`;
  await sql`delete from orders where org_id = any(${orgIds})`;
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
  console.log("T25/02 — POST /admin/orders/venta-local con factura opcional\n");

  const a = await makeAdminOrgWithVariant();

  try {
    // Caso 1 — sin factura: comportamiento idéntico a T23
    const r1 = await post("/admin/orders/venta-local", a.token, {
      items: [{ variantId: a.variantId, qty: 1 }],
      medioPago: "efectivo",
    });
    check("sin factura → 201", r1.status === 201, JSON.stringify(r1.body));
    check("sin factura → factura: null en la respuesta", r1.body?.factura === null, JSON.stringify(r1.body?.factura));

    const [invoicesSinFactura] = await sql`select count(*)::int as n from invoices where order_id = ${r1.body.id}`;
    check("sin factura → cero filas en invoices", invoicesSinFactura.n === 0);

    // Caso 2 — con factura, esta org NO tiene config AFIP → debe fallar la
    // emisión SIN afectar la venta (justo el escenario que prueba la decisión
    // "un fallo de AFIP no revierte la venta ya cobrada").
    const r2 = await post("/admin/orders/venta-local", a.token, {
      items: [{ variantId: a.variantId, qty: 2 }],
      medioPago: "transferencia",
      factura: { nombre: "Cliente de Prueba", email: "cliente@example.com", dni: "30111222" },
    });
    check("con factura → 201 (la venta se confirma igual)", r2.status === 201, JSON.stringify(r2.body));
    check("pedido queda paid", r2.body?.status === "paid");
    check("factura viene en la respuesta con estado error", r2.body?.factura?.estado === "error", JSON.stringify(r2.body?.factura));
    check("mensajeError presente", !!r2.body?.factura?.mensajeError);

    const [variantAfter] = await sql`select stock_local from product_variants where id = ${a.variantId}`;
    check("stock se descontó igual (10 - 1 - 2 = 7)", variantAfter.stock_local === 7, `stockLocal=${variantAfter.stock_local}`);

    const [movRow] = await sql`select count(*)::int as n from financial_movements where order_id = ${r2.body.id}`;
    check("movimiento financiero registrado igual", movRow.n === 1);

    const [invRow] = await sql`select estado, mensaje_error, cliente_nombre, cliente_email, cliente_dni from invoices where order_id = ${r2.body.id}`;
    check("fila de invoices existe con estado error", invRow?.estado === "error", JSON.stringify(invRow));
    check("datos del cliente guardados", invRow?.cliente_nombre === "Cliente de Prueba" && invRow?.cliente_email === "cliente@example.com" && invRow?.cliente_dni === "30111222");

    // Constraint de unicidad orderId: no se puede insertar una segunda factura para el mismo pedido
    let dupFailed = false;
    try {
      await sql`insert into invoices (org_id, order_id) values (${a.orgId}, ${r2.body.id})`;
    } catch {
      dupFailed = true;
    }
    check("constraint de unicidad orderId funciona", dupFailed);
  } finally {
    await cleanup([a.orgId], [a.userId]);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = ${a.orgId}`;
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
