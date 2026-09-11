// T25 Fase 7 — genera una factura real (org descartable con la config AFIP de
// Eliathi copiada) y guarda el PDF en el scratchpad para que el usuario lo
// escanee con el celular. Limpia los datos de prueba, deja el PDF.
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { generarInvoicePdf } from "./src/modules/invoices/pdf.js";

const API = "http://localhost:4000";
const ELIATHI_ORG_ID = "e40f82d5-2b75-49ce-a2e3-1bdf415d82b1";
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const STAMP = Date.now();

async function main() {
  const email = `julianmarcelolopez+scan${STAMP}@gmail.com`;
  const password = "ScanTemp!pass-9Rk3";
  const { data: created } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  const slug = `scan-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Campera para escanear', 'Taverniti', 180000) returning id`;
  const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'L', 'Negro', 5) returning id`;
  const [cfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
  await sql`
    insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
    values (${org.id}, ${slug}, 'Eliathi Modas', ${cfg.afip_cuit}, ${cfg.afip_punto_venta}, ${cfg.afip_ambiente}, ${cfg.afip_certificado}, ${cfg.afip_clave_privada}, ${cfg.afip_access_token})`;

  const { data: signIn } = await supa.auth.signInWithPassword({ email, password });
  const token = signIn.session.access_token;

  const res = await fetch(`${API}/admin/orders/venta-local`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ variantId: variant.id, qty: 1 }],
      medioPago: "efectivo",
      factura: { nombre: "Julian Lopez", email: "julianmarcelolopezdev@gmail.com", dni: "30455600" },
    }),
  });
  const body = await res.json();
  console.log("Factura:", body.factura);

  if (body.factura?.estado === "emitida") {
    const { buffer } = await generarInvoicePdf(org.id, body.factura.id);
    const outPath =
      "C:/Users/JULIAN~1/AppData/Local/Temp/claude/c--projects-fabbric/4050fb60-013f-42eb-baaf-0229210dce3a/scratchpad/factura-para-escanear.pdf";
    writeFileSync(outPath, buffer);
    console.log("PDF guardado en:", outPath);
  }

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
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
