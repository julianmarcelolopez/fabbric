// T30/03 — verificación real de UI con Playwright: el header muestra
// siempre los mismos 4 links (Inicio/Explorar/Novedades/Ofertas), sin
// importar cuántas categorías tenga el tenant, con el resaltado correcto
// en cada pantalla — y el footer sigue mostrando las categorías reales,
// sin cambios. Dos orgs descartables (una con categorías, otra sin
// ninguna), no tocan datos de Eliathi.
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
const SLUG_CON_CATS = `t30-03-con-cats-${STAMP}`;
const SLUG_SIN_CATS = `t30-03-sin-cats-${STAMP}`;

async function setupConCategorias() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG_CON_CATS}, ${SLUG_CON_CATS}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG_CON_CATS}, ${SLUG_CON_CATS})`;
  const [cat1] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Remeras PW', ${SLUG_CON_CATS + "-remeras"}, 0) returning id`;
  const [cat2] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Pantalones PW', ${SLUG_CON_CATS + "-pantalones"}, 1) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id, sort_order) values (${org.id}, 'category', ${cat1.id}, 0)`;
  await sql`insert into home_sections (org_id, ref_type, ref_id, sort_order) values (${org.id}, 'category', ${cat2.id}, 1)`;
  return { orgId: org.id };
}

async function setupSinCategorias() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG_SIN_CATS}, ${SLUG_SIN_CATS}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG_SIN_CATS}, ${SLUG_SIN_CATS})`;
  return { orgId: org.id };
}

async function cleanup(orgId) {
  await sql`delete from home_sections where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

// catalog.css pone text-transform: uppercase en .store-nav a — innerText()
// devuelve el texto tal como se renderiza (en mayúsculas), no el markup.
async function activeLink(page) {
  const text = await page.locator(".store-nav a.active").innerText();
  return text.trim().toLowerCase();
}

async function main() {
  console.log("T30/03 — Header: nav fija\n");
  const { orgId: orgCon } = await setupConCategorias();
  const { orgId: orgSin } = await setupSinCategorias();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // ── Org CON categorías: el header NO debe mostrarlas ────────────────
    await page.goto(`${FRONTEND_URL}/store/${SLUG_CON_CATS}`);
    await page.locator(".store-nav").waitFor({ state: "visible", timeout: 10000 });
    const navText = await page.locator(".store-nav").innerText();
    check(
      "header muestra exactamente los 4 links fijos (no las categorías del tenant)",
      navText.replace(/\s+/g, " ").trim().toLowerCase() === "inicio explorar novedades ofertas",
      navText
    );
    check("en Inicio, 'Inicio' queda resaltado activo", (await activeLink(page)) === "inicio");

    await page.goto(`${FRONTEND_URL}/store/${SLUG_CON_CATS}/categorias`);
    check("en /categorias, 'Explorar' queda resaltado activo (no 'Inicio')", (await activeLink(page)) === "explorar");

    await page.goto(`${FRONTEND_URL}/store/${SLUG_CON_CATS}/novedades`);
    check("en /novedades, 'Novedades' queda resaltado activo", (await activeLink(page)) === "novedades");

    await page.goto(`${FRONTEND_URL}/store/${SLUG_CON_CATS}/ofertas`);
    check("en /ofertas, 'Ofertas' queda resaltado activo", (await activeLink(page)) === "ofertas");

    // ── Footer: sigue mostrando las categorías reales, sin cambios ──────
    await page.goto(`${FRONTEND_URL}/store/${SLUG_CON_CATS}`);
    const footerTienda = await page.locator(".footer-col", { has: page.getByText("Tienda") }).innerText();
    check(
      "footer sigue mostrando las categorías reales del tenant",
      footerTienda.includes("Remeras PW") && footerTienda.includes("Pantalones PW"),
      footerTienda
    );

    // ── Org SIN categorías: header igual (4 links fijos, no depende de navCategories) ──
    await page.goto(`${FRONTEND_URL}/store/${SLUG_SIN_CATS}`);
    const navTextSinCats = await page.locator(".store-nav").innerText();
    check(
      "un tenant sin categorías ve el mismo header de 4 links",
      navTextSinCats.replace(/\s+/g, " ").trim().toLowerCase() === "inicio explorar novedades ofertas",
      navTextSinCats
    );
    check(
      "footer sin categorías: la columna 'Tienda' no aparece (comportamiento ya existente, sin cambios)",
      (await page.getByText("Tienda", { exact: true }).count()) === 0
    );

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgCon);
    await cleanup(orgSin);
    const [leftover] = await sql`select count(*)::int as n from organizations where slug in (${SLUG_CON_CATS}, ${SLUG_SIN_CATS})`;
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
