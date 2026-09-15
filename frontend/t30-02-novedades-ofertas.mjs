// T30/02 — verificación real de UI con Playwright: páginas Novedades y
// Ofertas (breadcrumb de 2 niveles, orden por más nuevo, filtro de oferta,
// estado vacío específico). Dos orgs descartables (una con datos, otra sin
// ninguna oferta para probar el estado vacío), no tocan datos de Eliathi.
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
const SLUG_A = `t30-02-a-${STAMP}`;
const SLUG_B = `t30-02-b-${STAMP}`;

async function setupOrgConProductos() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG_A}, ${SLUG_A}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG_A}, ${SLUG_A})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat A', ${SLUG_A}, 0) returning id`;

  const now = new Date();
  const dias = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const [p1] = await sql`insert into products (org_id, category_id, name, price, created_at) values (${org.id}, ${cat.id}, 'Producto Viejo', 10000, ${dias(3)}) returning id`;
  const [p2] = await sql`insert into products (org_id, category_id, name, price, compare_at_price, created_at) values (${org.id}, ${cat.id}, 'Producto En Oferta', 8000, 12000, ${dias(1)}) returning id`;
  const [p3] = await sql`insert into products (org_id, category_id, name, price, created_at) values (${org.id}, ${cat.id}, 'Producto Nuevo', 15000, ${now}) returning id`;
  for (const p of [p1, p2, p3]) {
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  }

  return { orgId: org.id };
}

async function setupOrgSinOfertas() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG_B}, ${SLUG_B}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG_B}, ${SLUG_B})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat B', ${SLUG_B}, 0) returning id`;
  const [p] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, 'Producto Sin Oferta', 5000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  return { orgId: org.id };
}

async function cleanup(orgId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
}

async function main() {
  console.log("T30/02 — Frontend: páginas Novedades y Ofertas\n");
  const { orgId: orgIdA } = await setupOrgConProductos();
  const { orgId: orgIdB } = await setupOrgSinOfertas();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // ── Novedades ────────────────────────────────────────────────────────
    await page.goto(`${FRONTEND_URL}/store/${SLUG_A}/novedades`);
    await page.getByRole("heading", { name: "Novedades" }).waitFor({ state: "visible", timeout: 10000 });
    check("banner: título 'Novedades'", true);

    const breadcrumb = await page.locator(".breadcrumb").first().innerText();
    check(
      "breadcrumb de 2 niveles ('Inicio › Novedades', sin nivel del medio)",
      breadcrumb.replace(/\s+/g, " ").trim() === "Inicio › Novedades",
      breadcrumb
    );

    const nombresNovedades = await page.locator(".pcard-name").allInnerTexts();
    check(
      "orden por más nuevo primero",
      nombresNovedades[0] === "Producto Nuevo" &&
        nombresNovedades[1] === "Producto En Oferta" &&
        nombresNovedades[2] === "Producto Viejo",
      JSON.stringify(nombresNovedades)
    );

    // ── Ofertas (misma org) ──────────────────────────────────────────────
    await page.goto(`${FRONTEND_URL}/store/${SLUG_A}/ofertas`);
    await page.getByRole("heading", { name: "Ofertas" }).waitFor({ state: "visible", timeout: 10000 });
    const breadcrumbOfertas = await page.locator(".breadcrumb").first().innerText();
    check(
      "breadcrumb de Ofertas también en 2 niveles",
      breadcrumbOfertas.replace(/\s+/g, " ").trim() === "Inicio › Ofertas"
    );
    const nombresOfertas = await page.locator(".pcard-name").allInnerTexts();
    check("Ofertas muestra solo el producto con precio tachado", JSON.stringify(nombresOfertas) === JSON.stringify(["Producto En Oferta"]));

    // ── Ofertas vacío (otra org, sin ningún producto en oferta) ──────────
    await page.goto(`${FRONTEND_URL}/store/${SLUG_B}/ofertas`);
    await page.getByText("Por ahora no hay productos en oferta.").waitFor({ state: "visible", timeout: 10000 });
    check("estado vacío específico de Ofertas (no un mensaje genérico ni un error)", true);

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgIdA);
    await cleanup(orgIdB);
    const [leftover] = await sql`select count(*)::int as n from organizations where slug in (${SLUG_A}, ${SLUG_B})`;
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
