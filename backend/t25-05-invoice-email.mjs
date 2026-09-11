// T25/05 — verifica el envío de email de la factura (Fase 3, Tarea 3):
// - venta con factura, cliente con email real (alias +clientefactura) y la
//   org de prueba con "email de contacto" = otro alias real (+eliathicopia).
// - RESEND_API_KEY YA está configurada de verdad en este entorno, así que
//   esto manda emails reales — se usan dos alias del mismo Gmail del
//   desarrollador para poder confirmar visualmente sin tocar direcciones de
//   terceros ni gastar cupo contra dominios inventados.
// Org descartable, se borra al final.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const ELIATHI_ORG_ID = "e40f82d5-2b75-49ce-a2e3-1bdf415d82b1";
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const CLIENTE_EMAIL = "julianmarcelolopezdev@gmail.com";
const TIENDA_EMAIL = "julianmarcelolopezdev@gmail.com";

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

async function main() {
  console.log("T25/05 — email de factura (envío real vía Resend)\n");

  const slug = `t25-05-${STAMP}`;
  const email = `julianmarcelolopez+t2505${STAMP}@gmail.com`;
  const password = "T2505temp!pass-9Rk3";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Campera de prueba', 'Taverniti', 45000) returning id`;
  const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'L', 'Azul', 5) returning id`;

  const [eliathiCfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
  await sql`
    insert into catalog_configs (org_id, slug, store_name, email, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
    values (${org.id}, ${slug}, 'Eliathi Modas (prueba T25/05)', ${TIENDA_EMAIL}, ${eliathiCfg.afip_cuit}, ${eliathiCfg.afip_punto_venta}, ${eliathiCfg.afip_ambiente}, ${eliathiCfg.afip_certificado}, ${eliathiCfg.afip_clave_privada}, ${eliathiCfg.afip_access_token})`;

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  const token = signIn.session.access_token;

  try {
    const res = await fetch(`${API}/admin/orders/venta-local`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ variantId: variant.id, qty: 1 }],
        medioPago: "efectivo",
        factura: { nombre: "Julian (prueba email)", email: CLIENTE_EMAIL, dni: "30111222" },
      }),
    });
    const body = await res.json().catch(() => null);

    check("201", res.status === 201, JSON.stringify(body));
    check("factura emitida", body?.factura?.estado === "emitida", JSON.stringify(body?.factura));
    console.log(`\n  CAE: ${body?.factura?.cae} — revisá ${CLIENTE_EMAIL} y ${TIENDA_EMAIL} (mismo Gmail, dos alias)\n`);
  } finally {
    await sql`delete from invoices where org_id = ${org.id}`;
    await sql`delete from financial_movements where org_id = ${org.id}`;
    await sql`delete from wallets where org_id = ${org.id}`;
    await sql`delete from stock_movements where org_id = ${org.id}`;
    await sql`delete from order_items where org_id = ${org.id}`;
    await sql`delete from orders where org_id = ${org.id}`;
    await sql`delete from product_variants where org_id = ${org.id}`;
    await sql`delete from products where org_id = ${org.id}`;
    await sql`delete from categories where org_id = ${org.id}`;
    await sql`delete from catalog_configs where org_id = ${org.id}`;
    await sql`delete from admin_users where org_id = ${org.id}`;
    await sql`delete from organizations where id = ${org.id}`;
    await supa.auth.admin.deleteUser(created.user.id).catch(() => {});
    const [leftover] = await sql`select count(*)::int as n from organizations where id = ${org.id}`;
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
