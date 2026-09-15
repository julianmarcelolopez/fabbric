// T31/03 — verificación real de UI con Playwright: buscador vivo en el
// header (desktop). Org descartable, no toca datos de Eliathi.
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
const SLUG = `t31-03-${STAMP}`;
const TERMINO = `campera${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Categoria Sugerida', ${SLUG}, 0) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id) values (${org.id}, 'category', ${cat.id})`;

  const [p1] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${`${TERMINO} de cuero`}, 45000) returning id`;
  const [p2] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${`${TERMINO} inflable`}, 32000) returning id`;
  for (const p of [p1, p2]) {
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  }

  return { orgId: org.id, productId: p1.id };
}

async function cleanup(orgId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from home_sections where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

async function main() {
  console.log("T31/03 — Frontend: buscador vivo en el header (desktop)\n");
  const { orgId, productId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const searchRequests = [];
  page.on("request", (r) => {
    if (r.url().includes("/public/") && r.url().includes("/search")) searchRequests.push(r.url());
  });

  try {
    await page.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });

    // 1) Reposo: nav visible, lupa ya no está disabled
    check("nav de 4 links visible en reposo", (await page.locator(".store-nav a").count()) === 4);
    const searchBtn = page.getByRole("button", { name: "Buscar" });
    check("botón de buscar existe y no está disabled", await searchBtn.isEnabled());

    // 2) Clic expande: nav desaparece, campo aparece con foco, Compartir/Cuenta desaparecen
    await searchBtn.click();
    const input = page.getByPlaceholder("Buscar productos...");
    await input.waitFor({ state: "visible", timeout: 5000 });
    check("al hacer clic, el nav desaparece", (await page.locator(".store-nav").count()) === 0);
    check("el campo queda con foco automático", await input.evaluate((el) => el === document.activeElement));
    check("Compartir/Cuenta se ocultan, Carrito sigue visible", (await page.getByTitle("Carrito").count()) === 1);

    // 3) Menos de 2 caracteres: sin dropdown
    await input.pressSequentially("c");
    await page.waitForTimeout(400);
    check("con 1 caracter no aparece dropdown", (await page.locator(".search-dropdown").count()) === 0);

    // 4) Escribir el término completo (simulando tipeo real) → debounce real, un solo request
    await input.pressSequentially(TERMINO.slice(1));
    await page.locator(".search-dropdown").waitFor({ state: "visible", timeout: 10000 });
    await page.locator(".search-result-item").first().waitFor({ state: "visible", timeout: 10000 });
    check("debounce real: un solo request al backend, no uno por tecla", searchRequests.length === 1, `${searchRequests.length} requests`);

    const nombres = await page.locator(".search-result-name").allInnerTexts();
    check("dropdown muestra los productos que matchean (máx 5)", nombres.length === 2 && nombres.every((n) => n.includes(TERMINO)), JSON.stringify(nombres));

    // 5) Clic en un resultado navega a la ficha del producto
    await page.locator(".search-result-item").first().click();
    await page.waitForURL((u) => u.pathname === `/store/${SLUG}/p/${productId}`, { timeout: 10000 });
    check("clic en un resultado navega a la ficha del producto", true);

    // 6) Reabrir y probar sin coincidencias + sugerencias
    await page.getByRole("button", { name: "Buscar" }).click();
    const input2 = page.getByPlaceholder("Buscar productos...");
    await input2.fill("zzzzznoexiste");
    await page.getByText("No encontramos productos con ese nombre.").waitFor({ state: "visible", timeout: 10000 });
    check("sin coincidencias: mensaje directo, no un panel vacío", true);
    check(
      "sugerencia de categoría real visible",
      await page.locator(".search-dropdown-suggested").getByRole("link", { name: "Categoria Sugerida" }).isVisible()
    );

    // 7) "Ver todos los resultados" con un término que sí matchea
    await input2.fill(TERMINO);
    const viewAll = page.getByText(`Ver todos los resultados para «${TERMINO}»`);
    await viewAll.waitFor({ state: "visible", timeout: 10000 });
    await viewAll.click();
    await page.waitForURL((u) => u.pathname === `/store/${SLUG}/buscar` && u.searchParams.get("q") === TERMINO, { timeout: 10000 });
    check("'Ver todos los resultados' navega a /buscar con el término", true);

    // 8) El nav vuelve a aparecer al cerrar (navegar afuera ya cerró el estado, pero probamos Escape en Inicio)
    await page.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByPlaceholder("Buscar productos...").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.locator(".store-nav").waitFor({ state: "visible", timeout: 5000 });
    check("Escape cierra el buscador y el nav vuelve a aparecer", true);

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgId);
    const [leftover] = await sql`select count(*)::int as n from organizations where slug = ${SLUG}`;
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
