// T29/07 — Verificación final de punta a punta: admin (alta/edición/logo/
// borrado de marca + combo en producto) → PWA (alta por QR con marca nueva
// inline) → storefront (tab Marcas, página de marca, filtro dentro de una
// categoría) — un solo circuito con los mismos datos de punta a punta, no
// piezas sueltas. Org/usuario descartables, no toca datos de Eliathi.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const FRONTEND_URL = "http://localhost:5173";
const PWA_URL = "http://localhost:5174";
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
const SLUG = `t29-07-${STAMP}`;
const EMAIL = `julianmarcelolopez+t2907${STAMP}@gmail.com`;
const PASSWORD = `T2907temp!pass-${STAMP}`;
const MARCA_ADMIN = `E2E Marca Admin ${STAMP}`;
const MARCA_DESCARTABLE = `E2E Marca Borrar ${STAMP}`;
const MARCA_PWA = `E2E Marca PWA ${STAMP}`;
const BARCODE = `T2907-${STAMP}`;

// PNG 1×1 real embebido (mismo truco que t21-01-image-upload.mjs) — sin depender de un archivo externo.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUAY6YZAAAAAElFTkSuQmCC",
  "base64"
);

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${SLUG}, ${SLUG}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  const [cat] = await sql`insert into categories (org_id, name, slug, sort_order) values (${org.id}, 'Categoria E2E', ${SLUG}, 0) returning id`;
  await sql`insert into home_sections (org_id, ref_type, ref_id) values (${org.id}, 'category', ${cat.id})`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${SLUG}, ${SLUG})`;

  return { orgId: org.id, userId: created.user.id, categorySlug: SLUG, categoryId: cat.id };
}

async function loginAdmin(page) {
  await page.goto(`${FRONTEND_URL}/admin/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 15000 });
}

async function cleanup(orgId, userId) {
  await sql`delete from product_variants where org_id = ${orgId}`;
  await sql`delete from products where org_id = ${orgId}`;
  await sql`delete from brands where org_id = ${orgId}`;
  await sql`delete from home_sections where org_id = ${orgId}`;
  await sql`delete from categories where org_id = ${orgId}`;
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log("T29/07 — Verificación final de punta a punta\n");
  const { orgId, userId, categorySlug, categoryId } = await setup();
  const browser = await chromium.launch();

  try {
    // ── 1) Admin → Productos → Marcas: alta, logo, borrado ──────────────
    const adminPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await loginAdmin(adminPage);
    await adminPage.goto(`${FRONTEND_URL}/admin/products?tab=marcas`);

    await adminPage.getByLabel("Nombre").fill(MARCA_ADMIN);
    const [createResp] = await Promise.all([
      adminPage.waitForResponse((r) => r.url().endsWith("/admin/brands") && r.request().method() === "POST"),
      adminPage.getByRole("button", { name: "Crear" }).click(),
    ]);
    check("1a. crear marca desde el admin → 201", createResp.status() === 201);
    await adminPage.getByRole("cell", { name: MARCA_ADMIN }).waitFor({ state: "visible", timeout: 10000 });

    // Logo: subir una imagen real a la marca recién creada
    const row = adminPage.locator("tr", { has: adminPage.getByRole("cell", { name: MARCA_ADMIN }) });
    const fileChooserPromise = adminPage.waitForEvent("filechooser");
    await row.getByRole("button", { name: "Subir" }).click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG_1x1 });
    await adminPage.getByRole("button", { name: "Cambiar" }).waitFor({ state: "visible", timeout: 10000 });
    const [brandRow] = await sql`select id, image_url from brands where org_id = ${orgId} and name = ${MARCA_ADMIN}`;
    check("1b. logo de marca subido (imageUrl real en la DB)", !!brandRow.image_url);

    // Alta + edición + borrado de una segunda marca descartable
    await adminPage.getByLabel("Nombre").fill(MARCA_DESCARTABLE);
    await adminPage.getByRole("button", { name: "Crear" }).click();
    await adminPage.getByRole("cell", { name: MARCA_DESCARTABLE }).waitFor({ state: "visible", timeout: 10000 });
    const rowDescartable = adminPage.locator("tr", { has: adminPage.getByRole("cell", { name: MARCA_DESCARTABLE }) });
    await rowDescartable.getByRole("button", { name: "Editar" }).click();
    const nuevoNombre = `${MARCA_DESCARTABLE} (editada)`;
    // Los dos <input> de edición de TaxonomyManager no tienen label ni
    // atributo `value` en el DOM (controlados por React) — se excluyen los
    // checkboxes de "Activa" de cada fila (esos sí tienen type="checkbox"
    // literal), y el primero que queda es el de "Nombre".
    await adminPage.locator('table.grid tbody input:not([type="checkbox"])').first().fill(nuevoNombre);
    await adminPage.getByRole("button", { name: "Guardar" }).click();
    await adminPage.getByRole("cell", { name: nuevoNombre }).waitFor({ state: "visible", timeout: 10000 });
    check("1c. editar marca funciona", true);

    adminPage.on("dialog", (d) => d.accept());
    await adminPage.locator("tr").filter({ hasText: nuevoNombre }).getByRole("button", { name: "Borrar" }).click();
    await adminPage.getByRole("cell", { name: nuevoNombre }).waitFor({ state: "hidden", timeout: 10000 });
    const [borrada] = await sql`select id from brands where org_id = ${orgId} and name = ${nuevoNombre}`;
    check("1d. borrar marca funciona", !borrada);

    // ── 2) Admin → producto nuevo con el combo de marca existente ───────
    await adminPage.goto(`${FRONTEND_URL}/admin/products`);
    await adminPage.getByLabel("Nombre").fill("Producto E2E Admin");
    await adminPage.getByLabel("Categoría").selectOption({ label: "Categoria E2E" });
    await adminPage.getByLabel("Precio ($)").fill("30000");
    const [prodResp] = await Promise.all([
      adminPage.waitForResponse((r) => r.url().endsWith("/admin/products") && r.request().method() === "POST"),
      adminPage.getByRole("button", { name: "Crear y editar" }).click(),
    ]);
    check("2a. crear producto → 201", prodResp.status() === 201);
    await adminPage.waitForURL(/\/admin\/products\/[0-9a-f-]+$/, { timeout: 10000 });
    const productId = adminPage.url().split("/").pop();

    await adminPage.getByLabel("Marca").fill(MARCA_ADMIN);
    const [patchResp] = await Promise.all([
      adminPage.waitForResponse((r) => r.url().endsWith(`/admin/products/${productId}`) && r.request().method() === "PATCH"),
      adminPage.getByRole("button", { name: /Siguiente: Variantes/ }).click(),
    ]);
    check("2b. combo de marca en la ficha de producto → 200", patchResp.ok());
    const [prod] = await sql`select brand_id from products where id = ${productId}`;
    check("2c. producto quedó enlazado a la marca elegida", prod.brand_id === brandRow.id);
    await adminPage.close();

    // Necesita al menos una variante para que el producto sea visible en catálogo
    await sql`insert into product_variants (product_id, org_id, talle, color, stock_local, stock_online) values (${productId}, ${orgId}, 'M', 'Negro', 3, 3)`;
    await sql`update products set visible_in_catalog = true where id = ${productId}`;

    // ── 3) PWA → alta por QR con marca nueva (alta inline) ──────────────
    const pwaPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pwaPage.goto(PWA_URL);
    await pwaPage.getByPlaceholder("Email").fill(EMAIL);
    await pwaPage.getByPlaceholder("Contraseña").fill(PASSWORD);
    await pwaPage.getByRole("button", { name: "Ingresar" }).click();
    await pwaPage.getByRole("button", { name: "Recibir mercadería" }).waitFor({ state: "visible", timeout: 15000 });
    await pwaPage.getByRole("button", { name: "Recibir mercadería" }).click();
    await pwaPage.getByPlaceholder("Código de barras").fill(BARCODE);
    await pwaPage.getByRole("button", { name: "Buscar" }).click();
    await pwaPage.getByText("Producto nuevo").waitFor({ state: "visible", timeout: 10000 });

    await pwaPage.getByPlaceholder("Marca").fill(MARCA_PWA);
    await pwaPage.getByPlaceholder("Modelo").fill("Producto E2E PWA");
    await pwaPage.locator("select").selectOption({ label: "Categoria E2E" });
    await pwaPage.getByPlaceholder("Talle").fill("L");
    await pwaPage.getByPlaceholder("Color").fill("Blanco");
    await pwaPage.getByPlaceholder("Precio").fill("22000");
    const [altaResp] = await Promise.all([
      pwaPage.waitForResponse((r) => r.url().endsWith("/admin/products/alta-rapida") && r.request().method() === "POST"),
      pwaPage.getByRole("button", { name: "Guardar producto" }).click(),
    ]);
    check("3a. alta por QR con marca nueva (alta inline) → 201", altaResp.status() === 201);
    const [marcaPwaRow] = await sql`select id from brands where org_id = ${orgId} and name = ${MARCA_PWA}`;
    check("3b. la marca creada desde la PWA existe en el catálogo", !!marcaPwaRow);
    await sql`update products set visible_in_catalog = true where org_id = ${orgId} and name = 'Producto E2E PWA'`;
    await pwaPage.close();

    // ── 4) Storefront: tab Marcas, página de marca, filtro en categoría ──
    const storePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await storePage.goto(`${FRONTEND_URL}/store/${SLUG}/categorias?tab=marcas`);
    await storePage.getByText(MARCA_ADMIN).waitFor({ state: "visible", timeout: 10000 });
    await storePage.getByText(MARCA_PWA).waitFor({ state: "visible", timeout: 10000 });
    check("4a. ambas marcas (admin + PWA) aparecen en el tab Marcas", true);

    await storePage.getByText(MARCA_ADMIN).click();
    await storePage.getByText("Producto E2E Admin").waitFor({ state: "visible", timeout: 10000 });
    check("4b. la página de la marca del admin muestra su producto", true);

    await storePage.goto(`${FRONTEND_URL}/store/${SLUG}/c/${categorySlug}`);
    const chip = storePage.getByRole("button", { name: MARCA_ADMIN });
    await chip.waitFor({ state: "visible", timeout: 10000 });
    // El filtro se debouncea 300ms antes de tocar la URL, y `data` NO se
    // vacía durante el refetch (T21/08, a propósito: evita que el sidebar
    // "parpadee") — hay que esperar la respuesta real del fetch filtrado,
    // no alcanza con esperar el click ni el cambio de URL: hasta que llega,
    // la grilla sigue mostrando la lista vieja sin filtrar.
    const [filterResp] = await Promise.all([
      storePage.waitForResponse(
        (r) => r.url().includes(`/categories/${categorySlug}/products`) && r.url().includes("marca="),
        { timeout: 10000 }
      ),
      chip.click(),
    ]);
    check("4c-pre. el fetch filtrado por marca devolvió 200", filterResp.ok());
    await storePage.getByText("Producto E2E Admin").waitFor({ state: "visible", timeout: 10000 });
    check("4c. filtro de marca dentro de la categoría funciona", (await storePage.getByText("Producto E2E PWA").count()) === 0);
    await storePage.close();

    // ── 5) Integridad de datos: nada quedó con marca "perdida" ──────────
    const [huerfanos] = await sql`select count(*)::int as n from products where org_id = ${orgId} and name in ('Producto E2E Admin', 'Producto E2E PWA') and brand_id is null`;
    check("5. ningún producto de este circuito quedó sin brandId", huerfanos.n === 0);
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
