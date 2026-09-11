// T25/03 — verifica POST /admin/invoices/:id/retry:
// - reintenta una factura en `error` (org de prueba sin config AFIP → sigue
//   fallando, pero confirma que el endpoint corre la misma lógica) y con
//   config real de Eliathi copiada → pasa a `emitida` con CAE real.
// - factura ya `emitida` → 409, sin volver a llamar a AFIP.
// - aislamiento por organización → 404.
// Org descartable, se borra al final.
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

async function makeOrg(tag, withAfipConfig) {
  const slug = `t25-03-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2503${tag}${STAMP}@gmail.com`;
  const password = "T2503temp!pass-9Rk3";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Remera de prueba', 'Taverniti', 25000) returning id`;
  const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'M', 'Negro', 10) returning id`;

  if (withAfipConfig) {
    const [eliathiCfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
    await sql`
      insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
      values (${org.id}, ${slug}, ${slug}, ${eliathiCfg.afip_cuit}, ${eliathiCfg.afip_punto_venta}, ${eliathiCfg.afip_ambiente}, ${eliathiCfg.afip_certificado}, ${eliathiCfg.afip_clave_privada}, ${eliathiCfg.afip_access_token})`;
  } else {
    await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  }

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { orgId: org.id, userId: created.user.id, variantId: variant.id, token: signIn.session.access_token };
}

async function ventaConFactura(variantId, token) {
  const res = await fetch(`${API}/admin/orders/venta-local`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ variantId, qty: 1 }],
      medioPago: "efectivo",
      factura: { nombre: "Cliente Retry", email: "cliente-retry@example.com", dni: "30111222" },
    }),
  });
  return res.json();
}

async function retry(id, token) {
  const res = await fetch(`${API}/admin/invoices/${id}/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
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
  await sql`delete from catalog_configs where org_id = any(${orgIds})`;
  await sql`delete from admin_users where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
  for (const id of userIds) {
    await supa.auth.admin.deleteUser(id).catch(() => {});
  }
}

async function main() {
  console.log("T25/03 — POST /admin/invoices/:id/retry\n");

  const withConfig = await makeOrg("ok", true);
  const withoutConfig = await makeOrg("bad", false);

  try {
    // Caso 1 — reintento exitoso: primer intento falla (sin config todavía en
    // el momento de la venta no aplica acá, así que forzamos vía una venta en
    // la org SIN config para dejarla en error, luego "arreglamos" copiándole
    // la config real y reintentamos)
    const r1 = await ventaConFactura(withoutConfig.variantId, withoutConfig.token);
    check("venta en org sin config → factura en error", r1?.factura?.estado === "error", JSON.stringify(r1?.factura));

    // "Arreglamos" la config de esa org (simula que se cargó después)
    const [eliathiCfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
    await sql`update catalog_configs set afip_cuit = ${eliathiCfg.afip_cuit}, afip_punto_venta = ${eliathiCfg.afip_punto_venta}, afip_ambiente = ${eliathiCfg.afip_ambiente}, afip_certificado = ${eliathiCfg.afip_certificado}, afip_clave_privada = ${eliathiCfg.afip_clave_privada}, afip_access_token = ${eliathiCfg.afip_access_token} where org_id = ${withoutConfig.orgId}`;

    const rRetry1 = await retry(r1.factura.id, withoutConfig.token);
    check("retry → 200", rRetry1.status === 200, JSON.stringify(rRetry1.body));
    check("retry → estado emitida", rRetry1.body?.estado === "emitida", JSON.stringify(rRetry1.body));
    check("retry → CAE presente", !!rRetry1.body?.cae);

    // Caso 2 — reintentar una factura ya emitida → 409, sin volver a llamar a AFIP
    const rRetryAgain = await retry(r1.factura.id, withoutConfig.token);
    check("retry sobre factura ya emitida → 409", rRetryAgain.status === 409, JSON.stringify(rRetryAgain.body));
    const [invRow] = await sql`select numero from invoices where id = ${r1.factura.id}`;
    check("el número de comprobante no cambió tras el 409", invRow.numero === rRetry1.body.numero);

    // Caso 3 — aislamiento por organización: la otra org no puede reintentar esta factura
    const rCross = await retry(r1.factura.id, withConfig.token);
    check("reintentar factura de otra org → 404", rCross.status === 404, JSON.stringify(rCross.body));

    // Caso 4 — factura inexistente → 404
    const rNotFound = await retry("00000000-0000-0000-0000-000000000000", withConfig.token);
    check("factura inexistente → 404", rNotFound.status === 404);
  } finally {
    await cleanup([withConfig.orgId, withoutConfig.orgId], [withConfig.userId, withoutConfig.userId]);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = any(${[withConfig.orgId, withoutConfig.orgId]})`;
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
