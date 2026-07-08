import { randomUUID } from "node:crypto";
import { reorderImagesSchema } from "@fabbric/shared";
import { and, asc, eq, max } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { productImages, products } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["imágenes"], security: [{ bearerAuth: [] }] };

const BUCKET = "product-images";
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function assertProductInOrg(productId: string, orgId: string) {
  const [prod] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.orgId, orgId)));
  if (!prod) throw new AppError(404, "not_found", "Producto no encontrado");
}

export async function imagesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.post(
    "/admin/products/:id/images",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir imagen (multipart, JPEG/PNG/WebP, máx 10 MB)",
        consumes: ["multipart/form-data"],
        params: idParam,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id: productId } = request.params;
      await assertProductInOrg(productId, orgId);

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) {
        throw new AppError(400, "invalid_file_type", "Solo se aceptan imágenes JPEG, PNG o WebP");
      }
      const buffer = await file.toBuffer(); // > 10 MB → 413 (límite de @fastify/multipart)

      // Path por tenant: permite limpiar/medir uso por org a futuro
      const storagePath = `${orgId}/${productId}/${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

      const [{ maxOrder }] = await db
        .select({ maxOrder: max(productImages.sortOrder) })
        .from(productImages)
        .where(eq(productImages.productId, productId));

      const [row] = await db
        .insert(productImages)
        .values({
          productId,
          orgId,
          storagePath,
          url: pub.publicUrl,
          sortOrder: (maxOrder ?? -1) + 1,
        })
        .returning();
      reply.status(201);
      return row;
    }
  );

  app.put(
    "/admin/products/:id/images/order",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Reordenar imágenes (todas, en el orden deseado)",
        params: idParam,
        body: reorderImagesSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id: productId } = request.params;
      const { imageIds } = request.body;
      await assertProductInOrg(productId, orgId);

      const current = await db
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(asc(productImages.sortOrder));

      const currentIds = new Set(current.map((i) => i.id));
      const sameSet =
        imageIds.length === currentIds.size && imageIds.every((id) => currentIds.has(id));
      if (!sameSet) {
        throw new AppError(
          400,
          "invalid_image_set",
          "imageIds debe contener exactamente todas las imágenes del producto"
        );
      }

      await db.transaction(async (tx) => {
        for (const [index, imageId] of imageIds.entries()) {
          await tx
            .update(productImages)
            .set({ sortOrder: index })
            .where(eq(productImages.id, imageId));
        }
      });
      return { ok: true, imageIds };
    }
  );

  app.delete(
    "/admin/images/:id",
    { ...auth, schema: { ...tag, summary: "Borrar imagen (fila + archivo de Storage)", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [img] = await db
        .select()
        .from(productImages)
        .where(and(eq(productImages.id, id), eq(productImages.orgId, orgId)));
      if (!img) throw new AppError(404, "not_found", "Imagen no encontrada");

      const removed = await supabaseAdmin.storage.from(BUCKET).remove([img.storagePath]);
      if (removed.error) {
        throw new AppError(502, "storage_error", `Storage: ${removed.error.message}`);
      }
      await db.delete(productImages).where(eq(productImages.id, id));
      return { ok: true };
    }
  );
}
