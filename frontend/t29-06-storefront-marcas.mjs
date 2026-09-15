// T29/06 — verificación real de UI con Playwright: navegar y filtrar por
// marca en la tienda pública. Org descartable (sin usuario admin, son todas
// rutas públicas), no toca datos de Eliathi. Limpia todo al final.
//
// Cubre además la regresión real encontrada al implementar: el backend pasó
// de `brand: "Nombre"` a `brand: {name, slug}` en /home, /categories/:slug/
// products, /collections/:slug/products y /products/:id — si algún componente
// quedara sin actualizar, React tira "Objects are not valid as a React
// child" al intentar renderizar el objeto directo. Se verifica que el texto
// de marca en cada pantalla sea el NOMBRE plano, nunca "[object Object]".
import { chromium } from "playwright";
import postgres from "postgres";

const FRONTEND_URL = "http://localhost:5173";
const { DATABASE_URL } = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });

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
const SLUG = `t29-06-${STAMP}`;
const BRAND_NAME = `PW Marca Store ${STAMP}`;
const BRAND_SLUG = `pw-marca-store-${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Categoria PW', ${SLUG}, 0) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id) values (${org.id}, 'category', ${cat.id})`;
  const [brand] = await sql`insert into brands (org_id, name, slug) values (${org.id}, ${BRAND_NAME}, ${BRAND_SLUG}) returning id`;
  const [prod] = await sql`insert into products (org_id, category_id, brand_id, name, price) values (${org.id}, ${cat.id}, ${brand.id}, 'Producto PW Store', 25000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${prod.id}, ${org.id}, 'M', 'Verde', 5, 5)`;

  return { orgId: org.id, categorySlug: SLUG, productId: prod.id };
}

async function cleanup(orgId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from brands where org_id = ${orgId}`;
  await sql`delete from home_sections where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

async function main() {
  console.log("T29/06 — Storefront: navegar y filtrar por marca\n");
  const { orgId, categorySlug, productId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    // 1) Home: el producto con marca no rompe el render (regresión real, ver header)
    await page.goto(`${FRONTEND_URL}/store/${SLUG}`);
    await page.getByText("Producto PW Store").waitFor({ state: "visible", timeout: 10000 });
    const brandTextHome = await page.locator(".pcard-brand").first().textContent();
    check("home: la marca se ve como texto plano (no [object Object])", brandTextHome?.trim() === BRAND_NAME, brandTextHome);

    // 2) Tab Marcas en "Explorá la tienda"
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/categorias?tab=marcas`);
    await page.getByRole("button", { name: "Marcas" }).waitFor({ state: "visible" });
    check("tab Marcas queda activo vía ?tab=marcas", await page.getByRole("button", { name: "Marcas" }).evaluate((el) => el.className.includes("active")));
    await page.getByText(BRAND_NAME).waitFor({ state: "visible", timeout: 10000 });
    check("la marca aparece en el listado del tab", true);
    check("muestra el conteo de productos de la marca", (await page.getByText("1 producto").count()) > 0);

    // 3) Entrar a la página de la marca
    await page.getByText(BRAND_NAME).click();
    await page.waitForURL((u) => u.pathname === `/store/${SLUG}/m/${BRAND_SLUG}`, { timeout: 10000 });
    check("navegó a /m/:brandSlug", true);
    await page.getByText("Marcas").first().waitFor({ state: "visible" });
    check("breadcrumb de la página de marca dice 'Marcas'", true);
    await page.getByText("Producto PW Store").waitFor({ state: "visible", timeout: 10000 });
    check("el producto de la marca aparece en su página", true);

    // 4) Filtro de marca dentro de la categoría (por slug, no por nombre)
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/c/${categorySlug}`);
    const chip = page.getByRole("button", { name: BRAND_NAME });
    await chip.waitFor({ state: "visible", timeout: 10000 });
    await chip.click();
    await page.waitForURL((u) => u.searchParams.get("marca") === BRAND_SLUG, { timeout: 10000 });
    check("el filtro de marca en la URL usa el SLUG, no el nombre", true);
    await page.getByText("Producto PW Store").waitFor({ state: "visible", timeout: 10000 });
    check("el producto sigue visible con el filtro de marca aplicado", true);

    // 5) Ficha de producto pública
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/p/${productId}`);
    const brandTextPdv = await page.locator(".pdv-brand").first().textContent();
    check("ficha de producto: la marca se ve como texto plano", brandTextPdv?.trim() === BRAND_NAME, brandTextPdv);

    check(
      "sin errores de consola en ninguna pantalla (ej. 'Objects are not valid as a React child')",
      consoleErrors.length === 0,
      consoleErrors.join(" | ")
    );

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgId);
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
