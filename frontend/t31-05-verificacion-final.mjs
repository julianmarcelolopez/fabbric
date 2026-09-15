// T31/05 — Verificación final de T31_Buscador: circuito completo en el
// navegador real, un solo org descartable, cubriendo el checklist completo
// (debounce real, 0/1/>24 resultados, "ver todos" paginado, navegación a
// producto, overlay mobile, header de T30 intacto). No toca datos de Eliathi.
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
const SLUG = `t31-05-${STAMP}`;
const TERMINO = `campera${STAMP}`; // 26 coincidencias → prueba paginación real
const TERMINO_UNICO = `unicornio${STAMP}`; // 1 coincidencia
const TERMINO_VACIO = `noexiste${STAMP}`; // 0 coincidencias

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat T31 Final', ${SLUG}, 0) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id) values (${org.id}, 'category', ${cat.id})`;

  // 26 productos con el término de paginación
  for (let i = 0; i < 26; i++) {
    const [p] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${`${TERMINO} modelo ${i}`}, ${10000 + i * 100}) returning id`;
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  }
  // 1 producto único
  const [pUnico] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${TERMINO_UNICO}, 50000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${pUnico.id}, ${org.id}, 'M', 'Negro', 5, 5)`;

  return { orgId: org.id, productId: pUnico.id };
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
  console.log("T31/05 — Verificación final\n");
  const { orgId, productId } = await setup();
  const browser = await chromium.launch();

  try {
    // ── Desktop ───────────────────────────────────────────────────────────
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const searchRequests = [];
    page.on("request", (r) => {
      if (r.url().includes("/search")) searchRequests.push(r.url());
    });

    await page.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });

    // 1) Header de T30 intacto en reposo
    const navText = await page.locator(".store-nav").innerText();
    check(
      "el header sigue mostrando los 4 links fijos de T30 en reposo",
      navText.replace(/\s+/g, " ").trim().toLowerCase() === "inicio explorar novedades ofertas",
      navText
    );

    // 2) Debounce real + resultado único
    await page.getByRole("button", { name: "Buscar" }).click();
    const input = page.getByPlaceholder("Buscar productos...");
    await input.pressSequentially(TERMINO_UNICO);
    await page.locator(".search-result-item").first().waitFor({ state: "visible", timeout: 10000 });
    check("debounce real: un solo request al backend al tipear letra por letra", searchRequests.length === 1, `${searchRequests.length}`);
    check("término con 1 coincidencia: aparece ese único resultado", (await page.locator(".search-result-item").count()) === 1);

    // 3) Clic en el resultado navega a la ficha correcta
    await page.locator(".search-result-item").first().click();
    await page.waitForURL((u) => u.pathname === `/store/${SLUG}/p/${productId}`, { timeout: 10000 });
    check("clic en el resultado navega a la ficha de producto correcta", true);

    // 4) Término sin coincidencias → estado vacío con sugerencias, no error
    await page.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByPlaceholder("Buscar productos...").fill(TERMINO_VACIO);
    await page.getByText("No encontramos productos con ese nombre.").waitFor({ state: "visible", timeout: 10000 });
    check("0 resultados: estado vacío con sugerencias, nunca un panel en blanco ni error", true);
    check(
      "sugerencia de categoría real visible en el estado vacío",
      await page.locator(".search-dropdown-suggested").getByText("Cat T31 Final").isVisible()
    );

    // 5) "Ver todos los resultados" con >24 coincidencias → paginado, total real
    await page.getByPlaceholder("Buscar productos...").fill(TERMINO);
    const viewAll = page.getByText(`Ver todos los resultados para «${TERMINO}»`);
    await viewAll.waitFor({ state: "visible", timeout: 10000 });
    await viewAll.click();
    await page.waitForURL((u) => u.pathname === `/store/${SLUG}/buscar`, { timeout: 10000 });
    await page.getByRole("heading", { name: `Resultados para "${TERMINO}"` }).waitFor({ state: "visible", timeout: 10000 });
    const resultCount = await page.locator(".result-count").first().innerText();
    check("'Ver todos' lleva a /buscar con el total real (26)", resultCount.includes("26"), resultCount);
    check("paginado: página 1 muestra 24, hay botón de página 2", (await page.locator(".pcard-name").count()) === 24 && (await page.getByRole("button", { name: "2" }).count()) === 1);

    await page.close();

    // ── Mobile: overlay de pantalla completa ─────────────────────────────
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    await mobile.getByRole("button", { name: "Buscar" }).click();
    await mobile.getByPlaceholder("Buscar productos...").waitFor({ state: "visible", timeout: 5000 });
    const wrapBox = await mobile.locator(".search-field-wrap").boundingBox();
    check(
      "mobile: el buscador abre como overlay de pantalla completa",
      wrapBox && wrapBox.width === 390 && wrapBox.height === 844
    );
    check(
      "mobile: el layout del header no se rompe (sigue existiendo el store-header)",
      await mobile.locator(".store-header").isVisible()
    );
    await mobile.close();
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
