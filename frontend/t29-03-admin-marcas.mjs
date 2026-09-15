// T29/03 — verificación real de UI con Playwright: alta de marca desde el
// tab "Marcas" de Productos, y el combo con alta inline en la ficha de
// producto (elegir una marca existente vs. escribir una nueva). Org y
// usuario descartables (mismo patrón que t25-06-admin-factura.mjs), no toca
// datos de Eliathi. Limpia todo al final.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const FRONTEND_URL = "http://localhost:5173";
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
const EMAIL = `julianmarcelolopez+t2903${STAMP}@gmail.com`;
const PASSWORD = `T2903temp!pass-${STAMP}`;
const BRAND_EXISTENTE = `PW Marca Existente ${STAMP}`;
const BRAND_NUEVA = `PW Marca Nueva ${STAMP}`;

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const slug = `t29-03-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod1] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, 'Producto PW Uno', 10000) returning id`;
  const [prod2] = await sql`insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, 'Producto PW Dos', 15000) returning id`;

  return { orgId: org.id, userId: created.user.id, prod1Id: prod1.id, prod2Id: prod2.id };
}

async function login(page) {
  await page.goto(`${FRONTEND_URL}/admin/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 15000 });
}

async function cleanup(orgId, userId) {
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from brands where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  // AdminLayout/MyStorePage crean un catalog_configs de la org al vuelo en el
  // primer load (no existía todavía cuando armamos el setup) — hay que
  // borrarlo también o el delete de organizations rompe por FK.
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log("T29/03 — Admin: sección Marcas + combo en ficha de producto\n");
  const { orgId, userId, prod1Id, prod2Id } = await setup();
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page);

    // 1) Alta de marca desde el tab "Marcas" de Productos
    await page.goto(`${FRONTEND_URL}/admin/products?tab=marcas`);
    await page.getByRole("heading", { name: "Nueva marca" }).waitFor({ state: "visible" });
    await page.getByLabel("Nombre").fill(BRAND_EXISTENTE);
    const [createResp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/admin/brands") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Crear" }).click(),
    ]);
    check("POST /admin/brands devolvió 201", createResp.status() === 201);
    await page.getByRole("cell", { name: BRAND_EXISTENTE }).waitFor({ state: "visible", timeout: 10000 });
    check("la marca creada aparece en la tabla del tab Marcas", true);

    const [brandRow] = await sql`select id, slug from brands where org_id = ${orgId} and name = ${BRAND_EXISTENTE}`;
    check("marca creada existe en la DB", !!brandRow);

    // 2) Elegir una marca EXISTENTE desde el combo de la ficha de producto
    await page.goto(`${FRONTEND_URL}/admin/products/${prod1Id}`);
    await page.getByLabel("Marca").fill(BRAND_EXISTENTE);
    const [save1] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith(`/admin/products/${prod1Id}`) && r.request().method() === "PATCH"),
      page.getByRole("button", { name: /Siguiente: Variantes/ }).click(),
    ]);
    check("PATCH del producto 1 devolvió 200", save1.ok());

    const [p1] = await sql`select brand_id from products where id = ${prod1Id}`;
    check("producto 1 quedó con el brandId de la marca existente", p1.brand_id === brandRow.id);
    const [dupCheck] = await sql`select count(*)::int as n from brands where org_id = ${orgId} and slug = ${brandRow.slug}`;
    check("elegir una marca existente NO la duplicó", dupCheck.n === 1, `hay ${dupCheck.n} filas con ese slug`);

    // 3) Alta inline: escribir una marca NUEVA en el combo de otro producto
    await page.goto(`${FRONTEND_URL}/admin/products/${prod2Id}`);
    await page.getByLabel("Marca").fill(BRAND_NUEVA);
    const [save2] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith(`/admin/products/${prod2Id}`) && r.request().method() === "PATCH"),
      page.getByRole("button", { name: /Siguiente: Variantes/ }).click(),
    ]);
    check("PATCH del producto 2 (alta inline) devolvió 200", save2.ok());

    const [nuevaBrand] = await sql`select id from brands where org_id = ${orgId} and name = ${BRAND_NUEVA}`;
    check("alta inline creó la marca nueva en la DB", !!nuevaBrand);
    const [p2] = await sql`select brand_id from products where id = ${prod2Id}`;
    check("producto 2 quedó enlazado a la marca creada al vuelo", !!nuevaBrand && p2.brand_id === nuevaBrand.id);

    // 4) La marca nueva ya aparece en el tab Marcas, sin refresh manual de datos
    await page.goto(`${FRONTEND_URL}/admin/products?tab=marcas`);
    let apareceEnListado = true;
    try {
      await page.getByRole("cell", { name: BRAND_NUEVA }).waitFor({ state: "visible", timeout: 10000 });
    } catch {
      apareceEnListado = false;
    }
    check("la marca creada por alta inline aparece en el listado de Marcas", apareceEnListado);

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
