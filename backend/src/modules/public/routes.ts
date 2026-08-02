import { and, asc, count, desc, eq, exists, gt, gte, inArray, isNotNull, lte, ne } from "drizzle-orm";
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
  productVariants,
  shippingZones,
} from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { resolveStoreBySlug as resolveStore } from "../catalogConfig/service.js";

// Endpoints PÚBLICOS (sin auth): el tenant se resuelve por el slug de la tienda.
// Contrato de seguridad: SOLO campos public-safe — jamás costPrice, jamás
// stockLocal, jamás orgId. Los selects son explícitos por eso.

const slugParam = z.object({ slug: z.string().min(1) });
const slugIdParam = z.object({ slug: z.string().min(1), id: z.string().uuid() });
const slugCategoryParam = z.object({ slug: z.string().min(1), categorySlug: z.string().min(1) });
const slugCollectionParam = z.object({ slug: z.string().min(1), collectionSlug: z.string().min(1) });
const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1) });
// T21/05: filtros/orden reales de categoría y colección — todos opcionales,
// sin querystring el comportamiento es idéntico al de antes (T19/10).
const productListQuery = pageQuery.extend({
  talle: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  marca: z.string().min(1).optional(),
  precioMin: z.coerce.number().int().min(0).optional(),
  precioMax: z.coerce.number().int().min(0).optional(),
  // "más vendidos" queda afuera: no hay una fuente de datos razonable acá sin
  // joins extra a order_items (agregar ventas por producto) — se documenta
  // como omisión en vez de simularlo con un criterio inventado.
  sort: z.enum(["precio_asc", "precio_desc", "nuevos"]).optional(),
});
type ProductListQuery = z.infer<typeof productListQuery>;
const tag = { tags: ["público"] };

// T19/10: techo de home_sections (8 por sección) — el link "Ver todos" de una
// categoría lleva a la ruta paginada de abajo con este tamaño de página.
const CATEGORY_PAGE_SIZE = 24;

// T21/05 — helpers compartidos por categorías y colecciones (mismos filtros,
// mismo orden, solo cambia el scope/join de cada endpoint).

/** talle/color combinados: el producto entra si UNA MISMA variante matchea
 * ambos (no "alguna variante con ese talle" + "alguna con ese color" por
 * separado) — es lo que un comprador espera al filtrar "talle M, color rojo". */
function variantMatchCondition(talle?: string, color?: string) {
  if (!talle && !color) return null;
  const conditions = [eq(productVariants.productId, products.id), gt(productVariants.stockOnline, 0)];
  if (talle) conditions.push(eq(productVariants.talle, talle));
  if (color) conditions.push(eq(productVariants.color, color));
  return exists(db.select({ id: productVariants.id }).from(productVariants).where(and(...conditions)));
}

function extraFilterConditions(query: ProductListQuery) {
  const conditions = [];
  const variantMatch = variantMatchCondition(query.talle, query.color);
  if (variantMatch) conditions.push(variantMatch);
  if (query.marca) conditions.push(eq(products.brand, query.marca));
  // T21/05: filtra sobre products.price únicamente, no sobre el precio
  // efectivo de la variante (priceOverride) — limitación conocida, documentada.
  if (query.precioMin !== undefined) conditions.push(gte(products.price, query.precioMin));
  if (query.precioMax !== undefined) conditions.push(lte(products.price, query.precioMax));
  return conditions;
}

function resolveSort(sort?: ProductListQuery["sort"]) {
  if (sort === "precio_asc") return [asc(products.price)];
  if (sort === "precio_desc") return [desc(products.price)];
  if (sort === "nuevos") return [desc(products.createdAt)];
  return [asc(products.sortOrder), asc(products.name)];
}

export async function publicRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/public/:slug/config",
    { schema: { ...tag, summary: "Identidad pública de la tienda", params: slugParam } },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      return {
        storeName: config.storeName,
        logoUrl: config.logoUrl,
        accentColor: config.accentColor,
        theme: config.theme,
        businessDescription: config.businessDescription,
        bannerUrl: config.bannerUrl,
        whatsapp: config.whatsapp,
        instagram: config.instagram,
        facebook: config.facebook,
        email: config.email,
        address: config.address,
        businessHours: config.businessHours,
        // T21/03 — null = StoreLayout.tsx autogenera desde zonas de envío
        announcementTexts: config.announcementTexts,
        // T21/04 — null = mid-banner del home sin overlay ni texto (T20/03)
        midBannerTitle: config.midBannerTitle,
        midBannerSubtitle: config.midBannerSubtitle,
        // T21/06 — null = la ficha de producto sigue derivando a WhatsApp (T20/06)
        returnPolicy: config.returnPolicy,
        // null = fondo navy sólido en el hero del home (T20/03)
        heroImageUrl: config.heroImageUrl,
      };
    }
  );

  app.get(
    "/public/:slug/home",
    {
      schema: {
        ...tag,
        summary: "Portada de la tienda: secciones visibles con sus productos public-safe",
        params: slugParam,
      },
    },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      const orgId = config.orgId;

      const sections = await db
        .select()
        .from(homeSections)
        .where(and(eq(homeSections.orgId, orgId), eq(homeSections.visible, true)))
        .orderBy(asc(homeSections.sortOrder));
      if (sections.length === 0) return [];

      const catIds = sections.filter((s) => s.refType === "category").map((s) => s.refId);
      const colIds = sections.filter((s) => s.refType === "collection").map((s) => s.refId);

      const [cats, cols] = await Promise.all([
        catIds.length
          ? db
              .select({ id: categories.id, name: categories.name, slug: categories.slug, imageUrl: categories.imageUrl })
              .from(categories)
              .where(and(eq(categories.orgId, orgId), eq(categories.active, true), inArray(categories.id, catIds)))
          : [],
        colIds.length
          ? db
              .select({ id: collections.id, name: collections.name, slug: collections.slug, imageUrl: collections.imageUrl })
              .from(collections)
              .where(and(eq(collections.orgId, orgId), eq(collections.active, true), inArray(collections.id, colIds)))
          : [],
      ]);

      // Productos public-safe: visibles y NO pausados (out_of_stock sí se muestra)
      const productFilter = and(
        eq(products.orgId, orgId),
        eq(products.visibleInCatalog, true),
        ne(products.status, "paused")
      );
      const [catProducts, colProducts] = await Promise.all([
        catIds.length
          ? db
              .select({
                id: products.id,
                name: products.name,
                price: products.price,
                compareAtPrice: products.compareAtPrice,
                brand: products.brand,
                groupId: products.categoryId,
              })
              .from(products)
              .where(and(productFilter, inArray(products.categoryId, catIds)))
              .orderBy(asc(products.sortOrder), asc(products.name))
          : [],
        colIds.length
          ? db
              .select({
                id: products.id,
                name: products.name,
                price: products.price,
                compareAtPrice: products.compareAtPrice,
                brand: products.brand,
                groupId: productCollections.collectionId,
              })
              .from(productCollections)
              .innerJoin(products, eq(productCollections.productId, products.id))
              .where(and(productFilter, inArray(productCollections.collectionId, colIds)))
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
      const imageOf = (id: string) => firstImages.find((i) => i.productId === id)?.url ?? null;

      return sections.flatMap((section) => {
        const ref =
          section.refType === "category"
            ? cats.find((c) => c.id === section.refId)
            : cols.find((c) => c.id === section.refId);
        if (!ref) return []; // ref inactivo o borrado → la sección no existe para el público
        const pool = section.refType === "category" ? catProducts : colProducts;
        const matching = pool.filter((p) => p.groupId === section.refId);
        const items = matching.slice(0, 8).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          brand: p.brand,
          imageUrl: imageOf(p.id),
        }));
        return [
          {
            id: section.id,
            refName: ref.name,
            refSlug: ref.slug,
            // T21/01 — imagen real de categoría/colección; null = el frontend
            // sigue usando el placeholder de color de T20/04-05.
            refImageUrl: ref.imageUrl,
            refType: section.refType,
            // Compatibilidad directa con HomeSectionsRenderer (ya viene filtrado)
            visible: true,
            refActive: true,
            // T19/10: si hay más de los 8 que se muestran, el frontend arma el link
            // "Ver todos" — solo tiene sentido para categorías (ver ruta de abajo).
            totalCount: matching.length,
            products: items,
          },
        ];
      });
    }
  );

  app.get(
    "/public/:slug/categories/:categorySlug/products",
    {
      schema: {
        ...tag,
        summary:
          "Productos de una categoría, paginados (T19/10) y filtrables/ordenables (T21/05)",
        params: slugCategoryParam,
        querystring: productListQuery,
      },
    },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      const orgId = config.orgId;
      const { categorySlug } = request.params;
      const query = request.query;
      const { page } = query;

      const [category] = await db
        .select({ id: categories.id, name: categories.name, slug: categories.slug, imageUrl: categories.imageUrl })
        .from(categories)
        .where(and(eq(categories.orgId, orgId), eq(categories.slug, categorySlug), eq(categories.active, true)));
      if (!category) throw new AppError(404, "not_found", "Categoría no encontrada");

      // Mismo contrato public-safe que /home: visibles, no pausados
      const scopeFilter = and(
        eq(products.orgId, orgId),
        eq(products.categoryId, category.id),
        eq(products.visibleInCatalog, true),
        ne(products.status, "paused")
      );
      const productFilter = and(scopeFilter, ...extraFilterConditions(query));

      const [[{ totalCount }], rows, talles, colores, marcas] = await Promise.all([
        db.select({ totalCount: count() }).from(products).where(productFilter),
        db
          .select({
            id: products.id,
            name: products.name,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            brand: products.brand,
          })
          .from(products)
          .where(productFilter)
          .orderBy(...resolveSort(query.sort))
          .limit(CATEGORY_PAGE_SIZE)
          .offset((page - 1) * CATEGORY_PAGE_SIZE),
        // T21/05: availableFilters se calcula sobre TODA la categoría (scopeFilter
        // sin los filtros ya aplicados) — refleja qué existe en la categoría, no
        // qué queda tras filtrar (decisión del usuario).
        db
          .selectDistinct({ talle: productVariants.talle })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(and(scopeFilter, gt(productVariants.stockOnline, 0))),
        db
          .selectDistinct({ color: productVariants.color })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(and(scopeFilter, gt(productVariants.stockOnline, 0))),
        db
          .selectDistinct({ brand: products.brand })
          .from(products)
          .where(and(scopeFilter, isNotNull(products.brand))),
      ]);

      const productIds = rows.map((p) => p.id);
      const firstImages = productIds.length
        ? await db
            .select({ productId: productImages.productId, url: productImages.url })
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.sortOrder))
        : [];
      const imageOf = (id: string) => firstImages.find((i) => i.productId === id)?.url ?? null;

      return {
        category: { name: category.name, slug: category.slug, imageUrl: category.imageUrl },
        products: rows.map((p) => ({ ...p, imageUrl: imageOf(p.id) })),
        page,
        pageSize: CATEGORY_PAGE_SIZE,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / CATEGORY_PAGE_SIZE)),
        availableFilters: {
          talles: talles.map((t) => t.talle).sort(),
          colores: colores.map((c) => c.color).sort(),
          marcas: marcas.map((m) => m.brand as string).sort(),
        },
      };
    }
  );

  app.get(
    "/public/:slug/collections/:collectionSlug/products",
    {
      schema: {
        ...tag,
        summary: "Productos de una colección, paginados (T21/02) y filtrables/ordenables (T21/05)",
        params: slugCollectionParam,
        querystring: productListQuery,
      },
    },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      const orgId = config.orgId;
      const { collectionSlug } = request.params;
      const query = request.query;
      const { page } = query;

      const [collection] = await db
        .select({ id: collections.id, name: collections.name, slug: collections.slug, imageUrl: collections.imageUrl })
        .from(collections)
        .where(and(eq(collections.orgId, orgId), eq(collections.slug, collectionSlug), eq(collections.active, true)));
      if (!collection) throw new AppError(404, "not_found", "Colección no encontrada");

      // Mismo contrato public-safe que categorías: visibles, no pausados
      const scopeFilter = and(
        eq(products.orgId, orgId),
        eq(productCollections.collectionId, collection.id),
        eq(products.visibleInCatalog, true),
        ne(products.status, "paused")
      );
      const productFilter = and(scopeFilter, ...extraFilterConditions(query));

      const [[{ totalCount }], rows, talles, colores, marcas] = await Promise.all([
        db
          .select({ totalCount: count() })
          .from(productCollections)
          .innerJoin(products, eq(productCollections.productId, products.id))
          .where(productFilter),
        db
          .select({
            id: products.id,
            name: products.name,
            price: products.price,
            compareAtPrice: products.compareAtPrice,
            brand: products.brand,
          })
          .from(productCollections)
          .innerJoin(products, eq(productCollections.productId, products.id))
          .where(productFilter)
          .orderBy(...resolveSort(query.sort))
          .limit(CATEGORY_PAGE_SIZE)
          .offset((page - 1) * CATEGORY_PAGE_SIZE),
        db
          .selectDistinct({ talle: productVariants.talle })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .innerJoin(productCollections, eq(productCollections.productId, products.id))
          .where(and(scopeFilter, gt(productVariants.stockOnline, 0))),
        db
          .selectDistinct({ color: productVariants.color })
          .from(productVariants)
          .innerJoin(products, eq(productVariants.productId, products.id))
          .innerJoin(productCollections, eq(productCollections.productId, products.id))
          .where(and(scopeFilter, gt(productVariants.stockOnline, 0))),
        db
          .selectDistinct({ brand: products.brand })
          .from(products)
          .innerJoin(productCollections, eq(productCollections.productId, products.id))
          .where(and(scopeFilter, isNotNull(products.brand))),
      ]);

      const productIds = rows.map((p) => p.id);
      const firstImages = productIds.length
        ? await db
            .select({ productId: productImages.productId, url: productImages.url })
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.sortOrder))
        : [];
      const imageOf = (id: string) => firstImages.find((i) => i.productId === id)?.url ?? null;

      return {
        collection: { name: collection.name, slug: collection.slug, imageUrl: collection.imageUrl },
        products: rows.map((p) => ({ ...p, imageUrl: imageOf(p.id) })),
        page,
        pageSize: CATEGORY_PAGE_SIZE,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / CATEGORY_PAGE_SIZE)),
        availableFilters: {
          talles: talles.map((t) => t.talle).sort(),
          colores: colores.map((c) => c.color).sort(),
          marcas: marcas.map((m) => m.brand as string).sort(),
        },
      };
    }
  );

  app.get(
    "/public/:slug/shipping-zones",
    {
      schema: {
        ...tag,
        summary: "Zonas de envío activas de la tienda (para el checkout)",
        params: slugParam,
      },
    },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      return db
        .select({
          id: shippingZones.id,
          name: shippingZones.name,
          cost: shippingZones.cost,
          freeShippingFrom: shippingZones.freeShippingFrom,
        })
        .from(shippingZones)
        .where(and(eq(shippingZones.orgId, config.orgId), eq(shippingZones.active, true)))
        .orderBy(asc(shippingZones.cost));
    }
  );

  app.get(
    "/public/:slug/products/:id",
    {
      schema: {
        ...tag,
        summary: "Detalle público de producto (variantes con stock online, sin datos internos)",
        params: slugIdParam,
      },
    },
    async (request) => {
      const config = await resolveStore(request.params.slug);
      const { id } = request.params;

      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          brand: products.brand,
          status: products.status,
          // T20/06: para armar "también te puede gustar" (misma categoría) sin
          // agregar un endpoint nuevo — reusa /categories/:categorySlug/products.
          categorySlug: categories.slug,
          categoryName: categories.name,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.id, id),
            eq(products.orgId, config.orgId),
            eq(products.visibleInCatalog, true),
            ne(products.status, "paused")
          )
        );
      if (!product) throw new AppError(404, "not_found", "Producto no encontrado");

      const [images, variants] = await Promise.all([
        db
          .select({ id: productImages.id, url: productImages.url, sortOrder: productImages.sortOrder })
          .from(productImages)
          .where(eq(productImages.productId, id))
          .orderBy(asc(productImages.sortOrder)),
        // Select explícito: de variants solo salen campos públicos (nunca stockLocal)
        db
          .select({
            id: productVariants.id,
            talle: productVariants.talle,
            color: productVariants.color,
            priceOverride: productVariants.priceOverride,
            stockOnline: productVariants.stockOnline,
          })
          .from(productVariants)
          .where(eq(productVariants.productId, id))
          .orderBy(asc(productVariants.talle), asc(productVariants.color)),
      ]);

      return { ...product, images, variants };
    }
  );
}
