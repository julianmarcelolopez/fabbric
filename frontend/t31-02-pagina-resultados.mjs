// T31/02 — verificación real de UI con Playwright: página de resultados
// completos del buscador (/store/:slug/buscar?q=...), reusando
// CategoryPage.tsx como sexto modo. Org descartable, no toca datos de
// Eliathi.
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
const SLUG = `t31-02-${STAMP}`;
const TERMINO = `zapatilla${STAMP}`;

async function setup() {
  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Cat T31', ${SLUG}, 0) returning id`;

  // 26 productos que matchean el término (para probar paginación, 24/página)
  // + 1 que NO matchea (para confirmar que el filtro realmente filtra).
  for (let i = 0; i < 26; i++) {
    const [p] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${`${TERMINO} modelo ${i}`}, ${10000 + i}) returning id`;
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${p.id}, ${org.id}, 'M', 'Negro', 5, 5)`;
  }
  const [pOtro] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, 'Remera cualquiera', 15000) returning id`;
  await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${pOtro.id}, ${org.id}, 'M', 'Negro', 5, 5)`;

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
  console.log("T31/02 — Frontend: página de resultados completos\n");
  const { orgId } = await setup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1) Búsqueda con resultados + paginación real
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/buscar?q=${TERMINO}`);
    await page.getByRole("heading", { name: `Resultados para "${TERMINO}"` }).waitFor({ state: "visible", timeout: 10000 });
    check("banner: título incluye el término buscado", true);

    const breadcrumb = await page.locator(".breadcrumb").first().innerText();
    check(
      "breadcrumb de 2 niveles (Inicio › Resultados para \"...\")",
      breadcrumb.replace(/\s+/g, " ").trim() === `Inicio › Resultados para "${TERMINO}"`,
      breadcrumb
    );

    const resultCount = await page.locator(".result-count").first().innerText();
    check("total de resultados correcto (26, no 27)", resultCount.includes("26"), resultCount);

    const nombres = await page.locator(".pcard-name").allInnerTexts();
    check(
      "solo aparecen productos que matchean el término (no 'Remera cualquiera')",
      nombres.every((n) => n.startsWith(TERMINO)) && nombres.length === 24,
      JSON.stringify(nombres.slice(0, 3))
    );

    // Paginación real: página 2 debería tener los 2 restantes. Se espera la
    // respuesta real del fetch de la página 2, no solo el cambio de URL —
    // `data` no se vacía durante el refetch (T21/08), así que leer el DOM
    // apenas cambia la URL todavía muestra la página 1 vieja.
    const [pageResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/search") && r.url().includes("page=2")),
      page.getByRole("button", { name: "2" }).click(),
    ]);
    check("pedido de la página 2 devolvió 200", pageResp.ok());
    await page.waitForFunction(() => document.querySelectorAll(".pcard-name").length === 2);
    const nombresPagina2 = await page.locator(".pcard-name").allInnerTexts();
    check("paginación real: página 2 tiene los 2 resultados restantes", nombresPagina2.length === 2, JSON.stringify(nombresPagina2));

    // 2) Búsqueda sin coincidencias
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/buscar?q=noexisteesteproducto`);
    await page.getByText('No encontramos productos que coincidan con "noexisteesteproducto".').waitFor({ state: "visible", timeout: 10000 });
    check("mensaje de vacío incluye el término exacto buscado", true);

    // 3) Sin q (entrar directo a /buscar)
    await page.goto(`${FRONTEND_URL}/store/${SLUG}/buscar`);
    await page.getByText("Escribí algo para buscar.").waitFor({ state: "visible", timeout: 10000 });
    check("sin ?q=: mensaje propio, sin pegarle al backend ni romper (esperaría 400 si pegara)", true);

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
