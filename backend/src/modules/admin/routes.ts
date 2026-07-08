import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    "/admin/me",
    {
      preHandler: app.requireAdminAuth,
      schema: {
        tags: ["admin"],
        summary: "Principal autenticado (id, email, role, orgId, orgName)",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const { id, email, role, orgId } = request.adminUser!;
      let orgName: string | null = null;
      if (orgId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
        orgName = org?.name ?? null;
      }
      return { id, email, role, orgId, orgName };
    }
  );
}
