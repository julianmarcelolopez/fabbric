// T25/01 — verifica PATCH /admin/catalog-config/afip-integration: guarda
// cuit/puntoVenta/ambiente en texto plano, cifra certificado/clave/token en
// reposo, los devuelve enmascarados, y confirma que el PATCH general
// (/admin/catalog-config) no puede tocar estos campos. Crea una org
// descartable y la borra al final — no toca la org real de Eliathi.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const API = "http://localhost:4000";
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

async function makeAdminOrg() {
  const slug = `t25-01-${STAMP}`;
  const email = `julianmarcelolopez+t2501${STAMP}@gmail.com`;
  const password = "T2501temp!pass-9Rk3";

  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const [org] = await sql`insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  await sql`insert into admin_users (id, org_id, email, role) values (${created.user.id}, ${org.id}, ${email}, 'owner')`;
  await sql`insert into catalog_configs (org_id, slug, store_name) values (${org.id}, ${slug}, ${slug})`;

  const { data: signIn, error: signInErr } = await supa.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { orgId: org.id, userId: created.user.id, token: signIn.session.access_token };
}

async function patch(path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await res.json().catch(() => null);
  return { status: res.status, body: responseBody };
}

async function cleanup(orgIds, userIds) {
  await sql`delete from catalog_configs where org_id = any(${orgIds})`;
  await sql`delete from admin_users where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
  for (const id of userIds) {
    await supa.auth.admin.deleteUser(id).catch(() => {});
  }
}

async function main() {
  console.log("T25/01 — PATCH /admin/catalog-config/afip-integration\n");

  const a = await makeAdminOrg();

  try {
    const CERT = "-----BEGIN CERTIFICATE-----\nFAKE-CERT-CONTENT\n-----END CERTIFICATE-----";
    const KEY = "-----BEGIN PRIVATE KEY-----\nFAKE-KEY-CONTENT\n-----END PRIVATE KEY-----";
    const TOKEN = "fake-access-token-abc123";

    const r1 = await patch("/admin/catalog-config/afip-integration", a.token, {
      afipCuit: "20111111112",
      afipPuntoVenta: 3,
      afipAmbiente: "homologacion",
      afipCertificado: CERT,
      afipClavePrivada: KEY,
      afipAccessToken: TOKEN,
    });
    check("PATCH afip-integration → 200", r1.status === 200, JSON.stringify(r1.body));
    check("cuit/puntoVenta/ambiente vuelven en texto plano", r1.body?.afipCuit === "20111111112" && r1.body?.afipPuntoVenta === 3 && r1.body?.afipAmbiente === "homologacion");
    check("afipCertificado viene enmascarado (no el valor real)", r1.body?.afipCertificado && r1.body.afipCertificado !== CERT && r1.body.afipCertificado.startsWith("····"));
    check("afipClavePrivada viene enmascarado", r1.body?.afipClavePrivada && r1.body.afipClavePrivada !== KEY);
    check("afipAccessToken viene enmascarado", r1.body?.afipAccessToken && r1.body.afipAccessToken !== TOKEN);

    // Cifrado real en la base (no texto plano)
    const [row] = await sql`select afip_certificado, afip_clave_privada, afip_access_token from catalog_configs where org_id = ${a.orgId}`;
    check("afip_certificado NO está en texto plano en la base", row.afip_certificado !== CERT && row.afip_certificado.length > 0);
    check("afip_clave_privada NO está en texto plano en la base", row.afip_clave_privada !== KEY && row.afip_clave_privada.length > 0);
    check("afip_access_token NO está en texto plano en la base", row.afip_access_token !== TOKEN && row.afip_access_token.length > 0);

    // El PATCH general no puede tocar estos campos aunque se le manden
    const r2 = await patch("/admin/catalog-config", a.token, { storeName: "Nombre cambiado", afipCuit: "99999999999" });
    check("PATCH general → 200", r2.status === 200, JSON.stringify(r2.body));
    check("PATCH general no tocó afipCuit (sigue 20111111112)", r2.body?.afipCuit === "20111111112", JSON.stringify(r2.body?.afipCuit));

    // Sin token → 401 (mismo comportamiento ya existente en mp-integration: la
    // validación del body corre antes que el auth preHandler, así que hace
    // falta un body válido para aislar el caso de "sin token")
    const r3 = await fetch(`${API}/admin/catalog-config/afip-integration`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        afipCuit: "20111111112",
        afipPuntoVenta: 3,
        afipAmbiente: "homologacion",
        afipCertificado: CERT,
        afipClavePrivada: KEY,
        afipAccessToken: TOKEN,
      }),
    });
    check("sin token → 401", r3.status === 401, `status=${r3.status}`);
  } finally {
    await cleanup([a.orgId], [a.userId]);
    const [leftover] = await sql`select count(*)::int as n from organizations where id = ${a.orgId}`;
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
