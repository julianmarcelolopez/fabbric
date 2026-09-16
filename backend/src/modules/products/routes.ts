import {
  altaRapidaSchema,
  createProductSchema,
  setProductCollectionsSchema,
  updateProductSchema,
} from "@fabbric/shared";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  brands,
  categories,
  collections,
  productCollections,
  productImages,
  products,
  productVariants,
} from "../../db/schema.js";
import { AppError, isUniqueViolation } from "../../lib/errors.js";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireOrgId } from "../../lib/tenant.js";
import { resolveBrandId } from "../brands/service.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["productos"], security: [{ bearerAuth: [] }] };

async function assertCategoryInOrg(categoryId: string, orgId: string) {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.orgId, orgId)));
  if (!cat) throw new AppError(400, "invalid_category", "La categoría no existe en esta organización");
}

export async function productsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/products",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Listar productos (con categoría, colecciones, conteo de variantes y primera imagen)",
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);

      const rows = await db
        .select({ product: products, categoryName: categories.name, brandName: brands.name })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.orgId, orgId))
        .orderBy(asc(products.sortOrder), asc(products.name));

      const ids = rows.map((r) => r.product.id);
      if (ids.length === 0) return [];

      const variantCounts = await db
        .select({ productId: productVariants.productId, n: count() })
        .from(productVariants)
        .where(inArray(productVariants.productId, ids))
        .groupBy(productVariants.productId);

      const collectionRows = await db
        .select({
          productId: productCollections.productId,
          id: collections.id,
          name: collections.name,
        })
        .from(productCollections)
        .innerJoin(collections, eq(productCollections.collectionId, collections.id))
        .where(inArray(productCollections.productId, ids));

      const firstImages = await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          sortOrder: productImages.sortOrder,
        })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(asc(productImages.sortOrder));

      return rows.map(({ product, categoryName, brandName }) => ({
        ...product,
        categoryName,
        brandName,
        variantCount: variantCounts.find((v) => v.productId === product.id)?.n ?? 0,
        collections: collectionRows
          .filter((c) => c.productId === product.id)
          .map(({ id, name }) => ({ id, name })),
        firstImageUrl: firstImages.find((i) => i.productId === product.id)?.url ?? null,
      }));
    }
  );

  app.get(
    "/admin/products/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Detalle completo (variantes + imágenes + colecciones)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      const [row] = await db
        .select({ product: products, categoryName: categories.name, brandName: brands.name })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(products.id, id), eq(products.orgId, orgId)));
      if (!row) throw new AppError(404, "not_found", "Producto no encontrado");

      const [variants, images, cols] = await Promise.all([
        db
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, id))
          .orderBy(asc(productVariants.talle), asc(productVariants.color)),
        db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, id))
          .orderBy(asc(productImages.sortOrder)),
        db
          .select({ id: collections.id, name: collections.name })
          .from(productCollections)
          .innerJoin(collections, eq(productCollections.collectionId, collections.id))
          .where(eq(productCollections.productId, id)),
      ]);

      return {
        ...row.product,
        categoryName: row.categoryName,
        brandName: row.brandName,
        variants,
        images,
        collections: cols,
      };
    }
  );

  app.post(
    "/admin/products",
    { ...auth, schema: { ...tag, summary: "Crear producto", body: createProductSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { newBrandName, brandId, ...rest } = request.body;
      await assertCategoryInOrg(rest.categoryId, orgId);
      const resolvedBrandId = await resolveBrandId(db, orgId, { brandId, newBrandName });
      const [row] = await db.insert(products).values({ ...rest, orgId, brandId: resolvedBrandId }).returning();
      reply.status(201);
      return row;
    }
  );

  app.post(
    "/admin/products/alta-rapida",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Alta rápida por escaneo (T23): crea producto + variante en una sola transacción — visibleInCatalog false fijo, stockLocal según qty (default 1), nunca queda un producto sin variante.",
        body: altaRapidaSchema,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { categoryId, name, brandId, newBrandName, price, talle, color, barcode, qty } = request.body;
      await assertCategoryInOrg(categoryId, orgId);

      try {
        const result = await db.transaction(async (tx) => {
          const resolvedBrandId = await resolveBrandId(tx, orgId, { brandId, newBrandName });
          const [product] = await tx
            .insert(products)
            .values({ orgId, categoryId, name, brandId: resolvedBrandId, price, visibleInCatalog: false })
            .returning();
          const [variant] = await tx
            .insert(productVariants)
            .values({ orgId, productId: product.id, talle, color, barcode, stockLocal: qty ?? 1 })
            .returning();
          return { product, variant };
        });
        reply.status(201);
        return result;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new AppError(409, "conflict", `Ya existe una variante con el código de barras ${barcode}`);
        }
        throw err;
      }
    }
  );

  app.patch(
    "/admin/products/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar producto", params: idParam, body: updateProductSchema },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const { newBrandName, brandId, ...rest } = request.body;
      if (Object.keys(request.body).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      if (rest.categoryId) await assertCategoryInOrg(rest.categoryId, orgId);
      const patch: typeof rest & { brandId?: string | null } = { ...rest };
      if (brandId !== undefined || newBrandName !== undefined) {
        patch.brandId = await resolveBrandId(db, orgId, { brandId, newBrandName });
      }
      const [row] = await db
        .update(products)
        .set(patch)
        .where(and(eq(products.id, id), eq(products.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Producto no encontrado");
      return row;
    }
  );

  app.delete(
    "/admin/products/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Borrar producto (cascade a variantes, imágenes y colecciones)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      // Capturar los paths de Storage ANTES del delete (las filas caen por cascade)
      const images = await db
        .select({ storagePath: productImages.storagePath })
        .from(productImages)
        .where(eq(productImages.productId, id));
      const [row] = await db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Producto no encontrado");
      // Variantes, imágenes (filas) y m2m caen por onDelete: cascade.
      // Limpieza de archivos best-effort: si Storage falla, el producto ya no existe
      // (un archivo huérfano es tolerable; una fila fantasma no).
      if (images.length > 0) {
        const removed = await supabaseAdmin.storage
          .from("product-images")
          .remove(images.map((i) => i.storagePath));
        if (removed.error) {
          request.log.warn(`Storage cleanup falló para producto ${id}: ${removed.error.message}`);
        }
      }
      return { ok: true };
    }
  );

  app.put(
    "/admin/products/:id/collections",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Reemplazar el set de colecciones del producto",
        params: idParam,
        body: setProductCollectionsSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const { collectionIds } = request.body;

      const [prod] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.orgId, orgId)));
      if (!prod) throw new AppError(404, "not_found", "Producto no encontrado");

      if (collectionIds.length > 0) {
        const owned = await db
          .select({ id: collections.id })
          .from(collections)
          .where(and(eq(collections.orgId, orgId), inArray(collections.id, collectionIds)));
        if (owned.length !== new Set(collectionIds).size) {
          throw new AppError(400, "invalid_collections", "Alguna colección no existe en esta organización");
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(productCollections).where(eq(productCollections.productId, id));
        if (collectionIds.length > 0) {
          await tx
            .insert(productCollections)
            .values(collectionIds.map((collectionId) => ({ productId: id, collectionId })));
        }
      });

      return { ok: true, collectionIds };
    }
  );
}
