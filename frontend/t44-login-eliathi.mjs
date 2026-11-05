// T44/Tarea 3 — verificación real de UI con Playwright del login nuevo del
// admin (/admin/login): layout de 2 columnas, error, ojito, estado cargando,
// móvil, login real con Enter y regresión (el CSS del login no se filtra al
// resto del admin). Usuario/org descartables (mismo patrón que
// t43-pwa-alta-color-opcional.mjs), no toca datos de Eliathi. Limpia todo al
// final. Capturas en ./test/ dentro de la tarea 3.
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), "../.env.local") });

const ADMIN_URL = "http://localhost:5173";
const SHOTS = resolve(process.cwd(), "../docs/T44_LoginEliathi/tareas/03-verificacion/test");
mkdirSync(SHOTS, { recursive: true });

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
const EMAIL = `julianmarcelolopez+t44${STAMP}@gmail.com`;
const PASSWORD = `T44temp!pass-${STAMP}`;

async function setup() {
  const { data: created, error } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const slug = `t44-login-${STAMP}`;
  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${EMAIL}, 'owner')`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;
  return { orgId: org.id, userId: created.user.id };
}

async function cleanup(orgId, userId) {
  await sql`delete from catalog_configs where org_id = ${orgId}`;
  await sql`delete from admin_users where org_id = ${orgId}`;
  await sql`delete from organizations where id = ${orgId}`;
  await supa.auth.admin.deleteUser(userId).catch(() => {});
  const left = await sql`select count(*)::int as n from organizations where id = ${orgId}`;
  check("limpieza: la org de prueba ya no existe", left[0].n === 0);
}

const { orgId, userId } = await setup();
const browser = await chromium.launch();

try {
  // ── 1. Escritorio: layout de 2 columnas ──────────────────────────────────
  console.log("\n1) Escritorio 1440x900 — layout");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN_URL}/admin/login`);
  await page.waitForSelector(".login-form-pane");
  await page.evaluate(() => document.fonts.ready);

  check("se ve 'Bienvenida'", (await page.locator(".login-brand-head h1").innerText()) === "Bienvenida");
  check("el panel de marca está visible", await page.locator(".login-brand-pane").isVisible());
  const cols = await page.evaluate(() => {
    const f = document.querySelector(".login-form-pane").getBoundingClientRect();
    const b = document.querySelector(".login-brand-pane").getBoundingClientRect();
    return { f: Math.round(f.width), b: Math.round(b.width), bLeft: Math.round(b.left) };
  });
  check("2 columnas de ~mitad de ancho cada una", Math.abs(cols.f - cols.b) <= 2, JSON.stringify(cols));
  check(
    "el logotipo usa Alex Brush",
    (await page.locator(".login-form-pane .login-script").evaluate((e) => getComputedStyle(e).fontFamily)).includes("Alex Brush")
  );
  check("no hay botón de Google, Recordarme ni Registrate (v1)", (await page.getByText(/Google|Recordarme|Registrate|Olvidaste/i).count()) === 0);
  await page.screenshot({ path: `${SHOTS}/01-desktop-normal.png` });

  // ── 2. Foco ──────────────────────────────────────────────────────────────
  console.log("\n2) Foco en el input");
  await page.getByLabel("Email").focus();
  await page.waitForTimeout(400); // transición de 150ms del borde
  const focusBorder = await page.getByLabel("Email").evaluate((e) => getComputedStyle(e).borderColor);
  check("el input enfocado tiene borde coral", focusBorder === "rgb(240, 112, 88)", focusBorder);
  await page.getByLabel("Email").fill(EMAIL);
  await page.screenshot({ path: `${SHOTS}/02-desktop-foco.png` });

  // ── 3. Ojito ─────────────────────────────────────────────────────────────
  console.log("\n3) Ojito mostrar/ocultar contraseña");
  const pw = page.getByLabel("Contraseña", { exact: true });
  await pw.fill("clave-incorrecta");
  check("la contraseña arranca oculta", (await pw.getAttribute("type")) === "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  check("al tocar el ojito se muestra el texto", (await pw.getAttribute("type")) === "text");
  check("el aria-label pasa a 'Ocultar contraseña'", (await page.getByRole("button", { name: "Ocultar contraseña" }).count()) === 1);
  await page.screenshot({ path: `${SHOTS}/03-desktop-ojito-visible.png` });
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  check("tocarlo de nuevo la vuelve a ocultar", (await pw.getAttribute("type")) === "password");

  // ── 4. Cargando ──────────────────────────────────────────────────────────
  console.log("\n4) Estado cargando");
  await page.route("**/auth/v1/token*", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForSelector(".login-spin");
  const loadingBtn = page.locator(".login-btn");
  check("el botón queda deshabilitado", await loadingBtn.isDisabled());
  check("el botón dice 'Ingresando...'", (await loadingBtn.innerText()).includes("Ingresando..."));
  await page.screenshot({ path: `${SHOTS}/04-desktop-cargando.png` });

  // ── 5. Error ─────────────────────────────────────────────────────────────
  console.log("\n5) Credenciales incorrectas");
  await page.waitForSelector(".login-error");
  await page.unroute("**/auth/v1/token*");
  check("banner con el mensaje genérico", (await page.locator(".login-error").innerText()).trim() === "Email o contraseña incorrectos");
  check("el banner tiene role=alert", (await page.locator(".login-error").getAttribute("role")) === "alert");
  check("seguimos en /admin/login", page.url().endsWith("/admin/login"));
  check("el botón volvió a estar habilitado", await page.locator(".login-btn").isEnabled());
  await page.screenshot({ path: `${SHOTS}/05-desktop-error.png` });

  // ── 6. Móvil ─────────────────────────────────────────────────────────────
  console.log("\n6) Móvil 375x740");
  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2 });
  const mpage = await mctx.newPage();
  await mpage.goto(`${ADMIN_URL}/admin/login`);
  await mpage.waitForSelector(".login-form-pane");
  await mpage.evaluate(() => document.fonts.ready);
  check("el panel de marca se oculta", !(await mpage.locator(".login-brand-pane").isVisible()));
  check("el formulario sigue visible", await mpage.locator(".login-btn").isVisible());
  const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("sin scroll horizontal", overflow <= 0, `overflow=${overflow}`);
  await mpage.screenshot({ path: `${SHOTS}/06-movil-normal.png` });
  await mctx.close();

  // ── 7. Login real con Enter + redirect ───────────────────────────────────
  console.log("\n7) Login correcto (Enter)");
  await page.getByLabel("Email").fill(EMAIL);
  await pw.fill(PASSWORD);
  await pw.press("Enter");
  await page.waitForURL(`${ADMIN_URL}/admin`, { timeout: 15000 }).catch(() => {});
  check("Enter envía el formulario y lleva a /admin", page.url() === `${ADMIN_URL}/admin`, page.url());

  // ── 8. Regresión: el CSS del login no se filtra ──────────────────────────
  console.log("\n8) Regresión — resto del admin");
  await page.waitForSelector(".sidebar", { timeout: 15000 }).catch(() => {});
  check("el admin muestra su sidebar de siempre", (await page.locator(".sidebar").count()) > 0);
  check("no queda ningún elemento .login en el admin", (await page.locator(".login").count()) === 0);
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check("la tipografía del admin no cambió por el login", !bodyFont.includes("Alex Brush"), bodyFont);
  await page.screenshot({ path: `${SHOTS}/07-admin-despues-del-login.png` });

  // ── 9. Con sesión, /admin/login redirige ─────────────────────────────────
  console.log("\n9) Con sesión activa");
  await page.goto(`${ADMIN_URL}/admin/login`);
  await page.waitForURL(`${ADMIN_URL}/admin`, { timeout: 10000 }).catch(() => {});
  check("/admin/login redirige a /admin si ya hay sesión", page.url() === `${ADMIN_URL}/admin`, page.url());

  await ctx.close();
} catch (e) {
  fail++;
  console.log("  ❌ excepción:", e.message);
} finally {
  await browser.close();
  await cleanup(orgId, userId);
  await sql.end();
}

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
