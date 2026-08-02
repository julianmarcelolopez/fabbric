import { randomUUID } from "node:crypto";
import { updateCatalogConfigSchema, updateMpIntegrationSchema } from "@fabbric/shared";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../../db/client.js";
import { catalogConfigs } from "../../db/schema.js";
import { encrypt } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { ALLOWED_IMAGE_TYPES, IMAGE_BUCKET, IMAGE_MAX_BYTES, storagePathFromUrl } from "../../lib/imageUpload.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureConfig, toAdminConfig } from "./service.js";

const tag = { tags: ["config de tienda"], security: [{ bearerAuth: [] }] };

const BUCKET = IMAGE_BUCKET;
const LOGO_MAX_BYTES = IMAGE_MAX_BYTES;
const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

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
      return toAdminConfig(row);
    }
  );

  app.post(
    "/admin/catalog-config/logo",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar el logo de la tienda (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const config = await ensureConfig(orgId);

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
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
      return toAdminConfig(row);
    }
  );

  app.post(
    "/admin/catalog-config/banner",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar el banner de portada de la tienda (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const config = await ensureConfig(orgId);

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
      const buffer = await file.toBuffer();
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "El banner no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/config/banner-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

      // Borrar el banner anterior (best-effort — un huérfano es tolerable)
      if (config.bannerUrl) {
        const oldPath = storagePathFromUrl(config.bannerUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar el banner anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db
        .update(catalogConfigs)
        .set({ bannerUrl: pub.publicUrl })
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return toAdminConfig(row);
    }
  );

  app.post(
    "/admin/catalog-config/hero-image",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Subir/reemplazar la imagen de fondo del hero del home (multipart, JPEG/PNG/WebP/SVG, máx 2 MB)",
        consumes: ["multipart/form-data"],
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const config = await ensureConfig(orgId);

      const file = await request.file();
      if (!file) throw new AppError(400, "validation", "Falta el archivo (campo multipart)");
      const ext = ALLOWED_TYPES[file.mimetype];
      if (!ext) throw new AppError(400, "invalid_file_type", "Solo JPEG, PNG, WebP o SVG");
      const buffer = await file.toBuffer();
      if (buffer.length > LOGO_MAX_BYTES) {
        throw new AppError(400, "file_too_large", "La imagen del hero no puede superar los 2 MB");
      }

      const storagePath = `${orgId}/config/hero-${randomUUID()}.${ext}`;
      const uploaded = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });
      if (uploaded.error) {
        throw new AppError(502, "storage_error", `Storage: ${uploaded.error.message}`);
      }
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

      // Borrar la imagen anterior (best-effort — un huérfano es tolerable)
      if (config.heroImageUrl) {
        const oldPath = storagePathFromUrl(config.heroImageUrl);
        if (oldPath) {
          const removed = await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
          if (removed.error) {
            request.log.warn(`No se pudo borrar la imagen de hero anterior: ${removed.error.message}`);
          }
        }
      }

      const [row] = await db
        .update(catalogConfigs)
        .set({ heroImageUrl: pub.publicUrl })
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return toAdminConfig(row);
    }
  );

  app.patch(
    "/admin/catalog-config/mp-integration",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Conectar/desconectar Mercado Pago propia de la org (T16) — token+secret cifrados en reposo",
        body: updateMpIntegrationSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      await ensureConfig(orgId);
      const { mpAccessToken, mpWebhookSecret } = request.body;

      const [row] = await db
        .update(catalogConfigs)
        .set({
          mpAccessToken: mpAccessToken ? encrypt(mpAccessToken) : null,
          mpWebhookSecret: mpWebhookSecret ? encrypt(mpWebhookSecret) : null,
        })
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return toAdminConfig(row);
    }
  );
}
