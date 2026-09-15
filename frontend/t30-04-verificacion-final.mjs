// T30/04 — Verificación final de T30_HeaderTienda: circuito completo en el
// navegador, navegando por CLICK en el header real (no goto directo) entre
// Inicio → Explorar → Novedades → Ofertas, con el filtro de marca probado
// por UI dentro de Novedades y de Ofertas, más el footer y el estado vacío.
// Dos orgs descartables, no tocan datos de Eliathi.
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
const SLUG = `t30-04-${STAMP}`;
const SLUG_VACIA = `t30-04-vacia-${STAMP}`;
const BRAND_X = `E2E Brand X ${STAMP}`;
const BRAND_Y = `E2E Brand Y ${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat E2E T30', ${SLUG}, 0) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id) values (${org.id}, 'category', ${cat.id})`;
  const [bx] = await sql`insert into brands (org_id, name, slug) values (${org.id}, ${BRAND_X}, ${"e2e-brand-x-" + STAMP}) returning id, slug`;
  const [by] = await sql`insert into brands (org_id, name, slug) values (${org.id}, ${BRAND_Y}, ${"e2e-brand-y-" + STAMP}) returning id`;

  const now = new Date();
  const dias = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const p1 = (await sql`insert into products (org_id, category_id, brand_id, name, price, created_at) values (${org.id}, ${cat.id}, ${bx.id}, 'P1 Viejo BrandX', 10000, ${dias(3)}) returning id`)[0];
  const p2 = (await sql`insert into products (org_id, category_id, brand_id, name, price, compare_at_price, created_at) values (${org.id}, ${cat.id}, ${by.id}, 'P2 Oferta BrandY', 20000, 28000, ${dias(1)}) returning id`)[0];
  const p3 = (await sql`insert into products (org_id, category_id, brand_id, name, price, created_at) values (${org.id}, ${cat.id}, ${bx.id}, 'P3 Nuevo BrandX', 15000, ${now}) returning id`)[0];
  const p4 = (await sql`insert into products (org_id, category_id, brand_id, name, price, created_at) values (${org.id}, ${cat.id}, ${by.id}, 'P4 BrandY', 25000, ${dias(2)}) returning id`)[0];
  for (const p of [p1, p2, p3, p4]) {
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  }

  const [orgVacia] = await sql`insert into organizations (name, slug) values (${SLUG_VACIA}, ${SLUG_VACIA}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${orgVacia.id}, ${SLUG_VACIA}, ${SLUG_VACIA})`;

  return { orgId: org.id, orgIdVacia: orgVacia.id, brandXSlug: bx.slug };
}

async function cleanup(orgId, orgIdVacia) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from brands where org_id = ${orgId}`;
  await sql`delete from home_sections where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgIdVacia}`;
  await sql`delete from organizations where id = ${orgIdVacia}`;
}

async function activeLink(page) {
  const text = await page.locator(".store-nav a.active").innerText();
  return text.trim().toLowerCase();
}

async function main() {
  console.log("T30/04 — Verificación final\n");
  const { orgId, orgIdVacia, brandXSlug } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // ── 1) Navegación por click real en el header, no goto directo ──────
    // Se espera "networkidle" tras cada navegación: el Home dispara sus
    // propios fetches (config/shipping-zones/home) y si se hace click antes
    // de que terminen, quedan compitiendo con los de la página siguiente —
    // en el Vite dev server (no en prod) esto puede demorar la respuesta
    // varios segundos de más. No es un bug de la app, es nomás una carrera
    // de red del entorno de desarrollo — se evita esperando idle primero.
    await page.goto(`${FRONTEND_URL}/store/${SLUG}`, { waitUntil: "networkidle" });
    check("Inicio: 'Inicio' activo", (await activeLink(page)) === "inicio");

    await page.getByRole("link", { name: "Explorar" }).click();
    await page.getByRole("button", { name: "Categorías" }).waitFor({ state: "visible", timeout: 20000 });
    await page.waitForLoadState("networkidle");
    check("click en 'Explorar' navega y queda activo", (await activeLink(page)) === "explorar");

    await page.getByRole("link", { name: "Novedades" }).click();
    await page.getByRole("heading", { name: "Novedades" }).waitFor({ state: "visible", timeout: 20000 });
    await page.locator(".pcard-name").first().waitFor({ state: "visible", timeout: 20000 });
    await page.waitForLoadState("networkidle");
    check("click en 'Novedades' navega y queda activo", (await activeLink(page)) === "novedades");
    const ordenNovedades = await page.locator(".pcard-name").allInnerTexts();
    check(
      "Novedades: orden por más nuevo primero",
      ordenNovedades[0] === "P3 Nuevo BrandX" && ordenNovedades[1] === "P2 Oferta BrandY",
      JSON.stringify(ordenNovedades)
    );

    // ── 2) Filtro de marca por UI dentro de Novedades (no por URL directa) ──
    const chipX = page.getByRole("button", { name: BRAND_X });
    await chipX.waitFor({ state: "visible", timeout: 10000 });
    const [filterResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/novedades/products") && r.url().includes(`marca=${brandXSlug}`)),
      chipX.click(),
    ]);
    check("filtro de marca dentro de Novedades pega al backend con el slug correcto", filterResp.ok());
    await page.getByText("P1 Viejo BrandX").waitFor({ state: "visible", timeout: 10000 });
    const filtrados = await page.locator(".pcard-name").allInnerTexts();
    check(
      "Novedades filtrado por marca: solo quedan los productos de esa marca",
      filtrados.sort().join(",") === ["P1 Viejo BrandX", "P3 Nuevo BrandX"].sort().join(",")
    );

    // ── 3) Ofertas por click desde el header ─────────────────────────────
    await page.getByRole("link", { name: "Ofertas" }).click();
    await page.getByRole("heading", { name: "Ofertas" }).waitFor({ state: "visible", timeout: 20000 });
    await page.locator(".pcard-name").first().waitFor({ state: "visible", timeout: 20000 });
    check("click en 'Ofertas' navega y queda activo", (await activeLink(page)) === "ofertas");
    const ofertas = await page.locator(".pcard-name").allInnerTexts();
    check("Ofertas: solo el producto con precio tachado", JSON.stringify(ofertas) === JSON.stringify(["P2 Oferta BrandY"]));

    // ── 4) Footer sin cambios ─────────────────────────────────────────────
    const footerTienda = await page.locator(".footer-col", { has: page.getByText("Tienda") }).innerText();
    check("footer sigue mostrando la categoría real del tenant", footerTienda.includes("Cat E2E T30"));

    // ── 5) Ofertas vacío en otro tenant, llegando por click desde Inicio ──
    await page.goto(`${FRONTEND_URL}/store/${SLUG_VACIA}`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Ofertas" }).click();
    await page.getByText("Por ahora no hay productos en oferta.").waitFor({ state: "visible", timeout: 20000 });
    check("tenant sin ofertas: estado vacío correcto, sin error", true);

    await page.close();
  } finally {
    await browser.close();
    await cleanup(orgId, orgIdVacia);
    const [leftover] = await sql`select count(*)::int as n from organizations where slug in (${SLUG}, ${SLUG_VACIA})`;
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
