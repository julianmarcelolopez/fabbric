import { and, eq, max } from "drizzle-orm";
import { db } from "../../db/client.js";
import { homeSections } from "../../db/schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Crea la home_section de una categoría o colección si todavía no existe
 * (idempotente) — usada al crear una categoría (T19/06) o colección (T21/07)
 * nueva, y por scripts de backfill para las que ya existían antes de cada
 * cambio. Nunca duplica (respeta home_sections_org_ref_unique).
 */
async function ensureHomeSection(
  tx: Tx,
  orgId: string,
  refType: "category" | "collection",
  refId: string
) {
  const [existing] = await tx
    .select({ id: homeSections.id })
    .from(homeSections)
    .where(and(eq(homeSections.orgId, orgId), eq(homeSections.refType, refType), eq(homeSections.refId, refId)));
  if (existing) return existing;

  const [{ maxOrder }] = await tx
    .select({ maxOrder: max(homeSections.sortOrder) })
    .from(homeSections)
    .where(eq(homeSections.orgId, orgId));

  const [row] = await tx
    .insert(homeSections)
    .values({ orgId, refType, refId, sortOrder: (maxOrder ?? -1) + 1 })
    .returning();
  return row;
}

export async function ensureCategoryHomeSection(tx: Tx, orgId: string, categoryId: string) {
  return ensureHomeSection(tx, orgId, "category", categoryId);
}

/** T21/07 — mismo patrón que ensureCategoryHomeSection, para colecciones. */
export async function ensureCollectionHomeSection(tx: Tx, orgId: string, collectionId: string) {
  return ensureHomeSection(tx, orgId, "collection", collectionId);
}
