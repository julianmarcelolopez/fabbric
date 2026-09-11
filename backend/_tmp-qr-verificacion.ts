// T25 Fase 7 — genera una factura real (org descartable con la config AFIP de
// Eliathi copiada) y arma la URL exacta que codifica su QR, para verificarla
// contra el verificador oficial de AFIP/ARCA. Script temporal.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { buildQrText } from "./src/modules/invoices/pdf.js";
import { db } from "./src/db/client.js";
import { invoices } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

const API = "http://localhost:4000";
const ELIATHI_ORG_ID = "e40f82d5-2b75-49ce-a2e3-1bdf415d82b1";
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const STAMP = Date.now();

async function main() {
  const email = `julianmarcelolopez+qrcheck${STAMP}@gmail.com`;
  const password = "QrCheckTemp!pass-9Rk3";
  const { data: created } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  const slug = `qrcheck-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Verificacion QR', 'Taverniti', 250000) returning id`;
  const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'M', 'Negro', 5) returning id`;
  const [cfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
  await sql`
    insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
    values (${org.id}, ${slug}, ${slug}, ${cfg.afip_cuit}, ${cfg.afip_punto_venta}, ${cfg.afip_ambiente}, ${cfg.afip_certificado}, ${cfg.afip_clave_privada}, ${cfg.afip_access_token})`;

  const { data: signIn } = await supa.auth.signInWithPassword({ email, password });
  const token = signIn.session.access_token;

  const res = await fetch(`${API}/admin/orders/venta-local`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ variantId: variant.id, qty: 1 }],
      medioPago: "efectivo",
      factura: { nombre: "Verificacion QR", email: "qr-check@example.com", dni: "30111222" },
    }),
  });
  const body = await res.json();
  console.log("Factura:", body.factura);

  const [invoiceRow] = await db.select().from(invoices).where(eq(invoices.id, body.factura.id));
  const qrUrl = buildQrText({
    fecha: invoiceRow.fecha,
    cuit: cfg.afip_cuit,
    ptoVta: cfg.afip_punto_venta,
    numero: invoiceRow.numero,
    importeCents: 250000,
    cae: invoiceRow.cae,
    dniComprador: invoiceRow.clienteDni,
  });
  console.log("\nURL del QR:\n" + qrUrl);

  // Limpieza
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
