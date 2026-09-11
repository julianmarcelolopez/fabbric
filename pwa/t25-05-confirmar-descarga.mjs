// T25/Fase 5 — verifica ConfirmarScreen:
// - sin factura (toggle apagado): pantalla igual a T23, sin sección de PDF.
// - con factura y AFIP responde bien: botón "Descargar factura (PDF)" baja un
//   PDF real (se intercepta la descarga y se valida el magic byte %PDF).
// - con factura y AFIP falla (org sin config): mensaje tranquilo, sin botón.
// Dos orgs descartables, cada producto usado una sola vez. Limpia al final.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const PWA_URL = "http://localhost:5174";
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

async function makeOrg(tag, withAfipConfig, numProducts) {
  const slug = `t25-05pw-${tag}-${STAMP}`;
  const email = `julianmarcelolopez+t2505pw${tag}${STAMP}@gmail.com`;
  const password = "T2505pwTemp!pass-9Rk3";

  const { data: created } = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;

  const barcodes = [];
  for (let i = 0; i < numProducts; i++) {
    const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, ${"Producto Fase5 " + i}, 'Taverniti', 30000) returning id`;
    const barcode = `T2505PW-${tag}-${i}-${STAMP}`;
    await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'S', 'Rojo', ${barcode}, 10)`;
    barcodes.push(barcode);
  }

  if (withAfipConfig) {
    const [cfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
    await sql`
      insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
      values (${org.id}, ${slug}, ${slug}, ${cfg.afip_cuit}, ${cfg.afip_punto_venta}, ${cfg.afip_ambiente}, ${cfg.afip_certificado}, ${cfg.afip_clave_privada}, ${cfg.afip_access_token})`;
  } else {
    await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  }

  return { orgId: org.id, userId: created.user.id, email, password, barcodes };
}

async function cleanup(orgId, userId) {
  await sql`delete from invoices where org_id = ${orgId}`;
  await sql`delete from financial_movements where org_id = ${orgId}`;
  await sql`delete from wallets where org_id = ${orgId}`;
  await sql`delete from stock_movements where org_id = ${orgId}`;
  await sql`delete from order_items where org_id = ${orgId}`;
  await sql`delete from orders where org_id = ${orgId}`;
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
}

async function login(page, email, password) {
  await page.goto(PWA_URL);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByPlaceholder("Código de barras").waitFor({ state: "visible" });
}

async function venderConFactura(page, barcode, factura) {
  await page.getByPlaceholder("Código de barras").fill(barcode);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByText("Ficha de producto").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Agregar a la venta" }).click();
  await page.getByRole("button", { name: "Carrito" }).click();
  if (factura) {
    await page.getByText("Facturar esta venta").locator("..").locator("input[type=checkbox]").check();
    await page.getByPlaceholder("Nombre del cliente").fill(factura.nombre);
    await page.getByPlaceholder("Email (para enviar la factura)").fill(factura.email);
    await page.getByPlaceholder("DNI").fill(factura.dni);
  }
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await page.getByRole("button", { name: "Confirmando..." }).waitFor({ state: "hidden", timeout: 150000 });
}

async function main() {
  console.log("T25/Fase 5 — ConfirmarScreen: estado y descarga\n");

  const orgOk = await makeOrg("ok", true, 2);
  const orgBad = await makeOrg("bad", false, 1);
  const browser = await chromium.launch();

  try {
    // Caso 1 — sin factura: pantalla igual a T23
    const page1 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await login(page1, orgOk.email, orgOk.password);
    await venderConFactura(page1, orgOk.barcodes[0], null);
    check("sin factura: 'Venta registrada' visible", await page1.getByText("Venta registrada").isVisible());
    check(
      "sin factura: NO aparece botón de descarga",
      (await page1.getByRole("button", { name: "Descargar factura (PDF)" }).count()) === 0
    );
    check(
      "sin factura: NO aparece mensaje de pendiente",
      (await page1.getByText("La factura se está terminando de procesar").count()) === 0
    );
    await page1.close();

    // Caso 2 — con factura, AFIP responde bien: descarga real
    const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await login(page2, orgOk.email, orgOk.password);
    await venderConFactura(page2, orgOk.barcodes[1], {
      nombre: "Cliente Fase5",
      email: "cliente-fase5@example.com",
      dni: "30111222",
    });
    const descargarBtn = page2.getByRole("button", { name: "Descargar factura (PDF)" });
    check("con factura emitida: botón de descarga visible", await descargarBtn.isVisible());

    const [download] = await Promise.all([page2.waitForEvent("download"), descargarBtn.click()]);
    const downloadPath = await download.path();
    const { readFileSync } = await import("node:fs");
    const bytes = readFileSync(downloadPath);
    check("el archivo descargado es un PDF real (%PDF)", bytes.subarray(0, 4).toString("ascii") === "%PDF");
    check("el nombre sugerido sigue el formato de factura", /factura-\d{4}-\d{8}\.pdf/.test(download.suggestedFilename()), download.suggestedFilename());
    await page2.close();

    // Caso 3 — con factura, AFIP falla (org sin config): mensaje tranquilo, sin botón
    const page3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await login(page3, orgBad.email, orgBad.password);
    await venderConFactura(page3, orgBad.barcodes[0], {
      nombre: "Cliente Fase5 Error",
      email: "cliente-fase5-error@example.com",
      dni: "30111222",
    });
    check("con factura en error: 'Venta registrada' visible (la venta no se ve afectada)", await page3.getByText("Venta registrada").isVisible());
    check(
      "con factura en error: mensaje tranquilo visible",
      await page3.getByText("La factura se está terminando de procesar").isVisible()
    );
    check(
      "con factura en error: NO aparece botón de descarga",
      (await page3.getByRole("button", { name: "Descargar factura (PDF)" }).count()) === 0
    );
    await page3.close();
  } finally {
    await browser.close();
    await cleanup(orgOk.orgId, orgOk.userId);
    await cleanup(orgBad.orgId, orgBad.userId);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = any(${[orgOk.orgId, orgBad.orgId]})`;
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
