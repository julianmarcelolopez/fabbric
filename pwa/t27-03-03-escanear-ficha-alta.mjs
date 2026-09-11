// T27/Fase 3, Tarea 3 — verifica que Escanear, Ficha y Alta migraron a los
// tokens de theme.ts sin romper el circuito (código nuevo → Alta, código
// existente → Ficha, en ambos modos). Org/usuario descartables, no toca
// datos de Eliathi, limpia todo al final.
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
const BARCODE_EXISTENTE = `T2703-${STAMP}`;
const BARCODE_NUEVO = `T2703-NUEVO-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2703pw3-${STAMP}@gmail.com`;
const PASSWORD = "T27033pwTemp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  const slug = `t27-03-03-pw-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Remera Playwright Tokens', 'Adidas', 30000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'S', 'Azul', ${BARCODE_EXISTENTE}, 4)`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  return { orgId: org.id, userId: created.user.id, categoryId: cat.id };
}

async function cleanup(orgId, userId) {
  await sql`delete from stock_movements where org_id = ${orgId}`;
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log("T27/Fase 3, Tarea 3 — Playwright: Escanear, Ficha y Alta con tokens\n");
  const { orgId, userId } = await setup();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(PWA_URL);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 10000 });

    // ── Escanear: logotipo script + título display + botón Buscar navy ──
    const logoFont = await page
      .getByText("Eliathi", { exact: true })
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("logotipo chico de Escanear usa Alex Brush", logoFont.includes("Alex Brush"), logoFont);

    const tituloFont = await page
      .getByText("Escanear para vender")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    check("título de Escanear usa Cormorant Garamond", tituloFont.includes("Cormorant Garamond"), tituloFont);

    const btnBuscar = page.getByRole("button", { name: "Buscar" });
    const colorBuscar = await btnBuscar.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("botón 'Buscar' es navy", colorBuscar === rgb(NAVY), colorBuscar);

    // ── Código existente en modo Vender → Ficha con tokens ───────────────
    await page.getByPlaceholder("Código de barras").fill(BARCODE_EXISTENTE);
    await btnBuscar.click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });

    const nombreFont = await page.getByText("Adidas — Remera Playwright Tokens").evaluate((el) => getComputedStyle(el).fontFamily);
    check("nombre del producto usa Cormorant Garamond", nombreFont.includes("Cormorant Garamond"), nombreFont);

    const precioEl = page.getByText("$ 300,00", { exact: true });
    const precioColor = await precioEl.evaluate((el) => getComputedStyle(el).color);
    const precioFont = await precioEl.evaluate((el) => getComputedStyle(el).fontFamily);
    check("precio es coral (accent)", precioColor === rgb(ACCENT), precioColor);
    check("precio usa Cormorant Garamond", precioFont.includes("Cormorant Garamond"), precioFont);

    const btnVenta = page.getByRole("button", { name: "Agregar a la venta" });
    const colorVenta = await btnVenta.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Agregar a la venta' sigue coral tras la migración", colorVenta === rgb(ACCENT), colorVenta);
    const alturaVenta = (await btnVenta.boundingBox())?.height ?? 0;
    check("'Agregar a la venta' mide ≥44px", alturaVenta >= 44, `${alturaVenta}px`);

    // Volver a Escanear y probar modo Recibir mercadería
    await page.locator("button", { hasText: "←" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: "Recibir mercadería" }).click();

    await page.getByPlaceholder("Código de barras").fill(BARCODE_EXISTENTE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    const btnEntrada = page.getByRole("button", { name: "Registrar entrada" });
    const colorEntrada = await btnEntrada.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Registrar entrada' sigue navy tras la migración", colorEntrada === rgb(NAVY), colorEntrada);
    const alturaEntrada = (await btnEntrada.boundingBox())?.height ?? 0;
    check("'Registrar entrada' mide ≥44px", alturaEntrada >= 44, `${alturaEntrada}px`);

    // ── Código nuevo en modo Recibir mercadería → Alta con tokens ────────
    await page.locator("button", { hasText: "←" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });
    await page.getByPlaceholder("Código de barras").fill(BARCODE_NUEVO);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Producto nuevo").waitFor({ state: "visible", timeout: 10000 });

    const tituloAltaFont = await page.getByText("Producto nuevo").evaluate((el) => getComputedStyle(el).fontFamily);
    check("título 'Producto nuevo' usa Cormorant Garamond", tituloAltaFont.includes("Cormorant Garamond"), tituloAltaFont);

    const btnGuardar = page.getByRole("button", { name: "Guardar producto" });
    const colorGuardar = await btnGuardar.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Guardar producto' es coral", colorGuardar === rgb(ACCENT), colorGuardar);
    const alturaGuardar = (await btnGuardar.boundingBox())?.height ?? 0;
    check("'Guardar producto' mide ≥44px", alturaGuardar >= 44, `${alturaGuardar}px`);
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
