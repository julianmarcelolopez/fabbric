// T25/Fase 6 — verifica la tarjeta "Factura AFIP" en OrderAdminDetailPage:
// - pedido sin factura: la tarjeta no aparece (regresión T23/T7).
// - pedido con factura en error: mensaje + botón "Reintentar", que la deja
//   emitida (sin recargar la página) cuando AFIP ya puede responder.
// - pedido con factura emitida: número/CAE visibles, descarga real de PDF.
// Una sola org descartable (se le agrega la config AFIP a mitad de camino,
// simulando "se resolvió el problema"), se borra todo al final.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const FRONTEND_URL = "http://localhost:5173";
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
const EMAIL = `julianmarcelolopez+t2506${STAMP}@gmail.com`;
const PASSWORD = "T2506temp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t25-06-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  // Sin config AFIP todavía — a propósito, para el caso "error" inicial
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;

  const variantIds = [];
  for (let i = 0; i < 3; i++) {
    const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, ${"Producto Fase6 " + i}, 'Taverniti', 20000) returning id`;
    const [variant] = await sql`insert into product_variants (product_id, org_id, talle, color, stock_local) values (${prod.id}, ${org.id}, 'M', 'Gris', 10) returning id`;
    variantIds.push(variant.id);
  }

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signInErr) throw signInErr;

  return { orgId: org.id, userId: created.user.id, token: signIn.session.access_token, variantIds };
}

async function ventaLocal(token, variantId, factura) {
  const res = await fetch(`${API}/admin/orders/venta-local`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ variantId, qty: 1 }],
      medioPago: "efectivo",
      ...(factura ? { factura } : {}),
    }),
  });
  return res.json();
}

async function login(page) {
  await page.goto(`${FRONTEND_URL}/admin/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  // La URL de login YA contiene "/admin" — hay que esperar a que deje de ser
  // exactamente /admin/login, no solo a que matchee /admin en cualquier lado.
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 15000 });
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

async function main() {
  console.log("T25/Fase 6 — Admin: tarjeta de Factura AFIP\n");
  const { orgId, userId, token, variantIds } = await setup();
  const browser = await chromium.launch();

  try {
    // Pedido 1 — sin factura
    const order1 = await ventaLocal(token, variantIds[0], null);
    check("pedido 1 (sin factura) creado", order1?.factura === null, JSON.stringify(order1?.factura));

    // Pedido 2 — con factura, org SIN config AFIP todavía → error
    const order2 = await ventaLocal(token, variantIds[1], {
      nombre: "Cliente Fase6",
      email: "cliente-fase6@example.com",
      dni: "30111222",
    });
    check("pedido 2 (con factura, sin config) → error", order2?.factura?.estado === "error", JSON.stringify(order2?.factura));

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page);

    // Caso 1 — pedido sin factura: la tarjeta no aparece
    await page.goto(`${FRONTEND_URL}/admin/orders/${order1.id}`);
    await page.getByText("Pedido #").waitFor({ state: "visible" });
    check("sin factura: tarjeta 'Factura AFIP' NO aparece", (await page.getByText("Factura AFIP").count()) === 0);

    // Caso 2 — pedido con factura en error: mensaje + botón Reintentar
    await page.goto(`${FRONTEND_URL}/admin/orders/${order2.id}`);
    await page.getByText("Factura AFIP").waitFor({ state: "visible" });
    check(
      "con factura en error: mensaje de error real visible",
      await page.getByText("no tiene la facturación AFIP configurada").isVisible()
    );
    const retryBtn = page.getByRole("button", { name: "Reintentar" });
    check("con factura en error: botón Reintentar visible", await retryBtn.isVisible());
    check("con factura en error: NO hay botón de descarga", (await page.getByRole("button", { name: "Descargar factura (PDF)" }).count()) === 0);

    // Ahora "se resuelve" el problema: se carga la config AFIP real de Eliathi (copiada)
    const [cfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
    await sql`update catalog_configs set afip_cuit = ${cfg.afip_cuit}, afip_punto_venta = ${cfg.afip_punto_venta}, afip_ambiente = ${cfg.afip_ambiente}, afip_certificado = ${cfg.afip_certificado}, afip_clave_privada = ${cfg.afip_clave_privada}, afip_access_token = ${cfg.afip_access_token} where org_id = ${orgId}`;

    await retryBtn.click();
    // El botón cambia a "Reintentando…" y después la tarjeta se re-renderiza sola (sin location.reload)
    await page.getByRole("button", { name: "Reintentando…" }).waitFor({ state: "hidden", timeout: 150000 });
    check(
      "después de reintentar: CAE visible SIN recargar la página",
      await page.getByText(/CAE/).isVisible()
    );
    check("después de reintentar: botón Reintentar ya no aparece", (await page.getByRole("button", { name: "Reintentar" }).count()) === 0);
    const downloadBtnAfterRetry = page.getByRole("button", { name: "Descargar factura (PDF)" });
    check("después de reintentar: aparece el botón de descarga", await downloadBtnAfterRetry.isVisible());

    // Caso 3 — pedido nuevo con factura, org YA con config → emitida directamente + descarga real
    const order3 = await ventaLocal(token, variantIds[2], {
      nombre: "Cliente Fase6 OK",
      email: "cliente-fase6-ok@example.com",
      dni: "30111222",
    });
    check("pedido 3 (con factura, con config) → emitida", order3?.factura?.estado === "emitida", JSON.stringify(order3?.factura));

    await page.goto(`${FRONTEND_URL}/admin/orders/${order3.id}`);
    const downloadBtn = page.getByRole("button", { name: "Descargar factura (PDF)" });
    await downloadBtn.waitFor({ state: "visible" });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadBtn.click()]);
    const { readFileSync } = await import("node:fs");
    const bytes = readFileSync(await download.path());
    check("descarga desde el admin: PDF real (%PDF)", bytes.subarray(0, 4).toString("ascii") === "%PDF");

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgId, userId);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = ${orgId}`;
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
