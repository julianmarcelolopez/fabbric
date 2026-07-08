import type { AdminRole } from "@fabbric/shared";
import { eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { adminUsers } from "../db/schema.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export type AdminPrincipal = {
  id: string;
  orgId: string | null;
  email: string;
  role: AdminRole;
};

declare module "fastify" {
  interface FastifyRequest {
    adminUser: AdminPrincipal | null;
  }
  interface FastifyInstance {
    requireAdminAuth: (request: FastifyRequest) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest) => Promise<void>;
  }
}

// El set de claves se crea una sola vez; jose cachea las claves y las
// refresca solo cuando aparece un kid desconocido.
const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

async function resolveAdmin(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token Bearer");
  }
  const token = header.slice("Bearer ".length);

  let sub: string;
  try {
    // issuer + audience: un token firmado por OTRO proyecto Supabase no debe pasar
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });
    if (!payload.sub) throw new Error("token sin sub");
    sub = payload.sub;
  } catch {
    throw new UnauthorizedError("Token inválido o vencido");
  }

  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, sub)).limit(1);
  if (!row) {
    // Autenticado en Supabase pero sin fila en admin_users: no es admin
    throw new ForbiddenError("El usuario no tiene acceso de administrador");
  }

  request.adminUser = { id: row.id, orgId: row.orgId, email: row.email, role: row.role };
}

export default fp(async (app) => {
  app.decorateRequest("adminUser", null);

  app.decorate("requireAdminAuth", async (request: FastifyRequest) => {
    await resolveAdmin(request);
  });

  app.decorate("requireSuperAdmin", async (request: FastifyRequest) => {
    await resolveAdmin(request);
    if (request.adminUser!.role !== "super_admin") {
      throw new ForbiddenError("Requiere rol super_admin");
    }
  });
});
