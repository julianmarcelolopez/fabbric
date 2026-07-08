import {
  createHomeSectionSchema,
  reorderHomeSectionsSchema,
  updateHomeSectionSchema,
} from "@fabbric/shared";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
  categories,
  collections,
  homeSections,
  productCollections,
  productImages,
  products,
} from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["home"], security: [{ bearerAuth: [] }] };

/** Máximo de productos resueltos por sección (v1: automáticos, sin curaduría) */
const PRODUCTS_PER_SECTION = 8;

export async function homeSectionsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/home-sections",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Listar secciones del home con su ref resuelto (nombre/slug/activo) y hasta 8 productos visibles cada una",
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);

      const sections = await db
        .select()
        .from(homeSections)
        .where(eq(homeSections.orgId, orgId))
        .orderBy(asc(homeSections.sortOrder));
      if (sections.length === 0) return [];

      const catIds = sections.filter((s) => s.refType === "category").map((s) => s.refId);
      const colIds = sections.filter((s) => s.refType === "collection").map((s) => s.refId);

      const [cats, cols] = await Promise.all([
        catIds.length
          ? db
              .select({ id: categories.id, name: categories.name, slug: categories.slug, active: categories.active })
              .from(categories)
              .where(and(eq(categories.orgId, orgId), inArray(categories.id, catIds)))
          : [],
        colIds.length
          ? db
              .select({ id: collections.id, name: collections.name, slug: collections.slug, active: collections.active })
              .from(collections)
              .where(and(eq(collections.orgId, orgId), inArray(collections.id, colIds)))
          : [],
      ]);

      const [catProducts, colProducts] = await Promise.all([
        catIds.length
          ? db
              .select({ id: products.id, name: products.name, price: products.price, groupId: products.categoryId })
              .from(products)
              .where(
                and(
                  eq(products.orgId, orgId),
                  eq(products.visibleInCatalog, true),
                  inArray(products.categoryId, catIds)
                )
              )
              .orderBy(asc(products.sortOrder), asc(products.name))
          : [],
        colIds.length
          ? db
              .select({
                id: products.id,
                name: products.name,
                price: products.price,
                groupId: productCollections.collectionId,
              })
              .from(productCollections)
              .innerJoin(products, eq(productCollections.productId, products.id))
              .where(
                and(
                  eq(products.orgId, orgId),
                  eq(products.visibleInCatalog, true),
                  inArray(productCollections.collectionId, colIds)
                )
              )
              .orderBy(asc(products.sortOrder), asc(products.name))
          : [],
      ]);

      const productIds = [...new Set([...catProducts, ...colProducts].map((p) => p.id))];
      const firstImages = productIds.length
        ? await db
            .select({ productId: productImages.productId, url: productImages.url })
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.sortOrder))
        : [];
      const imageOf = (productId: string) =>
        firstImages.find((i) => i.productId === productId)?.url ?? null;

      return sections.map((section) => {
        const ref =
          section.refType === "category"
            ? cats.find((c) => c.id === section.refId)
            : cols.find((c) => c.id === section.refId);
        const pool = section.refType === "category" ? catProducts : colProducts;
        const sectionProducts = pool
          .filter((p) => p.groupId === section.refId)
          .slice(0, PRODUCTS_PER_SECTION)
          .map((p) => ({ id: p.id, name: p.name, price: p.price, imageUrl: imageOf(p.id) }));

        return {
          id: section.id,
          refType: section.refType,
          refId: section.refId,
          sortOrder: section.sortOrder,
          visible: section.visible,
          // ref puede faltar si la taxonomía fue borrada (sin FK): el renderer lo saltea
          refName: ref?.name ?? null,
          refSlug: ref?.slug ?? null,
          refActive: ref?.active ?? false,
          products: sectionProducts,
        };
      });
    }
  );

  app.post(
    "/admin/home-sections",
    { ...auth, schema: { ...tag, summary: "Agregar sección al home", body: createHomeSectionSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { refType, refId } = request.body;

      // Integridad de la ref polimórfica: debe existir en ESTA org
      const table = refType === "category" ? categories : collections;
      const [ref] = await db
        .select({ id: table.id })
        .from(table)
        .where(and(eq(table.id, refId), eq(table.orgId, orgId)));
      if (!ref) {
        throw new AppError(400, "invalid_ref", "La categoría/colección no existe en esta organización");
      }

      const [dup] = await db
        .select({ id: homeSections.id })
        .from(homeSections)
        .where(
          and(
            eq(homeSections.orgId, orgId),
            eq(homeSections.refType, refType),
            eq(homeSections.refId, refId)
          )
        );
      if (dup) throw new AppError(409, "conflict", "Esa sección ya está en el home");

      const [{ maxOrder }] = await db
        .select({ maxOrder: max(homeSections.sortOrder) })
        .from(homeSections)
        .where(eq(homeSections.orgId, orgId));

      const [row] = await db
        .insert(homeSections)
        .values({ orgId, refType, refId, sortOrder: (maxOrder ?? -1) + 1 })
        .returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/home-sections/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Mostrar/ocultar sección", params: idParam, body: updateHomeSectionSchema },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [row] = await db
        .update(homeSections)
        .set({ visible: request.body.visible })
        .where(and(eq(homeSections.id, id), eq(homeSections.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Sección no encontrada");
      return row;
    }
  );

  app.put(
    "/admin/home-sections/order",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Reordenar el home (todas las secciones, en el orden deseado)",
        body: reorderHomeSectionsSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { sectionIds } = request.body;

      const current = await db
        .select({ id: homeSections.id })
        .from(homeSections)
        .where(eq(homeSections.orgId, orgId));
      const currentIds = new Set(current.map((s) => s.id));
      const sameSet =
        sectionIds.length === currentIds.size && sectionIds.every((id) => currentIds.has(id));
      if (!sameSet) {
        throw new AppError(
          400,
          "invalid_section_set",
          "sectionIds debe contener exactamente todas las secciones del home"
        );
      }

      await db.transaction(async (tx) => {
        for (const [index, id] of sectionIds.entries()) {
          await tx.update(homeSections).set({ sortOrder: index }).where(eq(homeSections.id, id));
        }
      });
      return { ok: true, sectionIds };
    }
  );

  app.delete(
    "/admin/home-sections/:id",
    { ...auth, schema: { ...tag, summary: "Quitar sección del home", params: idParam } },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [row] = await db
        .delete(homeSections)
        .where(and(eq(homeSections.id, id), eq(homeSections.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Sección no encontrada");
      return { ok: true };
    }
  );
}
