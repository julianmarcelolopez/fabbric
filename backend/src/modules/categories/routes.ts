import { randomUUID } from "node:crypto";
import { createCategorySchema, updateCategorySchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { categories, homeSections, products } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, IMAGE_MAX_BYTES, storagePathFromUrl } from "../../lib/imageUpload.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureCategoryHomeSection } from "../homeSections/service.js";

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
      // T19/06: la categoría nace ya visible en el home — sin este paso, el hallazgo
      // más grave de T18 (producto cargado pero invisible en la tienda) queda resuelto
      // de raíz. "Mi tienda" pasa a ser para reordenar/ocultar, no para el alta inicial.
      const row = await db.transaction(async (tx) => {
        const [cat] = await tx.insert(categories).values({ ...input, orgId }).returning();
        await ensureCategoryHomeSection(tx, orgId, cat.id);
        return cat;
      });
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

  app.post(
    "/admin/categories/:id/image",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar la imagen de la categoría (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        params: idParam,
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.orgId, orgId)));
      if (!category) throw new AppError(404, "not_found", "Categoría no encontrada");

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
      const buffer = await file.toBuffer();
      if (buffer.length > IMAGE_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "La imagen no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/categories/${id}-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);

      // Borrar la imagen anterior (best-effort — un huérfano es tolerable)
      if (category.imageUrl) {
        const oldPath = storagePathFromUrl(category.imageUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar la imagen anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db
        .update(categories)
        .set({ imageUrl: pub.publicUrl })
        .where(eq(categories.id, id))
        .returning();
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
