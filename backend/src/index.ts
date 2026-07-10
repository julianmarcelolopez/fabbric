import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { catalogConfigRoutes } from "./modules/catalogConfig/routes.js";
import { categoriesRoutes } from "./modules/categories/routes.js";
import { collectionsRoutes } from "./modules/collections/routes.js";
import { customersRoutes } from "./modules/customers/routes.js";
import { homeSectionsRoutes } from "./modules/homeSections/routes.js";
import { imagesRoutes } from "./modules/images/routes.js";
import { ordersRoutes } from "./modules/orders/routes.js";
import { paymentsRoutes } from "./modules/payments/routes.js";
import { webhookRoutes } from "./modules/payments/webhook.js";
import { portalRoutes } from "./modules/portal/routes.js";
import { productsRoutes } from "./modules/products/routes.js";
import { publicRoutes } from "./modules/public/routes.js";
import { shippingZonesRoutes } from "./modules/shippingZones/routes.js";
import { stockRoutes } from "./modules/stock/routes.js";
import { superadminRoutes } from "./modules/superadmin/routes.js";
import { variantsRoutes } from "./modules/variants/routes.js";
import authPlugin from "./plugins/auth.js";

const app = Fastify({ logger: true });

// Validación de rutas con Zod (fastify-type-provider-zod): los schemas declarados
// en cada ruta validan el request Y alimentan el OpenAPI de /docs
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler((err, request, reply) => {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  // Errores de validación de schema de ruta (type provider)
  if (hasZodFastifySchemaValidationErrors(err)) {
    return reply.status(400).send({
      error: {
        code: "validation",
        message: "Datos inválidos",
        issues: err.validation.map((i) => ({
          path: i.params?.issue?.path?.join(".") ?? i.instancePath.replace(/^\//, ""),
          message: i.params?.issue?.message ?? i.message,
        })),
      },
    });
  }
  // Zod usado a mano dentro de un handler
  if (err instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "validation",
        message: "Datos inválidos",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }
  // Errores 4xx de plugins (ej. 413 de multipart por archivo muy grande)
  const plainErr = err as { statusCode?: unknown; code?: unknown; message?: unknown };
  if (
    typeof plainErr.statusCode === "number" &&
    plainErr.statusCode >= 400 &&
    plainErr.statusCode < 500
  ) {
    return reply.status(plainErr.statusCode).send({
      error: {
        code: typeof plainErr.code === "string" ? plainErr.code : "request_error",
        message: typeof plainErr.message === "string" ? plainErr.message : "Request inválido",
      },
    });
  }
  request.log.error(err);
  return reply.status(500).send({ error: { code: "internal", message: "Error interno" } });
});

await app.register(cors, {
  origin: ["http://localhost:5173"],
  // El default de @fastify/cors solo permite GET/HEAD/POST en el preflight —
  // sin esto, PATCH/PUT/DELETE fallan desde el navegador (no desde tests Node)
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Upload de imágenes: límite 10 MB por archivo (lección de bordart — sin límite
// configurado, los uploads grandes fallan silencioso)
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

await app.register(swagger, {
  openapi: {
    info: {
      title: "fabbric API",
      description:
        "SaaS multi-tenant para negocios de ropa. Rutas /admin/* requieren JWT de un admin (owner/staff); /superadmin/* requiere super_admin.",
      version: "0.1.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  transform: jsonSchemaTransform,
});
await app.register(swaggerUi, { routePrefix: "/docs" });

await app.register(authPlugin);
await app.register(adminRoutes);
await app.register(superadminRoutes);
await app.register(categoriesRoutes);
await app.register(collectionsRoutes);
await app.register(productsRoutes);
await app.register(variantsRoutes);
await app.register(imagesRoutes);
await app.register(homeSectionsRoutes);
await app.register(stockRoutes);
await app.register(catalogConfigRoutes);
await app.register(shippingZonesRoutes);
await app.register(publicRoutes);
await app.register(portalRoutes);
await app.register(paymentsRoutes);
await app.register(webhookRoutes);
await app.register(ordersRoutes);
await app.register(customersRoutes);

app.get("/health", { schema: { tags: ["sistema"], summary: "Health check" } }, async () => ({
  ok: true,
}));

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
