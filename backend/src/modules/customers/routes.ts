import { asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../../db/client.js";
import { customers } from "../../db/schema.js";
import { requireOrgId } from "../../lib/tenant.js";

const tag = { tags: ["clientes (admin)"], security: [{ bearerAuth: [] }] };

// Versión mínima para T7 (selector de cliente en el alta manual de pedidos).
// T8 extiende este módulo con historial de compras y detalle.

export async function customersRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/customers",
    { ...auth, schema: { ...tag, summary: "Listar clientes de la organización" } },
    async (request) => {
      const orgId = requireOrgId(request);
      return db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.orgId, orgId))
        .orderBy(asc(customers.name));
    }
  );
}
