import { createVariantSchema, updateVariantSchema } from "@fabbric/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { products, productVariants } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["variantes"], security: [{ bearerAuth: [] }] };

export async function variantsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.post(
    "/admin/products/:id/variants",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Crear variante talle/color",
        params: idParam,
        body: createVariantSchema,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id: productId } = request.params;
      const input = request.body;

      const [prod] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.orgId, orgId)));
      if (!prod) throw new AppError(404, "not_found", "Producto no encontrado");

      const [dup] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, productId),
            eq(productVariants.talle, input.talle),
            eq(productVariants.color, input.color)
          )
        );
      if (dup) {
        throw new AppError(409, "conflict", `Ya existe la variante ${input.talle}/${input.color}`);
      }

      const [row] = await db
        .insert(productVariants)
        .values({ ...input, productId, orgId })
        .returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/variants/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar variante", params: idParam, body: updateVariantSchema },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const input = request.body;
      if (Object.keys(input).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }

      const [current] = await db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.id, id), eq(productVariants.orgId, orgId)));
      if (!current) throw new AppError(404, "not_found", "Variante no encontrada");

      // Si cambia talle/color, validar que no choque con otra variante del producto
      const talle = input.talle ?? current.talle;
      const color = input.color ?? current.color;
      if (talle !== current.talle || color !== current.color) {
        const [dup] = await db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, current.productId),
              eq(productVariants.talle, talle),
              eq(productVariants.color, color),
              ne(productVariants.id, id)
            )
          );
        if (dup) throw new AppError(409, "conflict", `Ya existe la variante ${talle}/${color}`);
      }

      // Stock: fuera del PATCH desde T4 — updateVariantSchema ya no acepta
      // stockOnline/stockLocal; los cambios van por /stock-movements.
      const [row] = await db
        .update(productVariants)
        .set(input)
        .where(and(eq(productVariants.id, id), eq(productVariants.orgId, orgId)))
        .returning();
      return row;
    }
  );

  app.delete(
    "/admin/variants/:id",
    { ...auth, schema: { ...tag, summary: "Borrar variante", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [row] = await db
        .delete(productVariants)
        .where(and(eq(productVariants.id, id), eq(productVariants.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Variante no encontrada");
      return { ok: true };
    }
  );
}
