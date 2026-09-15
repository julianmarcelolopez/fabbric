// T29/04 — verificación real de UI con Playwright: combo de marca (con
// alta inline) en el alta de producto por escaneo QR. Org y usuario
// descartables (mismo patrón que t27-01-confirmaciones.mjs), no toca datos
// de Eliathi. Limpia todo al final.
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
const EMAIL = `julianmarcelolopez+t2904${STAMP}@gmail.com`;
const PASSWORD = `T2904temp!pass-${STAMP}`;
const BARCODE_1 = `T2904-A-${STAMP}`;
const BARCODE_2 = `T2904-B-${STAMP}`;
const BRAND_EXISTENTE = `PW PWA Marca ${STAMP}`;
const BRAND_NUEVA = `PW PWA Marca Nueva ${STAMP}`;

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t29-04-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  const [brand] = await sql`insert into brands (org_id, name, slug) values (${org.id}, ${BRAND_EXISTENTE}, ${"pw-pwa-marca-" + STAMP}) returning id`;

  return { orgId: org.id, userId: created.user.id, categoryName: slug, existingBrandId: brand.id };
}

async function login(page) {
  await page.goto(PWA_URL);
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.getByRole("button", { name: "Recibir mercadería" }).waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("button", { name: "Recibir mercadería" }).click();
}

async function irAAlta(page, barcode) {
  await page.getByPlaceholder("Código de barras").fill(barcode);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByText("Producto nuevo").waitFor({ state: "visible", timeout: 10000 });
  await page.getByText(`Código ${barcode}`).waitFor({ state: "visible" });
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

async function main() {
  console.log("T29/04 — PWA: combo de marca en alta por QR\n");
  const { orgId, userId, categoryName, existingBrandId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await login(page);

    // 1) Elegir una marca EXISTENTE desde el combo
    await irAAlta(page, BARCODE_1);
    await page.getByPlaceholder("Marca").fill(BRAND_EXISTENTE);
    await page.getByPlaceholder("Modelo").fill("Producto PWA Uno");
    await page.locator("select").selectOption({ label: categoryName });
    await page.getByPlaceholder("Talle").fill("M");
    await page.getByPlaceholder("Color").fill("Azul");
    await page.getByPlaceholder("Precio").fill("15000");

    const [alta1] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/admin/products/alta-rapida") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Guardar producto" }).click(),
    ]);
    check("alta-rapida (marca existente) devolvió 201", alta1.status() === 201);
    await page.getByText("Continuar sin foto por ahora").waitFor({ state: "visible", timeout: 10000 });

    const [p1] = await sql`select brand_id from products where org_id = ${orgId} and name = 'Producto PWA Uno'`;
    check("producto 1 quedó con el brandId de la marca existente", p1?.brand_id === existingBrandId);
    const [dupCheck] = await sql`select count(*)::int as n from brands where org_id = ${orgId} and name = ${BRAND_EXISTENTE}`;
    check("elegir una marca existente NO la duplicó", dupCheck.n === 1, `hay ${dupCheck.n} filas`);

    await page.getByText("Continuar sin foto por ahora").click();

    // 2) Alta inline: escribir una marca NUEVA en el combo
    await page.getByRole("button", { name: "Recibir mercadería" }).click();
    await irAAlta(page, BARCODE_2);
    await page.getByPlaceholder("Marca").fill(BRAND_NUEVA);
    await page.getByPlaceholder("Modelo").fill("Producto PWA Dos");
    await page.locator("select").selectOption({ label: categoryName });
    await page.getByPlaceholder("Talle").fill("L");
    await page.getByPlaceholder("Color").fill("Rojo");
    await page.getByPlaceholder("Precio").fill("18000");

    const [alta2] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/admin/products/alta-rapida") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Guardar producto" }).click(),
    ]);
    check("alta-rapida (alta inline) devolvió 201", alta2.status() === 201);
    await page.getByText("Continuar sin foto por ahora").waitFor({ state: "visible", timeout: 10000 });

    const [nuevaBrand] = await sql`select id from brands where org_id = ${orgId} and name = ${BRAND_NUEVA}`;
    check("alta inline creó la marca nueva en la DB", !!nuevaBrand);
    const [p2] = await sql`select brand_id from products where org_id = ${orgId} and name = 'Producto PWA Dos'`;
    check("producto 2 quedó enlazado a la marca creada al vuelo", !!nuevaBrand && p2?.brand_id === nuevaBrand.id);

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
