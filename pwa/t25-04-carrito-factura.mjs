// T25/Fase 4 — prueba real de UI con Playwright: login → escaneo manual de un
// código de barras de prueba → Ficha → agregar a la venta → Carrito → activar
// "Facturar esta venta" → confirmar que el formulario aparece, que el botón
// se bloquea con datos incompletos y se habilita al completarlos → confirmar
// venta real contra homologación (org descartable con la config AFIP de
// Eliathi copiada, solo lectura). Limpia todo al final.
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
const BARCODE = `T2504-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2504pw${STAMP}@gmail.com`;
const PASSWORD = "T2504pwTemp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t25-04-pw-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Campera Playwright', 'Taverniti', 60000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'M', 'Verde', ${BARCODE}, 10)`;

  const [eliathiCfg] = await sql`select afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${ELIATHI_ORG_ID}`;
  await sql`
    insert into catalog_configs (org_id, slug, store_name, afip_cuit, afip_punto_venta, afip_ambiente, afip_certificado, afip_clave_privada, afip_access_token)
    values (${org.id}, ${slug}, ${slug}, ${eliathiCfg.afip_cuit}, ${eliathiCfg.afip_punto_venta}, ${eliathiCfg.afip_ambiente}, ${eliathiCfg.afip_certificado}, ${eliathiCfg.afip_clave_privada}, ${eliathiCfg.afip_access_token})`;

  return { orgId: org.id, userId: created.user.id };
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
  console.log("T25/Fase 4 — Playwright: toggle y datos del cliente en el Carrito\n");
  const { orgId, userId } = await setup();

  const browser = await chromium.launch();
  // Viewport de celular real (iPhone 13-ish) — la app es mobile-first y el
  // viewport desktop por default de Playwright (1280x720, ancho y bajo) no
  // representa el espacio vertical real disponible en un teléfono.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(PWA_URL);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    // Escaneo manual (fallback de texto, sin cámara) — Ficha del producto de prueba
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    // La búsqueda pega contra el backend (async) — esperar de verdad, no un
    // chequeo inmediato, para no depender de que ya haya terminado de pintar.
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    check("llegó a la Ficha del producto", true);

    await page.getByRole("button", { name: "Agregar a la venta" }).click();

    // Ir al Carrito
    await page.getByRole("button", { name: "Carrito" }).click();
    check("toggle 'Facturar esta venta' visible", await page.getByText("Facturar esta venta").isVisible());

    const confirmarBtn = page.getByRole("button", { name: "Confirmar venta" });
    check("botón habilitado con el toggle apagado", await confirmarBtn.isEnabled());

    // Activar el toggle
    await page.getByText("Facturar esta venta").locator("..").locator("input[type=checkbox]").check();
    check("aparece el campo Nombre", await page.getByPlaceholder("Nombre del cliente").isVisible());
    check("aparece el campo Email", await page.getByPlaceholder("Email (para enviar la factura)").isVisible());
    check("aparece el campo DNI", await page.getByPlaceholder("DNI").isVisible());
    check("botón deshabilitado con datos incompletos", await confirmarBtn.isDisabled());

    await page.screenshot({ path: "t25-04-carrito-factura-incompleta.png" });

    // Completar datos
    await page.getByPlaceholder("Nombre del cliente").fill("Cliente Playwright");
    await page.getByPlaceholder("Email (para enviar la factura)").fill("cliente-playwright@example.com");
    await page.getByPlaceholder("DNI").fill("30111222");
    check("botón habilitado con datos completos", await confirmarBtn.isEnabled());

    await page.screenshot({ path: "t25-04-carrito-factura-completa.png" });

    // Confirmar la venta de verdad (org de prueba con config AFIP real copiada).
    // El pedido se crea/paga rápido, pero el pedido de CAE a AFIP puede tardar
    // ~2 minutos si le toca renovar el ticket WSAA (ya visto antes en esta
    // sesión) — se espera de verdad con un botón que deja de decir
    // "Confirmando..." recién cuando la respuesta HTTP completa vuelve.
    await confirmarBtn.click();
    await page.getByRole("button", { name: "Confirmando..." }).waitFor({ state: "hidden", timeout: 150000 });

    const bodyText = await page.textContent("body");
    check("navegó a la pantalla de confirmación (no quedó en Carrito con error)", !bodyText.includes("No se pudo confirmar la venta"));
    await page.screenshot({ path: "t25-04-confirmacion.png" });

    // Verificación de datos reales en la base
    const [order] = await sql`select id, status from orders where org_id = ${orgId} order by created_at desc limit 1`;
    check("el pedido quedó paid", order?.status === "paid");
    const [invoice] = await sql`select estado, cliente_nombre, cliente_email, cliente_dni, cae from invoices where order_id = ${order?.id}`;
    check("se creó la factura con los datos del formulario", invoice?.cliente_nombre === "Cliente Playwright" && invoice?.cliente_email === "cliente-playwright@example.com" && invoice?.cliente_dni === "30111222");
    check("la factura quedó emitida con CAE real", invoice?.estado === "emitida" && !!invoice?.cae, JSON.stringify(invoice));
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
