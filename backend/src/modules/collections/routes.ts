import { createCollectionSchema, updateCollectionSchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { collections, homeSections } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["colecciones"], security: [{ bearerAuth: [] }] };

export async function collectionsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/collections",
    { ...auth, schema: { ...tag, summary: "Listar colecciones de la organización" } },
    async (request) => {
      const orgId = requireOrgId(request);
      return db
        .select()
        .from(collections)
        .where(eq(collections.orgId, orgId))
        .orderBy(asc(collections.name));
    }
  );

  app.post(
    "/admin/collections",
    { ...auth, schema: { ...tag, summary: "Crear colección", body: createCollectionSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = request.body;
      const [dup] = await db
        .select()
        .from(collections)
        .where(and(eq(collections.orgId, orgId), eq(collections.slug, input.slug)));
      if (dup) {
        throw new AppError(409, "conflict", `Ya existe una colección con slug "${input.slug}"`);
      }
      const [row] = await db.insert(collections).values({ ...input, orgId }).returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/collections/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar colección", params: idParam, body: updateCollectionSchema },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const input = request.body;
      if (Object.keys(input).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      if (input.slug) {
        const [dup] = await db
          .select()
          .from(collections)
          .where(and(eq(collections.orgId, orgId), eq(collections.slug, input.slug)));
        if (dup && dup.id !== id) {
          throw new AppError(409, "conflict", `Ya existe una colección con slug "${input.slug}"`);
        }
      }
      const [row] = await db
        .update(collections)
        .set(input)
        .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Colección no encontrada");
      return row;
    }
  );

  app.delete(
    "/admin/collections/:id",
    { ...auth, schema: { ...tag, summary: "Borrar colección", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      // Delete libre: la relación con productos (m2m) cae por cascade;
      // la sección del home (ref polimórfica sin FK) se limpia a mano
      const row = await db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(collections)
          .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
          .returning();
        if (deleted) {
          await tx
            .delete(homeSections)
            .where(and(eq(homeSections.refType, "collection"), eq(homeSections.refId, id)));
        }
        return deleted;
      });
      if (!row) throw new AppError(404, "not_found", "Colección no encontrada");
      return { ok: true };
    }
  );
}
