// T27/Fase 3, Tarea 2 — verifica el hero navy del login (sin necesitar
// sesión) y el fondo navy + colores activo/inactivo de la barra inferior
// (con una sesión descartable). No toca datos de Eliathi, limpia al final.
import { chromium } from "playwright";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

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

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const NAVY = "#1E2A4A";
const ACCENT = "#FF6B4A";

const STAMP = Date.now();
const EMAIL = `julianmarcelolopez+t2703pw${STAMP}@gmail.com`;
const PASSWORD = "T2703pwTemp!pass-9Rk3";

async function setup() {
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  const slug = `t27-03-02-pw-${STAMP}`;
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
}

async function main() {
  console.log("T27/Fase 3, Tarea 2 — Playwright: login (hero navy) y bottom nav\n");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // ── Login: no requiere sesión ──────────────────────────────────────────
  await page.goto(PWA_URL);
  await page.getByPlaceholder("Email").waitFor({ state: "visible", timeout: 10000 });

  const loginBg = await page.evaluate(() => {
    // El fondo navy está en el contenedor raíz del LoginScreen (el primer
    // div con position no-fixed que envuelve todo).
    const form = document.querySelector("form");
    return form ? getComputedStyle(form.parentElement).backgroundColor : null;
  });
  check("fondo del login es navy", loginBg === rgb(NAVY), loginBg);

  check("logotipo 'Eliathi' visible", await page.getByText("Eliathi", { exact: true }).isVisible());
  const logoFont = await page
    .getByText("Eliathi", { exact: true })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  check("logotipo usa Alex Brush", logoFont.includes("Alex Brush"), logoFont);
  check("'MODAS' visible debajo del logotipo", await page.getByText("MODAS").isVisible());

  const btnIngresar = page.getByRole("button", { name: "Ingresar" });
  const btnColor = await btnIngresar.evaluate((el) => getComputedStyle(el).backgroundColor);
  check("botón 'Ingresar' es coral (accent)", btnColor === rgb(ACCENT), btnColor);
  const btnAltura = (await btnIngresar.boundingBox())?.height ?? 0;
  check("botón 'Ingresar' mide ≥44px de alto", btnAltura >= 44, `${btnAltura}px`);

  // ── BottomNav: requiere sesión ──────────────────────────────────────────
  const { orgId, userId } = await setup();
  try {
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Contraseña").fill(PASSWORD);
    await btnIngresar.click();
    await page.getByPlaceholder("Código de barras").waitFor({ state: "visible", timeout: 10000 });

    const navBg = await page.evaluate(() => getComputedStyle(document.querySelector("nav")).backgroundColor);
    check("fondo de la barra inferior es navy", navBg === rgb(NAVY), navBg);

    const btnEscanear = page.getByRole("button", { name: "Escanear" });
    const btnCarrito = page.getByRole("button", { name: "Carrito" });

    const colorActivoInicial = await btnEscanear.evaluate((el) => getComputedStyle(el).color);
    const colorInactivoInicial = await btnCarrito.evaluate((el) => getComputedStyle(el).color);
    check("ítem activo ('Escanear') es coral", colorActivoInicial === rgb(ACCENT), colorActivoInicial);
    check(
      "ítem inactivo ('Carrito') es blanco semitransparente",
      colorInactivoInicial === "rgba(255, 255, 255, 0.55)",
      colorInactivoInicial
    );

    await btnCarrito.click();
    await page.getByText("Venta en curso").waitFor({ state: "visible", timeout: 5000 });
    const colorCarritoActivo = await btnCarrito.evaluate((el) => getComputedStyle(el).color);
    const colorEscanearInactivo = await btnEscanear.evaluate((el) => getComputedStyle(el).color);
    check("al navegar, 'Carrito' pasa a coral (activo)", colorCarritoActivo === rgb(ACCENT), colorCarritoActivo);
    check(
      "'Escanear' pasa a blanco semitransparente (inactivo)",
      colorEscanearInactivo === "rgba(255, 255, 255, 0.55)",
      colorEscanearInactivo
    );
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
