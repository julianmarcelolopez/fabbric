import type { AdminRole } from "@fabbric/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { adminUsers, customers } from "../db/schema.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { resolveStoreBySlug } from "../modules/catalogConfig/service.js";

export type AdminPrincipal = {
  id: string;
  orgId: string | null;
  email: string;
  role: AdminRole;
};

export type CustomerPrincipal = {
  id: string;
  orgId: string;
  googleSub: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    adminUser: AdminPrincipal | null;
    customer: CustomerPrincipal | null;
  }
  interface FastifyInstance {
    requireAdminAuth: (request: FastifyRequest) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest) => Promise<void>;
    requireCustomerAuth: (request: FastifyRequest) => Promise<void>;
  }
}

// El set de claves se crea una sola vez; jose cachea las claves y las
// refresca solo cuando aparece un kid desconocido.
const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

type TokenIdentity = { sub: string; email: string | null; name: string | null };

async function verifyToken(request: FastifyRequest): Promise<TokenIdentity> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token Bearer");
  }
  const token = header.slice("Bearer ".length);
  try {
    // issuer + audience: un token firmado por OTRO proyecto Supabase no debe pasar
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });
    if (!payload.sub) throw new Error("token sin sub");
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      name:
        typeof meta.full_name === "string"
          ? meta.full_name
          : typeof meta.name === "string"
            ? meta.name
            : null,
    };
  } catch {
    throw new UnauthorizedError("Token inválido o vencido");
  }
}

async function resolveAdmin(request: FastifyRequest): Promise<void> {
  const { sub } = await verifyToken(request);
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, sub)).limit(1);
  if (!row) {
    // Autenticado en Supabase pero sin fila en admin_users: no es admin
    throw new ForbiddenError("El usuario no tiene acceso de administrador");
  }
  request.adminUser = { id: row.id, orgId: row.orgId, email: row.email, role: row.role };
}

/**
 * Principal COMPRADOR: mismo JWT de Supabase, resuelto contra `customers` con
 * upsert por tienda — el mismo Google account es un customer distinto en cada
 * tienda (unique(orgId, googleSub)). Admin y customer son tablas separadas:
 * un token puede resolver en ambas según el grupo de rutas, sin heredar permisos.
 * Requiere que la ruta tenga `:slug` (la tienda) en los params.
 */
async function resolveCustomer(request: FastifyRequest): Promise<void> {
  const identity = await verifyToken(request);
  const slug = (request.params as { slug?: string }).slug;
  if (!slug) throw new UnauthorizedError("Ruta de portal sin tienda");
  const config = await resolveStoreBySlug(slug);

  let [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.orgId, config.orgId), eq(customers.googleSub, identity.sub)));
  if (!row) {
    const fallbackName = identity.name ?? identity.email?.split("@")[0] ?? "Cliente";
    try {
      [row] = await db
        .insert(customers)
        .values({
          orgId: config.orgId,
          googleSub: identity.sub,
          email: identity.email ?? "",
          name: fallbackName,
        })
        .returning();
    } catch {
      // Carrera con otro request del mismo usuario: la unique lo atajó — releer
      [row] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.orgId, config.orgId), eq(customers.googleSub, identity.sub)));
    }
  }
  if (!row) throw new UnauthorizedError("No se pudo resolver el cliente");
  request.customer = {
    id: row.id,
    orgId: row.orgId,
    googleSub: row.googleSub,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address: row.address,
  };
}

export default fp(async (app) => {
  app.decorateRequest("adminUser", null);
  app.decorateRequest("customer", null);

  app.decorate("requireAdminAuth", async (request: FastifyRequest) => {
    await resolveAdmin(request);
  });

  app.decorate("requireSuperAdmin", async (request: FastifyRequest) => {
    await resolveAdmin(request);
    if (request.adminUser!.role !== "super_admin") {
      throw new ForbiddenError("Requiere rol super_admin");
    }
  });

  app.decorate("requireCustomerAuth", async (request: FastifyRequest) => {
    await resolveCustomer(request);
  });
});
