import { createAdminUserSchema, createOrganizationSchema } from "@fabbric/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { adminUsers, organizations } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

const orgIdParam = z.object({ orgId: z.string().uuid() });
const tag = { tags: ["superadmin"], security: [{ bearerAuth: [] }] };

export async function superadminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireSuperAdmin };

  app.get(
    "/superadmin/organizations",
    { ...auth, schema: { ...tag, summary: "Listar tenants" } },
    async () => db.select().from(organizations)
  );

  app.post(
    "/superadmin/organizations",
    { ...auth, schema: { ...tag, summary: "Crear tenant", body: createOrganizationSchema } },
    async (request, reply) => {
      const input = request.body;
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug));
      if (existing) {
        throw new AppError(409, "conflict", `Ya existe una organización con slug "${input.slug}"`);
      }
      const [org] = await db.insert(organizations).values(input).returning();
      reply.status(201);
      return org;
    }
  );

  app.post(
    "/superadmin/organizations/:orgId/admins",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Dar de alta un admin (owner/staff) en un tenant",
        params: orgIdParam,
        body: createAdminUserSchema,
      },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const input = request.body;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
      if (!org) {
        throw new AppError(404, "not_found", "La organización no existe");
      }

      const created = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });
      if (created.error) {
        throw new AppError(409, "conflict", `Supabase Auth: ${created.error.message}`);
      }

      const [row] = await db
        .insert(adminUsers)
        .values({ id: created.data.user.id, orgId, email: input.email, role: input.role })
        .returning();
      reply.status(201);
      return row;
    }
  );
}
