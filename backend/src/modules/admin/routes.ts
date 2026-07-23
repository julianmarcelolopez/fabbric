import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { adminUsers, organizations } from "../../db/schema.js";

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    "/admin/me",
    {
      preHandler: app.requireAdminAuth,
      schema: {
        tags: ["admin"],
        summary: "Principal autenticado (id, email, role, orgId, orgName, dashboardLayout)",
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
      // Layout del dashboard (T10) — el Dashboard lo recibe sin llamada extra
      const [me] = await db
        .select({ dashboardLayout: adminUsers.dashboardLayout })
        .from(adminUsers)
        .where(eq(adminUsers.id, id));
      return { id, email, role, orgId, orgName, dashboardLayout: me?.dashboardLayout ?? null };
    }
  );
}
