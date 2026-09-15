import { randomUUID } from "node:crypto";
import { createBrandSchema, updateBrandSchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { brands } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, IMAGE_MAX_BYTES, storagePathFromUrl } from "../../lib/imageUpload.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["marcas"], security: [{ bearerAuth: [] }] };

export async function brandsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/brands",
    { ...auth, schema: { ...tag, summary: "Listar marcas de la organización" } },
    async (request) => {
      const orgId = requireOrgId(request);
      return db.select().from(brands).where(eq(brands.orgId, orgId)).orderBy(asc(brands.name));
    }
  );

  app.post(
    "/admin/brands",
    { ...auth, schema: { ...tag, summary: "Crear marca", body: createBrandSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = request.body;
      const [dup] = await db
        .select()
        .from(brands)
        .where(and(eq(brands.orgId, orgId), eq(brands.slug, input.slug)));
      if (dup) {
        throw new AppError(409, "conflict", `Ya existe una marca con slug "${input.slug}"`);
      }
      const [row] = await db.insert(brands).values({ ...input, orgId }).returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/brands/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar marca", params: idParam, body: updateBrandSchema },
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
          .from(brands)
          .where(and(eq(brands.orgId, orgId), eq(brands.slug, input.slug)));
        if (dup && dup.id !== id) {
          throw new AppError(409, "conflict", `Ya existe una marca con slug "${input.slug}"`);
        }
      }
      const [row] = await db
        .update(brands)
        .set(input)
        .where(and(eq(brands.id, id), eq(brands.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Marca no encontrada");
      return row;
    }
  );

  app.post(
    "/admin/brands/:id/image",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar el logo de la marca (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        params: idParam,
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [brand] = await db
        .select()
        .from(brands)
        .where(and(eq(brands.id, id), eq(brands.orgId, orgId)));
      if (!brand) throw new AppError(404, "not_found", "Marca no encontrada");

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
      const buffer = await file.toBuffer();
      if (buffer.length > IMAGE_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "La imagen no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/brands/${id}-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);

      // Borrar el logo anterior (best-effort — un huérfano es tolerable)
      if (brand.imageUrl) {
        const oldPath = storagePathFromUrl(brand.imageUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar el logo anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db.update(brands).set({ imageUrl: pub.publicUrl }).where(eq(brands.id, id)).returning();
      return row;
    }
  );

  app.delete(
    "/admin/brands/:id",
    { ...auth, schema: { ...tag, summary: "Borrar marca", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      // Delete libre: los productos con esta marca quedan con brandId nulo
      // (FK con onDelete: "set null", schema.ts) — a diferencia de categoría
      // (obligatoria, bloquea el borrado si hay productos), marca es
      // opcional: perder la marca de un producto es preferible a bloquear el
      // borrado o borrar productos en cascada.
      const [row] = await db
        .delete(brands)
        .where(and(eq(brands.id, id), eq(brands.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Marca no encontrada");
      return { ok: true };
    }
  );
}
