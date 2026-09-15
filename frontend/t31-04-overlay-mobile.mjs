// T31/04 — verificación real de UI con Playwright: overlay de pantalla
// completa del buscador en mobile (≤768px) — mismo componente/lógica que
// el desktop (Tarea 3), solo CSS responsive (sin componente nuevo). Org
// descartable, no toca datos de Eliathi.
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
const SLUG = `t31-04-${STAMP}`;
const TERMINO = `mochila${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat T31-04', ${SLUG}, 0) returning id`;
  const [p] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${`${TERMINO} urbana`}, 28000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  return { orgId: org.id, productId: p.id };
}

async function cleanup(orgId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

async function main() {
  console.log("T31/04 — Frontend: overlay mobile\n");
  const { orgId, productId } = await setup();
  const browser = await chromium.launch();

  try {
    // ── Mobile (≤768px): overlay de pantalla completa ───────────────────
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    await mobile.getByRole("button", { name: "Buscar" }).click();
    const input = mobile.getByPlaceholder("Buscar productos...");
    await input.waitFor({ state: "visible", timeout: 5000 });

    const wrapBox = await mobile.locator(".search-field-wrap").boundingBox();
    check(
      "en mobile, el buscador tapa la pantalla completa (no un dropdown angosto)",
      wrapBox && wrapBox.width === 390 && wrapBox.height === 844,
      JSON.stringify(wrapBox)
    );
    const position = await mobile.locator(".search-field-wrap").evaluate((el) => getComputedStyle(el).position);
    check("position: fixed en mobile", position === "fixed", position);

    await input.pressSequentially(TERMINO);
    await mobile.locator(".search-result-item").first().waitFor({ state: "visible", timeout: 10000 });
    const dropdownPosition = await mobile.locator(".search-dropdown").evaluate((el) => getComputedStyle(el).position);
    check("la lista de resultados es estática (parte del overlay, no un panel flotante)", dropdownPosition === "static", dropdownPosition);

    await mobile.locator(".search-result-item").first().click();
    await mobile.waitForURL((u) => u.pathname === `/store/${SLUG}/p/${productId}`, { timeout: 10000 });
    check("clic en un resultado navega a la ficha, igual que en desktop", true);
    await mobile.close();

    // ── Regresión: en desktop sigue siendo el dropdown in-place, no el overlay ──
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await desktop.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    await desktop.getByRole("button", { name: "Buscar" }).click();
    await desktop.getByPlaceholder("Buscar productos...").waitFor({ state: "visible", timeout: 5000 });
    const desktopPosition = await desktop.locator(".search-field-wrap").evaluate((el) => getComputedStyle(el).position);
    check("en desktop (>768px) sigue siendo relative/in-place, no fixed", desktopPosition === "relative", desktopPosition);
    await desktop.close();
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
