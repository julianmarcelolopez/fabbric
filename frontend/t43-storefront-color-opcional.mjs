// T43/Tarea 3 — verificación real de UI con Playwright: la ficha de un
// producto sin eje de color (ej. perfume) no debe mostrar el selector de
// "Color" ni ningún "null" colgando, y un producto con color (ropa) sigue
// funcionando exacto igual (regresión). Org/categoría/productos
// descartables (mismo patrón que t29-04-pwa-marca.mjs), no toca datos de
// Eliathi. Limpia todo al final. Capturas en ./test/ dentro de esta tarea.
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import postgres from "postgres";

config({ path: resolve(process.cwd(), "../.env.local") });

const STORE_URL = "http://localhost:5173";
const SCREENSHOT_DIR = resolve(
  process.cwd(),
  "../docs/T43_ColorOpcional/tareas/03-storefront-selector-color/test"
);
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

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
const SLUG = `t43-storefront-${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`
    insert into categories (org_id, name, slug, sort_order)
    values (${org.id}, ${"Perfumes " + STAMP}, ${"perfumes-" + STAMP}, 0)
    returning id, slug
  `;

  const [perfume] = await sql`
    insert into products (org_id, category_id, name, price, visible_in_catalog)
    values (${org.id}, ${cat.id}, ${"Perfume Test " + STAMP}, 50000, true)
    returning id
  `;
  await sql`
    insert into product_variants (org_id, product_id, talle, color, stock_online, stock_local)
    values (${org.id}, ${perfume.id}, '120ML', null, 5, 0), (${org.id}, ${perfume.id}, '50ML', null, 3, 0)
  `;

  const [remera] = await sql`
    insert into products (org_id, category_id, name, price, visible_in_catalog)
    values (${org.id}, ${cat.id}, ${"Remera Test " + STAMP}, 20000, true)
    returning id
  `;
  await sql`
    insert into product_variants (org_id, product_id, talle, color, stock_online, stock_local)
    values (${org.id}, ${remera.id}, 'M', 'Azul', 5, 0), (${org.id}, ${remera.id}, 'M', 'Rojo', 2, 0)
  `;

  return { orgId: org.id, categorySlug: cat.slug, perfumeId: perfume.id, remeraId: remera.id };
}

async function cleanup(orgId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

async function main() {
  console.log("T43/Tarea 3 — Storefront: color opcional (perfume sin color)\n");
  const { orgId, categorySlug, perfumeId, remeraId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1) Ficha del perfume (sin color) — no debe aparecer selector de Color
    await page.goto(`${STORE_URL}/store/${SLUG}/p/${perfumeId}`);
    await page.getByRole("heading", { name: `Perfume Test ${STAMP}` }).waitFor({ state: "visible", timeout: 10000 });

    const talleVisible = await page.locator(".pdv-selector-title", { hasText: "Talle" }).isVisible();
    check("ficha de perfume muestra selector de Talle", talleVisible);

    const colorSelectorCount = await page.locator(".pdv-selector-title", { hasText: "Color" }).count();
    check("ficha de perfume NO muestra selector de Color", colorSelectorCount === 0, `encontrado ${colorSelectorCount} veces`);

    const bodyText1 = await page.locator("body").innerText();
    check("no aparece la palabra 'null' en la ficha del perfume", !bodyText1.includes("null"));

    const ctaText = (await page.locator(".pdv-btn-cart").innerText()).toLowerCase();
    check('el botón dice "elegí talle" (no "...y color") para un perfume', ctaText.includes("elegí talle") && !ctaText.includes("y color"), ctaText);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-perfume-sin-selector-color.png`, fullPage: true });

    await page.getByRole("button", { name: "120ML" }).click();
    const stockText = await page.locator(".pdv-stock-indicator").innerText();
    check("el texto de stock no muestra '· null'", !stockText.includes("null"), stockText);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-perfume-talle-seleccionado.png`, fullPage: true });

    // 2) Ficha de la remera (con color) — regresión: sigue igual que siempre
    await page.goto(`${STORE_URL}/store/${SLUG}/p/${remeraId}`);
    await page.getByRole("heading", { name: `Remera Test ${STAMP}` }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "M", exact: true }).click();
    const colorSelectorCount2 = await page.locator(".pdv-selector-title", { hasText: "Color" }).count();
    check("ficha de remera SIGUE mostrando selector de Color", colorSelectorCount2 > 0);
    await page.getByRole("button", { name: "Rojo" }).click();
    const stockText2 = await page.locator(".pdv-stock-indicator").innerText();
    check("ficha de remera muestra el color seleccionado en el stock", stockText2.includes("Rojo"), stockText2);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-remera-con-selector-color.png`, fullPage: true });

    // 3) Filtros de categoría — el color null del perfume no debe filtrarse
    // como una opción más (chequeado contra la respuesta real del endpoint,
    // no por texto: los swatches de color no tienen texto visible, solo
    // title="" — ver ProductDetailView/CategoryPage).
    const [categoryResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/public/${SLUG}/categories/${categorySlug}/products`)),
      page.goto(`${STORE_URL}/store/${SLUG}/c/${categorySlug}`),
    ]);
    const categoryData = await categoryResponse.json();
    const colores = categoryData.availableFilters.colores;
    check("el filtro de colores de la categoría no incluye null", !colores.includes(null), JSON.stringify(colores));
    check("el filtro de colores de la categoría incluye los colores reales de la remera", colores.includes("Azul") && colores.includes("Rojo"), JSON.stringify(colores));
    await page.getByText(`Perfume Test ${STAMP}`).waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-categoria-filtros.png`, fullPage: true });

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
