import { createVariantSchema, updateVariantSchema } from "@fabbric/shared";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { brands, categories, productImages, products, productVariants } from "../../db/schema.js";
import { AppError, isUniqueViolation } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const barcodeParam = z.object({ code: z.string().min(1) });
const tag = { tags: ["variantes"], security: [{ bearerAuth: [] }] };

// T43 — color opcional: string vacío (o solo espacios) cuenta como ausente.
function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function variantsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  // T23 — búsqueda por código de barras físico (distinto de sku): lo usa la
  // PWA de escaneo para decidir entre mostrar la Ficha o el alta de un
  // producto nuevo. 404 tanto si no existe como si es de otra organización.
  app.get(
    "/admin/variants/by-barcode/:code",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Buscar variante por código de barras (org-scoped)",
        params: barcodeParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { code } = request.params;

      const [row] = await db
        .select({
          id: productVariants.id,
          barcode: productVariants.barcode,
          talle: productVariants.talle,
          color: productVariants.color,
          stockLocal: productVariants.stockLocal,
          priceOverride: productVariants.priceOverride,
          product: {
            id: products.id,
            name: products.name,
            brand: brands.name,
            price: products.price,
          },
          category: { id: categories.id, name: categories.name },
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(eq(productVariants.barcode, code), eq(productVariants.orgId, orgId)));
      if (!row) throw new AppError(404, "not_found", "Código de barras no encontrado");

      const [image] = await db
        .select({ url: productImages.url })
        .from(productImages)
        .where(eq(productImages.productId, row.product.id))
        .orderBy(asc(productImages.sortOrder))
        .limit(1);

      return { ...row, imageUrl: image?.url ?? null };
    }
  );

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
      // T43 — string vacío/ausente (ej. perfumes, sin eje de color) queda null.
      const color = emptyToNull(request.body.color);
      const input = { ...request.body, color };

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
            color === null ? isNull(productVariants.color) : eq(productVariants.color, color)
          )
        );
      if (dup) {
        throw new AppError(409, "conflict", `Ya existe la variante ${input.talle}/${color ?? "sin color"}`);
      }

      try {
        const [row] = await db
          .insert(productVariants)
          .values({ ...input, productId, orgId })
          .returning();
        reply.status(201);
        return row;
      } catch (err) {
        // T37 — mismo criterio que alta-rapida: barcode único por org.
        if (isUniqueViolation(err) && input.barcode) {
          throw new AppError(409, "conflict", `Ya existe una variante con el código de barras ${input.barcode}`);
        }
        throw err;
      }
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
      if (Object.keys(request.body).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      // T43 — string vacío (ej. vaciar el color de un perfume) queda null.
      const input = "color" in request.body ? { ...request.body, color: emptyToNull(request.body.color) } : request.body;

      const [current] = await db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.id, id), eq(productVariants.orgId, orgId)));
      if (!current) throw new AppError(404, "not_found", "Variante no encontrada");

      // Si cambia talle/color, validar que no choque con otra variante del producto
      const talle = input.talle ?? current.talle;
      const color: string | null = "color" in input ? (input.color ?? null) : current.color;
      if (talle !== current.talle || color !== current.color) {
        const [dup] = await db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, current.productId),
              eq(productVariants.talle, talle),
              color === null ? isNull(productVariants.color) : eq(productVariants.color, color),
              ne(productVariants.id, id)
            )
          );
        if (dup) throw new AppError(409, "conflict", `Ya existe la variante ${talle}/${color ?? "sin color"}`);
      }

      // Stock: fuera del PATCH desde T4 — updateVariantSchema ya no acepta
      // stockOnline/stockLocal; los cambios van por /stock-movements.
      try {
        const [row] = await db
          .update(productVariants)
          .set(input)
          .where(and(eq(productVariants.id, id), eq(productVariants.orgId, orgId)))
          .returning();
        return row;
      } catch (err) {
        // T27: corrección manual de un código de barras mal cargado — mismo
        // criterio que alta-rapida para el duplicado (unique por org).
        if (isUniqueViolation(err) && input.barcode) {
          throw new AppError(409, "conflict", `Ya existe una variante con el código de barras ${input.barcode}`);
        }
        throw err;
      }
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
