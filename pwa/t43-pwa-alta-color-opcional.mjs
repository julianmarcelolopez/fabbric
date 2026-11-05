// T43/Tarea 4 — verificación real de UI con Playwright: dar de alta un
// producto SIN color (ej. perfume) desde la PWA no debe bloquearse, y ni la
// Ficha ni el Carrito deben mostrar "· null"/"/null" colgando. Org/usuario
// descartables (mismo patrón que t29-04-pwa-marca.mjs), no toca datos de
// Eliathi. Limpia todo al final. Capturas en ./test/ dentro de esta tarea.
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), "../.env.local") });

const PWA_URL = "http://localhost:5174";
const SCREENSHOT_DIR = resolve(process.cwd(), "../docs/T43_ColorOpcional/tareas/04-pwa-alta-y-ficha/test");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

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
const EMAIL = `julianmarcelolopez+t43${STAMP}@gmail.com`;
const PASSWORD = `T43temp!pass-${STAMP}`;
const BARCODE = `T43PERFUME${STAMP}.000`;
const CATEGORIA = `Perfumes T43 ${STAMP}`;
const MARCA_NUEVA = `Marca T43 ${STAMP}`;
const MODELO = `Perfume Test ${STAMP}`;

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t43-pwa-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${CATEGORIA}, ${slug}, 0) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;

  return { orgId: org.id, userId: created.user.id };
}

async function cleanup(orgId, userId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from brands where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
}

async function login(page) {
  await page.goto(PWA_URL);
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByRole("button", { name: "Recibir mercadería" }).waitFor({ state: "visible", timeout: 15000 });
}

async function main() {
  console.log("T43/Tarea 4 — PWA: alta sin color (perfume) + Ficha/Carrito sin 'null'\n");
  const { orgId, userId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await login(page);

    // 1) Alta por escaneo SIN tocar el campo Color
    await page.getByRole("button", { name: "Recibir mercadería" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Producto nuevo").waitFor({ state: "visible", timeout: 10000 });

    await page.locator("select").nth(0).selectOption({ value: "__other__" });
    await page.getByPlaceholder("Nombre de la marca nueva").fill(MARCA_NUEVA);
    await page.getByPlaceholder("Modelo").fill(MODELO);
    await page.locator("select").nth(1).selectOption({ label: CATEGORIA });
    await page.getByPlaceholder("Talle").fill("120ML");
    // A propósito: el campo "Color (opcional)" queda vacío, sin tocar.
    const colorValue = await page.getByPlaceholder("Color (opcional)").inputValue();
    check('el campo "Color (opcional)" existe y empieza vacío', colorValue === "");
    await page.getByPlaceholder("Precio").fill("45000");

    const [altaResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/admin/products/alta-rapida") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Guardar producto" }).click(),
    ]);
    check("alta-rapida sin color devolvió 201 (no bloqueó por falta de color)", altaResponse.status() === 201, String(altaResponse.status()));

    await page.getByText("Foto del producto").waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-alta-sin-color-foto-step.png`, fullPage: true });

    const [variantRow] = await sql`
      select pv.color from product_variants pv
      join products p on p.id = pv.product_id
      where p.org_id = ${orgId} and p.name = ${MODELO}
    `;
    check("la variante quedó con color NULL en la base (no string vacío)", variantRow?.color === null, JSON.stringify(variantRow));

    await page.getByText("Continuar sin foto por ahora").click();
    await page.getByText("Producto dado de alta correctamente").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Aceptar" }).click();

    // 2) Escanear el mismo producto en modo "Vender" → Ficha sin "· null"
    await page.getByRole("button", { name: "Vender" }).click();
    await page.getByPlaceholder("Código de barras").fill(BARCODE);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByText("Ficha de producto").waitFor({ state: "visible", timeout: 10000 });

    const fichaBodyText = await page.locator("body").innerText();
    check("la Ficha no muestra la palabra 'null'", !fichaBodyText.includes("null"), fichaBodyText.slice(0, 300));
    const talleLine = await page.getByText("Talle 120ML", { exact: true }).isVisible().catch(() => false);
    check('la Ficha muestra "Talle 120ML" sin "· " colgando', talleLine);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-ficha-sin-color.png`, fullPage: true });

    // 3) Agregar a la venta → Carrito sin "/null"
    await page.getByRole("button", { name: "Agregar a la venta" }).click();
    await page.getByText("Agregado al carrito").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Ir al carrito" }).click();
    await page.getByText("120ML", { exact: false }).first().waitFor({ state: "visible", timeout: 10000 });

    const carritoBodyText = await page.locator("body").innerText();
    check("el Carrito no muestra la palabra 'null'", !carritoBodyText.includes("null"), carritoBodyText.slice(0, 300));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-carrito-sin-color.png`, fullPage: true });

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
