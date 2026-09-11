// T27/Fase 2 — prueba real de UI con Playwright: toggle de modo "Vender" /
// "Recibir mercadería" en Escanear, y que la Ficha muestre una sola acción
// según el modo activo. Org y usuario descartables (mismo patrón que
// t25-04-carrito-factura.mjs / t27-01-confirmaciones.mjs), no toca datos de
// Eliathi. Limpia todo al final.
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
const BARCODE_EXISTENTE = `T2702-${STAMP}`;
const BARCODE_INEXISTENTE = `T2702-NOEXISTE-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2702pw${STAMP}@gmail.com`;
const PASSWORD = "T2702pwTemp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t27-02-pw-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, name, brand, price) values (${org.id}, ${cat.id}, 'Campera Playwright Modo', 'Taverniti', 50000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, barcode, stock_local) values (${prod.id}, ${org.id}, 'L', 'Negro', ${BARCODE_EXISTENTE}, 5)`;
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

async function buscar(page, code) {
  await page.getByPlaceholder("Código de barras").fill(code);
  await page.getByRole("button", { name: "Buscar" }).click();
}

async function main() {
  console.log("T27/Fase 2 — Playwright: toggle de modo Vender/Recibir mercadería\n");
  const { orgId, userId } = await setup();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto(PWA_URL);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 10000 });

    // ── Modo por defecto: Vender ─────────────────────────────────────────
    check(
      "por defecto arranca en modo Vender ('Escanear para vender')",
      await page.getByText("Escanear para vender").isVisible()
    );
    check("el toggle 'Vender' / 'Recibir mercadería' está visible", await page.getByRole("button", { name: "Recibir mercadería" }).isVisible());

    // ── Código inexistente en modo Vender → banner, NO Alta ─────────────
    await buscar(page, BARCODE_INEXISTENTE);
    await page.getByText("Código no encontrado").waitFor({ state: "visible", timeout: 10000 });
    check("modo Vender + código inexistente muestra el banner de advertencia", true);
    check(
      "no navegó a Alta (no aparece 'Producto nuevo')",
      !(await page.getByText("Producto nuevo").isVisible())
    );
    check(
      "se queda en Escanear (el input de código sigue visible)",
      await page.getByPlaceholder("Código de barras").isVisible()
    );

    // ── Cambiar a modo Recibir mercadería ────────────────────────────────
    await page.getByRole("button", { name: "Recibir mercadería" }).click();
    check(
      "el título cambia a 'Escanear para recibir mercadería'",
      await page.getByText("Escanear para recibir mercadería").isVisible()
    );

    // ── Mismo código inexistente en modo Recibir mercadería → SÍ a Alta ──
    await buscar(page, BARCODE_INEXISTENTE);
    await page.getByText("Producto nuevo").waitFor({ state: "visible", timeout: 10000 });
    check("modo Recibir mercadería + código inexistente navega a Alta", true);

    // Volver a Escanear (botón "←" de Alta)
    await page.locator("button", { hasText: "←" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });

    // ── Ficha en modo Recibir mercadería: solo "Registrar entrada" ───────
    await buscar(page, BARCODE_EXISTENTE);
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    check("tag 'Modo: Recibir mercadería' visible en la Ficha", await page.getByText("Modo: Recibir mercadería").isVisible());
    check("se ve 'Registrar entrada'", await page.getByRole("button", { name: "Registrar entrada" }).isVisible());
    check(
      "NO se ve 'Agregar a la venta' en este modo",
      !(await page.getByRole("button", { name: "Agregar a la venta" }).isVisible())
    );

    // Volver a Escanear (botón "←" de Ficha)
    await page.locator("button", { hasText: "←" }).click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 5000 });

    // ── Volver a modo Vender: Ficha muestra solo "Agregar a la venta" ────
    await page.getByRole("button", { name: "Vender" }).click();
    await buscar(page, BARCODE_EXISTENTE);
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });
    check("tag 'Modo: Vender' visible en la Ficha", await page.getByText("Modo: Vender").isVisible());
    check("se ve 'Agregar a la venta'", await page.getByRole("button", { name: "Agregar a la venta" }).isVisible());
    check(
      "NO se ve 'Registrar entrada' en este modo",
      !(await page.getByRole("button", { name: "Registrar entrada" }).isVisible())
    );

    await page.screenshot({ path: "t27-02-ficha-modo-vender.png" });
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
