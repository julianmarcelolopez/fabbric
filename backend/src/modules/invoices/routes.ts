import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { invoices } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";
import { generarInvoicePdf } from "./pdf.js";
import { intentarEmision } from "./service.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["facturación AFIP (T25)"], security: [{ bearerAuth: [] }] };

export async function invoicesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.post(
    "/admin/invoices/:id/retry",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Reintentar la emisión de una factura en estado pendiente/error — reusa la lógica de venta-local",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      const [existing] = await db
        .select({ estado: invoices.estado })
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.orgId, orgId)));
      if (!existing) throw new AppError(404, "not_found", "Factura no encontrada");
      if (existing.estado === "emitida") {
        throw new AppError(409, "already_emitted", "La factura ya fue emitida, no hay nada para reintentar");
      }

      const updated = await intentarEmision(orgId, id, request.log);
      if (!updated) throw new AppError(404, "not_found", "Factura no encontrada");

      return {
        id: updated.id,
        estado: updated.estado,
        numero: updated.numero,
        cae: updated.cae,
        caeVencimiento: updated.caeVencimiento,
        mensajeError: updated.mensajeError,
      };
    }
  );

  app.get(
    "/admin/invoices/:id/pdf",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Descargar el PDF de una factura ya emitida (con el QR de AFIP)",
        params: idParam,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;

      // generarInvoicePdf ya tira AppError(404)/AppError(409) — el
      // setErrorHandler global los traduce a la respuesta correcta, no hace
      // falta duplicar esos checks acá.
      const { buffer, filename } = await generarInvoicePdf(orgId, id);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(buffer);
    }
  );
}
