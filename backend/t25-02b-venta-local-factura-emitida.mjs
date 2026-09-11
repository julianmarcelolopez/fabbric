// T25/02b — camino feliz completo: venta-local con factura, AFIP responde
// bien, la factura queda `emitida` con CAE real. Usa una org descartable a la
// que se le copia (solo lectura del lado de Eliathi) la config AFIP real de
// homologación, para no tocar la organización real ni sus datos.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const ELIATHI_ORG_ID = "e40f82d5-2b75-49ce-a2e3-1bdf415d82b1";
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

async function main() {
  console.log("T25/02b — venta-local con factura, camino feliz (AFIP responde OK)\n");

  const slug = `t25-02b-${STAMP}`;
  const email = `julianmarcelolopez+t2502b${STAMP}@gmail.com`;
  const password = "T2502btemp!pass-9Rk3";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Remera de prueba', 'Taverniti', 25000) returning id`;
  const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'M', 'Negro', 10) returning id`;

  // Copia SOLO LECTURA de la config AFIP real de Eliathi hacia la org descartable
  const [eliathiCfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
  await sql`
    insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
    values (${org.id}, ${slug}, ${slug}, ${eliathiCfg.afip_cuit}, ${eliathiCfg.afip_punto_venta}, ${eliathiCfg.afip_ambiente}, ${eliathiCfg.afip_certificado}, ${eliathiCfg.afip_clave_privada}, ${eliathiCfg.afip_access_token})`;

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
        factura: { nombre: "Cliente Feliz", email: "cliente-feliz@example.com", dni: "30111222" },
      }),
    });
    const body = await res.json().catch(() => null);

    check("201", res.status === 201, JSON.stringify(body));
    check("pedido paid", body?.status === "paid");
    check("factura estado emitida", body?.factura?.estado === "emitida", JSON.stringify(body?.factura));
    check("CAE presente", !!body?.factura?.cae);
    check("caeVencimiento presente", !!body?.factura?.caeVencimiento);
    check("numero presente", typeof body?.factura?.numero === "number");
    check("mensajeError null", body?.factura?.mensajeError === null);

    const [invRow] = await sql`select estado, cae, numero, cae_vencimiento from invoices where order_id = ${body.id}`;
    check("la fila en la base coincide con la respuesta", invRow?.estado === "emitida" && invRow?.cae === body.factura.cae);

    console.log(`\n  Factura real emitida: CAE ${body.factura.cae}, comprobante #${body.factura.numero}, vence ${body.factura.caeVencimiento}`);
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

    // Confirmación de que la org real de Eliathi no se tocó
    const [eliathiCheck] = await sql`select afip_cuit from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
    check("config real de Eliathi intacta", eliathiCheck.afip_cuit === eliathiCfg.afip_cuit);
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
