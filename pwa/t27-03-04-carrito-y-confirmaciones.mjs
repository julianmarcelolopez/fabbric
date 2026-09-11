// T27/Fase 3, Tarea 4 — verifica que EntradaOkScreen, VentaAgregadaOkScreen,
// CarritoScreen y ConfirmarScreen migraron a los tokens de theme.ts sin
// romper el circuito completo. Org/usuario descartables, no toca datos de
// Eliathi, limpia todo al final.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const PWA_URL = "http://localhost:5174";
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

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const NAVY = "#1E2A4A";
const ACCENT = "#FF6B4A";

const STAMP = Date.now();
const BARCODE = `T2704-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2704pw${STAMP}@gmail.com`;
const PASSWORD = "T2704pwTemp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  const slug = `t27-03-04-pw-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Campera Playwright Carrito', 'Taverniti', 40000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'L', 'Gris', ${BARCODE}, 4)`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  return { orgId: org.id, userId: created.user.id };
}

async function cleanup(orgId, userId) {
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
  console.log("T27/Fase 3, Tarea 4 — Playwright: Carrito y confirmaciones con tokens\n");
  const { orgId, userId } = await setup();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(PWA_URL);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 10000 });

    // ── Registrar entrada → EntradaOkScreen con tokens ───────────────────
    await page.getByRole("button", { name: "Recibir mercadería" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Registrar entrada" }).click();
    await page.getByText("Entrada registrada").waitFor({ state: "visible", timeout: 10000 });

    const tituloEntradaFont = await page
      .getByText("Entrada registrada")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("título de EntradaOkScreen usa Cormorant Garamond", tituloEntradaFont.includes("Cormorant Garamond"), tituloEntradaFont);
    const btnSeguirRecibiendo = page.getByRole("button", { name: "Seguir recibiendo" });
    const colorSeguirRecibiendo = await btnSeguirRecibiendo.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("botón de cierre de EntradaOkScreen es navy", colorSeguirRecibiendo === rgb(NAVY), colorSeguirRecibiendo);
    await btnSeguirRecibiendo.click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });

    // ── Agregar a la venta → VentaAgregadaOkScreen con tokens ────────────
    await page.getByRole("button", { name: "Vender" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Agregar a la venta" }).click();
    await page.getByText("Agregado al carrito").waitFor({ state: "visible", timeout: 3000 });

    const tituloVentaFont = await page
      .getByText("Agregado al carrito")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("título de VentaAgregadaOkScreen usa Cormorant Garamond", tituloVentaFont.includes("Cormorant Garamond"), tituloVentaFont);
    const btnSeguirVendiendo = page.getByRole("button", { name: "Seguir vendiendo" });
    const colorSeguirVendiendo = await btnSeguirVendiendo.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("botón de cierre de VentaAgregadaOkScreen es coral", colorSeguirVendiendo === rgb(ACCENT), colorSeguirVendiendo);

    await page.getByRole("button", { name: "Ir al carrito" }).click();
    await page.getByText("Venta en curso").waitFor({ state: "visible", timeout: 5000 });

    // ── CarritoScreen con tokens ──────────────────────────────────────────
    const tituloCarritoFont = await page
      .getByText("Venta en curso")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("título 'Venta en curso' usa Cormorant Garamond", tituloCarritoFont.includes("Cormorant Garamond"), tituloCarritoFont);

    const chipEfectivo = page.getByRole("button", { name: "Efectivo" });
    await chipEfectivo.click();
    const colorChip = await chipEfectivo.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("chip de medio de pago seleccionado es navy (no coral)", colorChip === rgb(NAVY), colorChip);

    const totalFont = await page.getByText("$ 400,00", { exact: true }).evaluate((el) => getComputedStyle(el).fontFamily);
    const totalColor = await page.getByText("$ 400,00", { exact: true }).evaluate((el) => getComputedStyle(el).color);
    check("total usa Cormorant Garamond", totalFont.includes("Cormorant Garamond"), totalFont);
    check("total es navy", totalColor === rgb(NAVY), totalColor);

    const btnConfirmarVenta = page.getByRole("button", { name: "Confirmar venta" });
    const colorConfirmar = await btnConfirmarVenta.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Confirmar venta' sigue coral", colorConfirmar === rgb(ACCENT), colorConfirmar);
    const alturaConfirmar = (await btnConfirmarVenta.boundingBox())?.height ?? 0;
    check("'Confirmar venta' mide ≥44px", alturaConfirmar >= 44, `${alturaConfirmar}px`);

    // ── Confirmar venta → ConfirmarScreen con tokens ─────────────────────
    await btnConfirmarVenta.click();
    await page.getByText("Venta registrada").waitFor({ state: "visible", timeout: 15000 });

    const tituloConfirmarFont = await page
      .getByText("Venta registrada")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("título 'Venta registrada' usa Cormorant Garamond", tituloConfirmarFont.includes("Cormorant Garamond"), tituloConfirmarFont);

    const btnVolverEscanear = page.getByRole("button", { name: "Volver a escanear" });
    const colorVolver = await btnVolverEscanear.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Volver a escanear' es navy (no coral)", colorVolver === rgb(NAVY), colorVolver);
    const alturaVolver = (await btnVolverEscanear.boundingBox())?.height ?? 0;
    check("'Volver a escanear' mide ≥44px", alturaVolver >= 44, `${alturaVolver}px`);
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
