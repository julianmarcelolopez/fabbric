// T25/04 — verifica GET /admin/invoices/:id/pdf:
// - factura emitida → 200, PDF real (magic bytes %PDF), Content-Disposition
//   con el nombre formateado PPPP-NNNNNNNN.
// - factura no emitida (pendiente/error) → 409, no un PDF vacío/roto.
// - factura de otra organización → 404.
// - factura inexistente → 404.
// Org descartable con config AFIP real de Eliathi copiada (solo lectura).
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
  const slug = `t25-04-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2504${tag}${STAMP}@gmail.com`;
  const password = "T2504temp!pass-9Rk3";

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
      factura: { nombre: "Cliente PDF", email: "cliente-pdf@example.com", dni: "30111222" },
    }),
  });
  return res.json();
}

async function getPdf(invoiceId, token) {
  const res = await fetch(`${API}/admin/invoices/${invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = res.headers.get("content-type");
  const disposition = res.headers.get("content-disposition");
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, contentType, disposition, buffer };
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
  console.log("T25/04 — GET /admin/invoices/:id/pdf\n");

  const withConfig = await makeOrg("ok", true);
  const withoutConfig = await makeOrg("bad", false);

  try {
    // Caso 1 — factura emitida → PDF real
    const venta = await ventaConFactura(withConfig.variantId, withConfig.token);
    check("venta con factura → emitida", venta?.factura?.estado === "emitida", JSON.stringify(venta?.factura));

    const pdf1 = await getPdf(venta.factura.id, withConfig.token);
    check("GET pdf de factura emitida → 200", pdf1.status === 200);
    check("Content-Type application/pdf", pdf1.contentType?.includes("application/pdf"), pdf1.contentType);
    check("Content-Disposition con nombre formateado", /attachment; filename="factura-\d{4}-\d{8}\.pdf"/.test(pdf1.disposition ?? ""), pdf1.disposition);
    check("magic bytes %PDF", pdf1.buffer.subarray(0, 4).toString("ascii") === "%PDF");
    check("tamaño razonable (no vacío)", pdf1.buffer.length > 1000, `${pdf1.buffer.length} bytes`);

    // Caso 2 — factura NO emitida (org sin config → queda en error) → 409
    const ventaError = await ventaConFactura(withoutConfig.variantId, withoutConfig.token);
    check("venta sin config AFIP → factura en error", ventaError?.factura?.estado === "error", JSON.stringify(ventaError?.factura));
    const pdf2 = await getPdf(ventaError.factura.id, withoutConfig.token);
    check("GET pdf de factura no emitida → 409", pdf2.status === 409, JSON.stringify(pdf2.status));

    // Caso 3 — aislamiento por organización
    const pdfCross = await getPdf(venta.factura.id, withoutConfig.token);
    check("GET pdf de factura de otra org → 404", pdfCross.status === 404);

    // Caso 4 — factura inexistente
    const pdfNotFound = await getPdf("00000000-0000-0000-0000-000000000000", withConfig.token);
    check("GET pdf de factura inexistente → 404", pdfNotFound.status === 404);
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
