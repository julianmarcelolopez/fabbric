import { and, eq, max } from "drizzle-orm";
import { db } from "../../db/client.js";
import { homeSections } from "../../db/schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Crea la home_section de una categoría si todavía no existe (idempotente) —
 * usado al crear una categoría nueva (T19/06) y por el script de backfill para
 * las que ya existían antes de este cambio. Nunca duplica (respeta
 * home_sections_org_ref_unique).
 */
export async function ensureCategoryHomeSection(tx: Tx, orgId: string, categoryId: string) {
  const [existing] = await tx
    .select({ id: homeSections.id })
    .from(homeSections)
    .where(
      and(
        eq(homeSections.orgId, orgId),
        eq(homeSections.refType, "category"),
        eq(homeSections.refId, categoryId)
      )
    );
  if (existing) return existing;

  const [{ maxOrder }] = await tx
    .select({ maxOrder: max(homeSections.sortOrder) })
    .from(homeSections)
    .where(eq(homeSections.orgId, orgId));

  const [row] = await tx
    .insert(homeSections)
    .values({ orgId, refType: "category", refId: categoryId, sortOrder: (maxOrder ?? -1) + 1 })
    .returning();
  return row;
}
