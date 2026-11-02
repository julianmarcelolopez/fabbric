import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { catalogConfigs, organizations } from "../db/schema.js";

// T38 — CORS dinámico necesita saber, en cada preflight, si un origin es un
// dominio propio registrado. Consultar la DB en cada request sería
// desperdiciar una query por preflight — se cachea en memoria con un TTL
// corto (no hace falta invalidación activa al guardar un dominio nuevo, 60s
// de delay es aceptable para este caso de uso).
const TTL_MS = 60_000;
let cache: Set<string> | null = null;
let cacheExpiresAt = 0;

async function loadActiveCustomDomains(): Promise<Set<string>> {
  const rows = await db
    .select({ customDomain: catalogConfigs.customDomain })
    .from(catalogConfigs)
    .innerJoin(organizations, eq(catalogConfigs.orgId, organizations.id))
    .where(
      and(isNotNull(catalogConfigs.customDomain), eq(catalogConfigs.active, true), eq(organizations.active, true))
    );
  return new Set(rows.map((r) => r.customDomain!));
}

/** host ya normalizado (sin "www.", minúsculas) — ver resolveStoreByDomain */
export async function isRegisteredCustomDomain(host: string): Promise<boolean> {
  const normalized = host.trim().toLowerCase().replace(/^www\./, "");
  const now = Date.now();
  if (!cache || now > cacheExpiresAt) {
    cache = await loadActiveCustomDomains();
    cacheExpiresAt = now + TTL_MS;
  }
  return cache.has(normalized);
}
