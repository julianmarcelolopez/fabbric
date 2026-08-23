// T23/01 — verifica la migración 0019 (columna `barcode` en product_variants):
// nullable, única por organización (no global). Crea 2 orgs/categorías/productos
// temporales, prueba mismo barcode en distinta org (OK) y en la misma org (falla),
// y NULL/NULL en la misma org (OK, Postgres no choca NULLs). Borra todo al final.
import postgres from "postgres";

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

async function makeOrgWithProduct(slug) {
  const [org] = await sql`
    insert into organizations (name, slug) values (${slug}, ${slug}) returning id`;
  const [cat] = await sql`
    insert into categories (org_id, name, slug, sort_order) values (${org.id}, ${slug}, ${slug}, 0) returning id`;
  const [prod] = await sql`
    insert into products (org_id, category_id, name, price) values (${org.id}, ${cat.id}, ${slug}, 1000) returning id`;
  return { orgId: org.id, categoryId: cat.id, productId: prod.id };
}

async function cleanup(orgIds) {
  await sql`delete from product_variants where org_id = any(${orgIds})`;
  await sql`delete from products where org_id = any(${orgIds})`;
  await sql`delete from categories where org_id = any(${orgIds})`;
  await sql`delete from organizations where id = any(${orgIds})`;
}

async function main() {
  console.log("T23/01 — migración barcode\n");

  // Columna existe y es nullable
  const [col] = await sql`
    select is_nullable from information_schema.columns
    where table_name = 'product_variants' and column_name = 'barcode'`;
  check("columna barcode existe", !!col);
  check("columna barcode es nullable", col?.is_nullable === "YES");

  const a = await makeOrgWithProduct(`t23-01-org-a-${Date.now()}`);
  const b = await makeOrgWithProduct(`t23-01-org-b-${Date.now()}`);
  const orgIds = [a.orgId, b.orgId];

  try {
    // Mismo barcode, distinta org → debe funcionar
    await sql`
      insert into product_variants (product_id, org_id, talle, color, barcode)
      values (${a.productId}, ${a.orgId}, 'M', 'Negro', 'TEST-BARCODE-001')`;
    await sql`
      insert into product_variants (product_id, org_id, talle, color, barcode)
      values (${b.productId}, ${b.orgId}, 'M', 'Negro', 'TEST-BARCODE-001')`;
    check("mismo barcode en distinta organización: permitido", true);
  } catch (e) {
    check("mismo barcode en distinta organización: permitido", false, e.message);
  }

  try {
    // Mismo barcode, MISMA org (distinto talle/color para no chocar con la otra unique) → debe fallar
    await sql`
      insert into product_variants (product_id, org_id, talle, color, barcode)
      values (${a.productId}, ${a.orgId}, 'L', 'Azul', 'TEST-BARCODE-001')`;
    check("mismo barcode en la MISMA organización: rechazado", false, "insertó sin error");
  } catch (e) {
    check(
      "mismo barcode en la MISMA organización: rechazado",
      e.message.includes("product_variants_org_barcode_unique"),
      e.message
    );
  }

  try {
    // Dos variantes sin barcode (NULL) en la misma org → debe funcionar (NULL no choca)
    await sql`
      insert into product_variants (product_id, org_id, talle, color)
      values (${a.productId}, ${a.orgId}, 'S', 'Rojo')`;
    await sql`
      insert into product_variants (product_id, org_id, talle, color)
      values (${a.productId}, ${a.orgId}, 'S', 'Verde')`;
    check("dos variantes sin barcode (NULL) en la misma organización: permitido", true);
  } catch (e) {
    check("dos variantes sin barcode (NULL) en la misma organización: permitido", false, e.message);
  }

  await cleanup(orgIds);
  const [leftover] = await sql`select count(*)::int as n from organizations where id = any(${orgIds})`;
  check("datos de prueba limpiados", leftover.n === 0);

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  await sql.end();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
