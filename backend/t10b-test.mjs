// Suite T10 tarea 2 — overview: escenario conocido en org temporal, cada número a mano.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const {
  DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY,
  VITE_SUPABASE_ANON_KEY: ANON_KEY,
  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD,
  SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD,
} = process.env;

const TEMP_ORG_SLUG = "t10-temp-metrics";
const TEMP_ADMIN_EMAIL = "julianmarcelolopez+t10temp@gmail.com";
const TEMP_ADMIN_PASSWORD = "T10temp!pass-5Wn4";

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function check(name, ok, extra = "") {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login ${email}: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

async function cleanup() {
  const [org] = await sql`select id from organizations where slug = ${TEMP_ORG_SLUG}`;
  if (org) {
    await sql`delete from financial_movements where org_id = ${org.id}`;
    await sql`delete from wallets where org_id = ${org.id}`;
    await sql`delete from orders where org_id = ${org.id}`;
    const admins = await sql`select id from admin_users where org_id = ${org.id}`;
    await sql`delete from admin_users where org_id = ${org.id}`;
    for (const a of admins) await supa.auth.admin.deleteUser(a.id).catch(() => {});
    await sql`delete from organizations where id = ${org.id}`;
  }
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_ADMIN_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

try {
  console.log("— Pre-cleanup —");
  await cleanup();

  console.log("\n1) Escenario conocido en org temporal");
  const superT = await login(SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD);
  const org = await api("POST", "/superadmin/organizations", superT, { name: "T10 Metrics", slug: TEMP_ORG_SLUG });
  await api("POST", `/superadmin/organizations/${org.body.id}/admins`, superT, {
    email: TEMP_ADMIN_EMAIL, password: TEMP_ADMIN_PASSWORD, role: "staff",
  });
  const t = await login(TEMP_ADMIN_EMAIL, TEMP_ADMIN_PASSWORD);

  const wallet = await api("POST", "/admin/wallets", t, { name: "Caja", initialBalance: 50000 });
  // A: cobrado — 2 × ($100 precio, $40 costo) = total 20000c, bruta 12000c
  const orderA = await api("POST", "/admin/orders", t, { items: [{ name: "T10 bordado", qty: 2, unitPrice: 10000, unitCost: 4000 }] });
  await api("POST", `/admin/orders/${orderA.body.id}/mark-paid`, t, { walletId: wallet.body.id });
  // B: queda pending (deuda) — 5000c
  const orderB = await api("POST", "/admin/orders", t, { items: [{ name: "T10 gorra", qty: 1, unitPrice: 5000 }] });
  // C: cancelado (no cuenta como pedido del mes)
  const orderC = await api("POST", "/admin/orders", t, { items: [{ name: "T10 parche", qty: 1, unitPrice: 1000 }] });
  await api("PATCH", `/admin/orders/${orderC.body.id}/status`, t, { status: "cancelled" });
  // Movimientos manuales: ingreso suelto 7000c (no vinculado) + egreso 3000c
  await api("POST", "/admin/finance/movements", t, { walletId: wallet.body.id, type: "income", amount: 7000, category: "Otro ingreso" });
  await api("POST", "/admin/finance/movements", t, { walletId: wallet.body.id, type: "expense", amount: 3000, category: "Insumos" });
  check("escenario montado", orderA.status === 201 && orderB.status === 201 && orderC.status === 201);

  console.log("\n2) Stats del mes — cada número a mano");
  const ov = await api("GET", "/admin/metrics/overview", t);
  check("responde 200", ov.status === 200, JSON.stringify(ov.body).slice(0, 200));
  const s = ov.body.stats;
  check("pedidosMes = 2 (A y B; el cancelado no)", s.pedidosMes === 2, `= ${s.pedidosMes}`);
  check("ingresos = 27000 (cobro 20000 + suelto 7000)", s.ingresos === 27000, `= ${s.ingresos}`);
  check("egresos = 3000", s.egresos === 3000, `= ${s.egresos}`);
  check("balance = 24000", s.balance === 24000, `= ${s.balance}`);
  check("gananciaBruta = 12000 = 2 × (10000 − 4000)", s.gananciaBruta === 12000, `= ${s.gananciaBruta}`);
  check("gananciaNeta = 9000 (bruta − egresos)", s.gananciaNeta === 9000, `= ${s.gananciaNeta}`);
  check("clientesNuevos = 0 (los de la demo NO se filtran acá)", s.clientesNuevos === 0, `= ${s.clientesNuevos}`);
  check("porCobrar = 5000 (solo B)", s.porCobrar === 5000, `= ${s.porCobrar}`);
  check("ticketPromedio = 20000 (un pedido cobrado; el ingreso suelto no cuenta)", s.ticketPromedio === 20000, `= ${s.ticketPromedio}`);

  console.log("\n3) Coherencia con el summary de T9 (misma fuente)");
  const fin = await api("GET", "/admin/finance/summary", t);
  check("overview ≡ finance/summary", ["ingresos", "egresos", "balance", "gananciaBruta", "gananciaNeta"]
    .every((k) => s[k] === fin.body[k]), JSON.stringify(fin.body));

  console.log("\n4) Paneles");
  const p = ov.body.paneles;
  check("ultimosPedidos: los 3 de la org (incluido el cancelado), más reciente primero",
    p.ultimosPedidos.length === 3 && p.ultimosPedidos[0].id === orderC.body.id,
    JSON.stringify(p.ultimosPedidos.map((o) => o.orderNumber)));
  check("masVendidos: solo el bordado cobrado (qty 2, importe 20000)",
    p.masVendidos.length === 1 && p.masVendidos[0].name === "T10 bordado" &&
    p.masVendidos[0].qty === 2 && p.masVendidos[0].importe === 20000, JSON.stringify(p.masVendidos));
  check("catálogo vs personalizado: todo personalizado (qty 2, 20000)",
    p.catalogoVsPersonalizado.catalogo.qty === 0 && p.catalogoVsPersonalizado.personalizado.qty === 2 &&
    p.catalogoVsPersonalizado.personalizado.importe === 20000, JSON.stringify(p.catalogoVsPersonalizado));
  check("ventas por canal: bespoke → sinCanal (qty 2), online/local en cero",
    p.ventasPorCanal.sinCanal.qty === 2 && p.ventasPorCanal.online.qty === 0 && p.ventasPorCanal.local.qty === 0,
    JSON.stringify(p.ventasPorCanal));
  const chart = p.ingresosEgresosMensual;
  const last = chart[chart.length - 1];
  check("gráfico: 6 meses, el último con 27000/3000 y los previos en cero",
    chart.length === 6 && last.ingresos === 27000 && last.egresos === 3000 &&
    chart.slice(0, 5).every((m) => m.ingresos === 0 && m.egresos === 0), JSON.stringify(chart));

  console.log("\n5) Mes viejo: métricas mensuales en cero, las globales quedan");
  const old = await api("GET", "/admin/metrics/overview?year=2020&month=1", t);
  const so = old.body.stats;
  check("mensuales en cero", so.pedidosMes === 0 && so.ingresos === 0 && so.gananciaBruta === 0 && so.ticketPromedio === 0);
  check("porCobrar sigue (global, deuda viva)", so.porCobrar === 5000, `= ${so.porCobrar}`);
  check("ultimosPedidos sigue (global)", old.body.paneles.ultimosPedidos.length === 3);
  check("masVendidos del mes viejo vacío", old.body.paneles.masVendidos.length === 0);

  console.log("\n6) La org demo no se mezcla (y su overview responde)");
  const owner = await login(SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
  const demoOv = await api("GET", "/admin/metrics/overview", owner);
  check("overview de la demo → 200 y SUS últimos pedidos (ninguno de los T10)",
    demoOv.status === 200 &&
    demoOv.body.paneles.ultimosPedidos.every((o) => ![orderA.body.id, orderB.body.id, orderC.body.id].includes(o.id)));

  console.log("\n7) Swagger");
  const docs = await fetch(`${API}/docs/json`).then((r) => r.json());
  check("GET /admin/metrics/overview documentado", !!docs.paths?.["/admin/metrics/overview"]?.get);

  console.log("\n— Cleanup final —");
  await cleanup();
  const [{ count: leftovers }] = await sql`
    select count(*)::int as count from organizations where slug = ${TEMP_ORG_SLUG}`;
  check("sin residuos en DB", leftovers === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try { await cleanup(); } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
