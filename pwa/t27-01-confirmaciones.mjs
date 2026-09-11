// T27/Fase 1 — prueba real de UI con Playwright: verifica los quick wins de
// confirmación visible y balance de botones. Org y usuario descartables
// (mismo patrón que t25-04-carrito-factura.mjs), no toca datos de Eliathi.
// Limpia todo al final.
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

const STAMP = Date.now();
const BARCODE = `T2701-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2701pw${STAMP}@gmail.com`;
const PASSWORD = "T2701pwTemp!pass-9Rk3";
const STOCK_INICIAL = 2;

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t27-01-pw-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Sweter Playwright', 'Zara', 10000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'M', 'Blanco', ${BARCODE}, ${STOCK_INICIAL})`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;

  return { orgId: org.id, userId: created.user.id };
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

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

async function main() {
  console.log("T27/Fase 1 — Playwright: confirmación visible y balance de botones\n");
  const { orgId, userId } = await setup();

  const browser = await chromium.launch();
  // Viewport de celular real (iPhone 13-ish), no el desktop por default de
  // Playwright — la app es mobile-first y el layout/alto de botones depende
  // del espacio real disponible.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(PWA_URL);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    // ── Escaneo manual en modo Recibir mercadería → Ficha con "Registrar
    //    entrada" (T27, Fase 2: la Ficha ya no muestra las dos acciones
    //    juntas, depende del modo activo — hay que elegirlo antes de buscar). ──
    await page.getByRole("button", { name: "Recibir mercadería" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    check("llegó a la Ficha del producto", true);

    // ── Balance visual: color y tamaño de toque de "Registrar entrada" ──
    const btnEntrada = page.getByRole("button", { name: "Registrar entrada" });
    const colorEntrada = await btnEntrada.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Registrar entrada' es navy sólido (#1E2A4A)", colorEntrada === rgb("#1E2A4A"), colorEntrada);
    const alturaEntrada = (await btnEntrada.boundingBox())?.height ?? 0;
    check("'Registrar entrada' mide ≥44px de alto", alturaEntrada >= 44, `${alturaEntrada}px`);

    await page.screenshot({ path: "t27-01-ficha.png" });

    // ── Registrar entrada → confirmación de pantalla completa ───────────
    await btnEntrada.click();
    await page.getByText("Entrada registrada").waitFor({ state: "visible", timeout: 10000 });
    check("aparece la confirmación 'Entrada registrada'", true);

    const detalleEntrada = await page.textContent("body");
    check(
      "el detalle muestra +1 unidad y el stock correcto",
      detalleEntrada.includes("+1 unidad") && detalleEntrada.includes(`Stock ahora: ${STOCK_INICIAL + 1}`),
      detalleEntrada
    );

    const [variantTrasEntrada] = await sql`select stock_local from product_variants where org_id = ${orgId}`;
    check(
      "el stock mostrado coincide con el stock real en la base (no se le mintió al vendedor)",
      variantTrasEntrada.stock_local === STOCK_INICIAL + 1,
      `mostrado ${STOCK_INICIAL + 1}, real ${variantTrasEntrada.stock_local}`
    );

    await page.screenshot({ path: "t27-01-entrada-ok.png" });

    // Botón manual de cierre (no depender del auto-avance para el resto del test)
    await page.getByRole("button", { name: "Seguir recibiendo" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });
    check("'Seguir recibiendo' vuelve a Escanear", true);

    // ── Cambiar a modo Vender → Ficha con "Agregar a la venta" ──────────
    await page.getByRole("button", { name: "Vender" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });

    const btnVenta = page.getByRole("button", { name: "Agregar a la venta" });
    const colorVenta = await btnVenta.evaluate((el) => getComputedStyle(el).backgroundColor);
    check("'Agregar a la venta' es coral sólido (#FF6B4A)", colorVenta === rgb("#FF6B4A"), colorVenta);
    const alturaVenta = (await btnVenta.boundingBox())?.height ?? 0;
    check("'Agregar a la venta' mide ≥44px de alto", alturaVenta >= 44, `${alturaVenta}px`);

    // ── Agregar a la venta → confirmación instantánea ────────────────────
    await btnVenta.click();

    await page.getByText("Agregado al carrito").waitFor({ state: "visible", timeout: 3000 });
    check("aparece la confirmación 'Agregado al carrito' (instantánea, sin red)", true);

    const detalleVenta = await page.textContent("body");
    check(
      "el detalle muestra el nombre del producto y el conteo del carrito",
      detalleVenta.includes("Zara") && detalleVenta.includes("1 producto en el carrito"),
      detalleVenta
    );

    await page.screenshot({ path: "t27-01-venta-agregada-ok.png" });

    // Link secundario "Ir al carrito"
    await page.getByRole("button", { name: "Ir al carrito" }).click();
    await page.getByText("Venta en curso").waitFor({ state: "visible", timeout: 5000 });
    check("'Ir al carrito' navega al Carrito con el producto agregado", await page.getByText("Zara").isVisible());
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
