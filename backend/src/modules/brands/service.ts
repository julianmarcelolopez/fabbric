import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { brands } from "../../db/schema.js";
import { slugify } from "../../lib/slug.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
// A diferencia de homeSections/service.ts (siempre se llama dentro de una
// transacción), resolveBrandId se usa tanto suelto (crear/editar producto)
// como dentro de una transacción (alta-rápida) — acepta ambos.
type DbOrTx = typeof db | Tx;

/**
 * Resuelve el brandId final a partir de lo que manda el formulario (T29):
 * - `newBrandName` presente → crea la marca si no existe una con ese slug en
 *   la org (alta inline), o reusa la existente. Gana sobre `brandId` si los
 *   dos vienen juntos (no debería pasar desde un combo bien hecho, pero
 *   evita ambigüedad silenciosa).
 * - si no, devuelve `brandId` tal cual (puede ser null, para "sin marca").
 */
export async function resolveBrandId(
  tx: DbOrTx,
  orgId: string,
  input: { brandId?: string | null; newBrandName?: string }
): Promise<string | null> {
  if (input.newBrandName) {
    const slug = slugify(input.newBrandName);
    const [existing] = await tx
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.orgId, orgId), eq(brands.slug, slug)));
    if (existing) return existing.id;

    const [created] = await tx
      .insert(brands)
      .values({ orgId, name: input.newBrandName, slug, active: true })
      .returning({ id: brands.id });
    return created.id;
  }
  return input.brandId ?? null;
}
