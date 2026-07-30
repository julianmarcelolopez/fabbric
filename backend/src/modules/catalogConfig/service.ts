import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { catalogConfigs, organizations } from "../../db/schema.js";
import { decrypt } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";

/**
 * Resuelve una tienda pública por su slug. Tienda inexistente, apagada o de
 * org inactiva → 404 indistinguible. Lo usan los endpoints públicos, el portal
 * del comprador y el checkout.
 */
export async function resolveStoreBySlug(slug: string) {
  const [row] = await db
    .select({ config: catalogConfigs, orgActive: organizations.active })
    .from(catalogConfigs)
    .innerJoin(organizations, eq(catalogConfigs.orgId, organizations.id))
    .where(eq(catalogConfigs.slug, slug));
  if (!row || !row.config.active || !row.orgActive) {
    throw new AppError(404, "not_found", "Tienda no encontrada");
  }
  return row.config;
}

/** Devuelve la config de la org, creándola con defaults si no existe (lazy). */
export async function ensureConfig(orgId: string) {
  const [existing] = await db.select().from(catalogConfigs).where(eq(catalogConfigs.orgId, orgId));
  if (existing) return existing;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) throw new AppError(404, "not_found", "Organización no encontrada");
  try {
    const [created] = await db
      .insert(catalogConfigs)
      .values({ orgId, slug: org.slug, storeName: org.name })
      .returning();
    return created;
  } catch {
    // slug de tienda es único GLOBAL: si otra org ya lo usa, degradar con sufijo
    const [created] = await db
      .insert(catalogConfigs)
      .values({ orgId, slug: `${org.slug}-${orgId.slice(0, 6)}`, storeName: org.name })
      .returning();
    return created;
  }
}

function maskSecret(encrypted: string | null): string | null {
  if (!encrypted) return null;
  return `····${decrypt(encrypted).slice(-4)}`;
}

/**
 * Enmascara mpAccessToken/mpWebhookSecret antes de mandar la config al admin —
 * NUNCA devolver la fila cruda de `ensureConfig` en una respuesta HTTP (T16).
 * Usar en los 5 puntos que responden la config: GET, PATCH general, upload de
 * logo, upload de banner, y el PATCH de integración de MP.
 */
export function toAdminConfig<T extends { mpAccessToken: string | null; mpWebhookSecret: string | null }>(
  config: T
): T {
  return {
    ...config,
    mpAccessToken: maskSecret(config.mpAccessToken),
    mpWebhookSecret: maskSecret(config.mpWebhookSecret),
  };
}
