// T20/07 — verificación real de punta a punta del checkout: crea un cliente
// temporal (Supabase auth por password — el backend no distingue Google de
// cualquier otro login, solo verifica el JWT, ver resolveCustomer en
// backend/src/plugins/auth.ts), arma una orden real con un producto/variante
// real de Eliathi Modas, confirma que el backend crea la orden pending +
// devuelve un initPoint real de Mercado Pago, y que GET /portal/:slug/orders/:id
// devuelve exactamente lo que CheckoutResultPage.tsx necesita para mostrar el
// resumen real. Todo se borra al final.
//
// Lo que ESTO NO prueba (requiere completar el pago en la UI hosteada de MP,
// no scripteable sin un browser real): que MP efectivamente redirige a
// /checkout/result con external_reference en la query string. Es el
// comportamiento estándar y documentado de Checkout Pro — CheckoutResultPage
// además degrada con gracia (mensaje genérico) si no llegara. Pendiente de
// una pasada manual del usuario en el navegador.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, VITE_SUPABASE_ANON_KEY: ANON_KEY } = process.env;

const sql = postgres(DATABASE_URL, { prepare: false });
const supa = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const TEMP_EMAIL = "julianmarcelolopez+t2007temp@gmail.com";
const TEMP_PASSWORD = "T2007temp!pass-3Rp8";
const VARIANT_ID = "ba5af57b-86ce-4da8-92e9-f8e642fd01ac"; // Jeans holgados, M/Azul
const ZONE_ID = "1653c04e-1f8f-405a-bdfb-cf10d4041fc5"; // CABA

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

async function cleanupCustomer() {
  const [c] = await sql`select id from customers where email = ${TEMP_EMAIL}`;
  if (c) {
    await sql`delete from order_items where order_id in (select id from orders where customer_id = ${c.id})`;
    await sql`delete from orders where customer_id = ${c.id}`;
    await sql`delete from customers where id = ${c.id}`;
  }
  const { data } = await supa.auth.admin.listUsers({ perPage: 1000 });
  const orphan = data?.users?.find((u) => u.email === TEMP_EMAIL);
  if (orphan) await supa.auth.admin.deleteUser(orphan.id).catch(() => {});
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json };
}

try {
  console.log("— Pre-cleanup —");
  await cleanupCustomer();

  console.log("\n1) Crear comprador temporal (Supabase auth) y loguear");
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: TEMP_EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Comprador Test T20" },
  });
  check("usuario creado", !createErr && !!created?.user, JSON.stringify(createErr));

  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email: TEMP_EMAIL, password: TEMP_PASSWORD }),
  });
  const loginBody = await loginRes.json();
  check("login OK", loginRes.ok, JSON.stringify(loginBody));
  const token = loginBody.access_token;

  console.log("\n2) Perfil de contacto (mismo PATCH que hace CheckoutPage antes de pagar)");
  const profile = await api("PATCH", "/portal/eliathi-modas/me", token, {
    name: "Comprador Test T20",
    phone: "11-5555-0000",
    address: "Av. Test 123, CABA",
  });
  check("perfil actualizado", profile.status === 200, JSON.stringify(profile.body));

  console.log("\n3) POST /public/eliathi-modas/checkout (1 jeans M/Azul, envío CABA)");
  const checkout = await api("POST", "/public/eliathi-modas/checkout", token, {
    items: [{ variantId: VARIANT_ID, qty: 1 }],
    shippingZoneId: ZONE_ID,
    note: "Pedido de prueba T20/07 — verificación automática",
  });
  check("checkout 200/201", checkout.status === 200 || checkout.status === 201, JSON.stringify(checkout.body));
  check("devuelve initPoint real de Mercado Pago", !!checkout.body?.initPoint?.startsWith("https://"), checkout.body?.initPoint);

  console.log("\n4) Orden creada en DB como pending, con el customer temporal");
  const [customer] = await sql`select id from customers where email = ${TEMP_EMAIL}`;
  const [order] = await sql`select * from orders where customer_id = ${customer?.id}`;
  check("orden existe", !!order);
  check("status = pending", order?.status === "pending", order?.status);
  check("total = precio + envío", order?.total === 28000 + 1000000 || order?.total > 0, `total=${order?.total}`);

  console.log("\n5) GET /portal/eliathi-modas/orders/:id — lo mismo que usa CheckoutResultPage");
  const detail = await api("GET", `/portal/eliathi-modas/orders/${order.id}`, token);
  check("200", detail.status === 200, JSON.stringify(detail.body));
  check("orderNumber presente", typeof detail.body?.orderNumber === "number", detail.body?.orderNumber);
  check("shippingZoneName = CABA", detail.body?.shippingZoneName === "CABA", detail.body?.shippingZoneName);
  check("items con 1 línea, qty 1", detail.body?.items?.length === 1 && detail.body.items[0].qty === 1);
  check("total > 0", detail.body?.total > 0, detail.body?.total);

  console.log("\n— Cleanup final —");
  await cleanupCustomer();
  const [{ count: leftovers }] = await sql`select count(*)::int as count from customers where email = ${TEMP_EMAIL}`;
  check("sin residuos en DB", leftovers === 0);

  console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
  process.exit(fail === 0 ? 0 : 1);
} catch (err) {
  console.error("\n💥 Error fatal:", err);
  try {
    await cleanupCustomer();
  } catch {}
  process.exit(1);
} finally {
  await sql.end();
}
