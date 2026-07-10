import { randomUUID } from "node:crypto";
import { updateCatalogConfigSchema } from "@fabbric/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../../db/client.js";
import { catalogConfigs } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureConfig } from "./service.js";

const tag = { tags: ["config de tienda"], security: [{ bearerAuth: [] }] };

const BUCKET = "product-images";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Extrae el path de Storage desde una URL pública del bucket (para borrar el logo viejo). */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length));
}

export async function catalogConfigRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.patch(
    "/admin/catalog-config",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Actualizar identidad de la tienda (nombre, slug, color, tema, descripción, activa)",
        body: updateCatalogConfigSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const input = request.body;
      if (Object.keys(input).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      const config = await ensureConfig(orgId);

      // El slug de tienda es único GLOBAL — colisión con otra tienda → 409
      if (input.slug && input.slug !== config.slug) {
        const [taken] = await db
          .select({ id: catalogConfigs.id })
          .from(catalogConfigs)
          .where(and(eq(catalogConfigs.slug, input.slug), ne(catalogConfigs.orgId, orgId)));
        if (taken) {
          throw new AppError(409, "conflict", "Esa URL de tienda ya está tomada por otra tienda");
        }
      }

      const [row] = await db
        .update(catalogConfigs)
        .set(input)
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return row;
    }
  );

  app.post(
    "/admin/catalog-config/logo",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar el logo de la tienda (multipart, JPEG/PNG/WebP, máx 2 MB)",
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const config = await ensureConfig(orgId);

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG o WebP");
      const buffer = await file.toBuffer();
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "El logo no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/config/logo-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

      // Borrar el logo anterior (best-effort — un huérfano es tolerable)
      if (config.logoUrl) {
        const oldPath = storagePathFromUrl(config.logoUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar el logo anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db
        .update(catalogConfigs)
        .set({ logoUrl: pub.publicUrl })
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return row;
    }
  );
}
