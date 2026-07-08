import { createCategorySchema, updateCategorySchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { categories, homeSections, products } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["categorías"], security: [{ bearerAuth: [] }] };

export async function categoriesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/categories",
    { ...auth, schema: { ...tag, summary: "Listar categorías de la organización" } },
    async (request) => {
      const orgId = requireOrgId(request);
      return db
        .select()
        .from(categories)
        .where(eq(categories.orgId, orgId))
        .orderBy(asc(categories.sortOrder), asc(categories.name));
    }
  );

  app.post(
    "/admin/categories",
    { ...auth, schema: { ...tag, summary: "Crear categoría", body: createCategorySchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = request.body;
      const [dup] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.orgId, orgId), eq(categories.slug, input.slug)));
      if (dup) {
        throw new AppError(409, "conflict", `Ya existe una categoría con slug "${input.slug}"`);
      }
      const [row] = await db.insert(categories).values({ ...input, orgId }).returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/categories/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar categoría", params: idParam, body: updateCategorySchema },
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
          .from(categories)
          .where(and(eq(categories.orgId, orgId), eq(categories.slug, input.slug)));
        if (dup && dup.id !== id) {
          throw new AppError(409, "conflict", `Ya existe una categoría con slug "${input.slug}"`);
        }
      }
      // El WHERE incluye orgId: un id de otra org da 404, no filtra existencia
      const [row] = await db
        .update(categories)
        .set(input)
        .where(and(eq(categories.id, id), eq(categories.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Categoría no encontrada");
      return row;
    }
  );

  app.delete(
    "/admin/categories/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Borrar categoría (bloquea si tiene productos)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [cat] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.orgId, orgId)));
      if (!cat) throw new AppError(404, "not_found", "Categoría no encontrada");
      // Regla heredada de bordart: categoría con productos no se borra
      const [inUse] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.categoryId, id))
        .limit(1);
      if (inUse) {
        throw new AppError(
          400,
          "category_in_use",
          "No se puede borrar: hay productos en esta categoría. Movelos o borralos primero."
        );
      }
      await db.transaction(async (tx) => {
        // La ref polimórfica de home_sections no tiene FK: limpieza manual
        await tx
          .delete(homeSections)
          .where(and(eq(homeSections.refType, "category"), eq(homeSections.refId, id)));
        await tx.delete(categories).where(eq(categories.id, id));
      });
      return { ok: true };
    }
  );
}
