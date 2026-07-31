/**
 * Backfill (T19/06): crea la home_section de cada categoría que todavía no tenga
 * una — para las orgs que ya tenían categorías antes de este cambio (ej. Eliathi
 * Modas). Idempotente: usa la misma función que el alta de categoría nueva, así
 * que correrlo más de una vez no duplica nada (respeta home_sections_org_ref_unique).
 *
 *   npm run db:backfill-home-sections
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { categories, homeSections } from "../src/db/schema.js";
import { ensureCategoryHomeSection } from "../src/modules/homeSections/service.js";

async function main() {
  const allCategories = await db
    .select({ id: categories.id, orgId: categories.orgId, name: categories.name })
    .from(categories);
  console.log(`Categorías encontradas: ${allCategories.length}`);

  let created = 0;
  let skipped = 0;
  for (const cat of allCategories) {
    const [existing] = await db
      .select({ id: homeSections.id })
      .from(homeSections)
      .where(
        and(
          eq(homeSections.orgId, cat.orgId),
          eq(homeSections.refType, "category"),
          eq(homeSections.refId, cat.id)
        )
      );
    if (existing) {
      console.log(`  ya tenía sección: ${cat.name} (${cat.id})`);
      skipped++;
      continue;
    }
    await db.transaction((tx) => ensureCategoryHomeSection(tx, cat.orgId, cat.id));
    console.log(`  sección creada: ${cat.name} (${cat.id})`);
    created++;
  }

  console.log(`\nListo — ${created} sección(es) creada(s), ${skipped} ya existían.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en el backfill:", err);
  process.exit(1);
});
