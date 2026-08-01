import { randomUUID } from "node:crypto";
import { createCollectionSchema, updateCollectionSchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { collections, homeSections } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, IMAGE_MAX_BYTES, storagePathFromUrl } from "../../lib/imageUpload.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureCollectionHomeSection } from "../homeSections/service.js";

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
      // T21/07: la colección nace ya visible en el home — mismo criterio que
      // T19/06 aplicó a categorías, para que el tab "Colecciones" de la tienda
      // (T20/04) no quede vacío por defecto en tenants nuevos.
      const row = await db.transaction(async (tx) => {
        const [col] = await tx.insert(collections).values({ ...input, orgId }).returning();
        await ensureCollectionHomeSection(tx, orgId, col.id);
        return col;
      });
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

  app.post(
    "/admin/collections/:id/image",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar la imagen de la colección (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        params: idParam,
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [collection] = await db
        .select()
        .from(collections)
        .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));
      if (!collection) throw new AppError(404, "not_found", "Colección no encontrada");

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
      const buffer = await file.toBuffer();
      if (buffer.length > IMAGE_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "La imagen no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/collections/${id}-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);

      // Borrar la imagen anterior (best-effort — un huérfano es tolerable)
      if (collection.imageUrl) {
        const oldPath = storagePathFromUrl(collection.imageUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar la imagen anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db
        .update(collections)
        .set({ imageUrl: pub.publicUrl })
        .where(eq(collections.id, id))
        .returning();
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
