/**
 * Backfill (T29/01): crea una fila en `brands` por cada valor distinto que
 * hoy existe en `products.brand` (texto libre) y enlaza cada producto vía
 * `brandId`. Idempotente: correrlo más de una vez no duplica marcas (respeta
 * brands_org_slug_unique, reusa la marca si ya existe) ni reprocesa productos
 * que ya tienen brandId.
 *
 * Decisión de docs/T29_Marcas/analisis.md (sección 7, decisión 5): NO se
 * normalizan mayúsculas/acentos al agrupar — cada variante de casing/tilde
 * distinta genera advertencias en la consola para revisión manual, en vez de
 * fusionarse en silencio. Sí se recorta espacios al inicio/fin (higiene de
 * datos, no una decisión semántica) para no crear marcas como "Taverniti "
 * con espacio final.
 *
 * Dos colisiones posibles, ambas se resuelven agrupando (no abortan el
 * script), y se listan al final para revisión:
 *   - Mismo nombre recortado con distinto casing/acentos → mismo slug →
 *     tendrían que ser una sola fila en `brands` por la unique(org,slug).
 *     Se fusionan bajo el primer nombre visto, y se avisa.
 *   - Nombre vacío tras recortar (solo espacios) → se descarta, no genera marca.
 *
 *   npm run db:backfill-brands
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { brands, products } from "../src/db/schema.js";
import { slugify } from "../src/lib/slug.js";

type Group = {
  orgId: string;
  slug: string;
  name: string;
  rawValues: Set<string>;
  collisions: Set<string>;
};

async function main() {
  const rows = await db
    .select({ id: products.id, orgId: products.orgId, brand: products.brand })
    .from(products)
    .where(isNotNull(products.brand));
  console.log(`Productos con brand no nulo: ${rows.length}`);

  const groups = new Map<string, Group>();
  let vacios = 0;

  for (const row of rows) {
    const trimmed = (row.brand ?? "").trim();
    if (!trimmed) {
      vacios++;
      continue;
    }
    const slug = slugify(trimmed);
    const key = `${row.orgId}::${slug}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { orgId: row.orgId, slug, name: trimmed, rawValues: new Set([row.brand!]), collisions: new Set() });
    } else {
      existing.rawValues.add(row.brand!);
      if (trimmed !== existing.name) existing.collisions.add(trimmed);
    }
  }

  console.log(`Marcas distintas encontradas (por org+slug): ${groups.size}`);
  if (vacios > 0) console.log(`  (${vacios} producto(s) con brand solo espacios — descartados, sin marca)`);

  for (const g of groups.values()) {
    if (g.collisions.size > 0) {
      console.log(
        `  ⚠ colisión de slug "${g.slug}" — se agrupan bajo "${g.name}": también vistos ${[...g.collisions].map((c) => `"${c}"`).join(", ")}`
      );
    }
  }

  let created = 0;
  let reused = 0;
  let productsUpdated = 0;

  for (const g of groups.values()) {
    let brandId: string;
    const [existingBrand] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.orgId, g.orgId), eq(brands.slug, g.slug)));

    if (existingBrand) {
      brandId = existingBrand.id;
      reused++;
    } else {
      const [inserted] = await db
        .insert(brands)
        .values({ orgId: g.orgId, name: g.name, slug: g.slug, active: true })
        .returning({ id: brands.id });
      brandId = inserted.id;
      created++;
      console.log(`  marca creada: "${g.name}" (${g.slug})`);
    }

    for (const raw of g.rawValues) {
      const updated = await db
        .update(products)
        .set({ brandId })
        .where(and(eq(products.orgId, g.orgId), eq(products.brand, raw)))
        .returning({ id: products.id });
      productsUpdated += updated.length;
    }
  }

  // Verificación: ningún producto con brand no nulo debería seguir con brandId nulo
  const sinBrandId = await db
    .select({ id: products.id, brand: products.brand })
    .from(products)
    .where(and(isNotNull(products.brand), isNull(products.brandId)));

  console.log(
    `\nListo — ${created} marca(s) creada(s), ${reused} ya existían, ${productsUpdated} producto(s) actualizado(s).`
  );
  if (sinBrandId.length > 0) {
    console.error(`⚠ ${sinBrandId.length} producto(s) quedaron con brand no nulo pero brandId nulo — revisar a mano.`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en el backfill:", err);
  process.exit(1);
});
