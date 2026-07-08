import type { FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "./errors.js";

/**
 * Regla del proyecto: ningún query de negocio sin WHERE org_id.
 * Todo handler de rutas /admin/* obtiene su orgId por acá — nunca del body/params.
 * Para super_admin (orgId null) operar sobre un tenant requiere pasarlo explícito
 * por las rutas /superadmin/*, no por las rutas de admin comunes.
 */
export function requireOrgId(request: FastifyRequest): string {
  const admin = request.adminUser;
  if (!admin) {
    throw new UnauthorizedError();
  }
  if (admin.orgId === null) {
    throw new ForbiddenError(
      "super_admin no opera sobre rutas de tenant — usar las rutas /superadmin/*"
    );
  }
  return admin.orgId;
}
