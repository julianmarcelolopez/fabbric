import type { DashboardLayout } from "@fabbric/shared";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const adminRole = pgEnum("admin_role", ["super_admin", "owner", "staff"]);
export const productStatus = pgEnum("product_status", ["active", "paused", "out_of_stock"]);
export const homeSectionRefType = pgEnum("home_section_ref_type", ["category", "collection"]);
export const stockChannel = pgEnum("stock_channel", ["online", "local"]);
export const stockMovementType = pgEnum("stock_movement_type", ["entrada", "venta", "ajuste", "sync"]);
// T34 — "partial" (venta con anticipo, puerta a puerta): nace directo en
// este estado en vez de "paid" cuando el cobro no fue completo, igual que
// "paid" nunca se alcanza por PATCH genérico (ver ORDER_TRANSITIONS en
// @fabbric/shared) — solo por el endpoint /venta-local (nace así) o
// /cobrar-saldo (llega a "paid" al completarse).
export const orderStatus = pgEnum("order_status", [
  "pending",
  "partial",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const movementType = pgEnum("movement_type", ["income", "expense"]);
// T25 — ambiente AFIP de la config de facturación de una org: nunca se emite
// en producción sin que la org lo haya pasado explícitamente a "produccion".
export const afipAmbiente = pgEnum("afip_ambiente", ["homologacion", "produccion"]);
// T25 — estado de una factura AFIP: `pendiente` recién creada dentro de la
// transacción de venta-local, antes de intentar la emisión; `error` si AFIP
// rechazó/falló (la venta ya quedó `paid`, no se revierte); `emitida` con CAE.
export const invoiceEstado = pgEnum("invoice_estado", ["pendiente", "emitida", "error"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  // id = auth.users.id (Supabase Auth) — se inserta al dar de alta, no se autogenera
  id: uuid("id").primaryKey(),
  // null => super_admin (sin organización)
  orgId: uuid("org_id").references(() => organizations.id),
  email: text("email").notNull().unique(),
  role: adminRole("role").notNull(),
  // Layout del dashboard POR USUARIO (T10, patrón bordart) — null = default
  dashboardLayout: jsonb("dashboard_layout").$type<DashboardLayout>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Catálogo (T2) ─────────────────────────────────────────────────────────────
// Regla del proyecto: toda tabla de negocio lleva org_id y ningún query va sin él.

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // T21/01 — imagen real de la categoría (tienda pública, T20); null = sigue
    // usando el placeholder de color de T20/04-05.
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Slug único por tenant, no global: dos tiendas pueden tener "remeras"
  (t) => [unique("categories_org_slug_unique").on(t.orgId, t.slug)]
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // T21/01 — mismo criterio que categories.imageUrl
    imageUrl: text("image_url"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("collections_org_slug_unique").on(t.orgId, t.slug)]
);

// T29 — catálogo propio de marcas (antes: products.brand era texto libre).
// Mismo shape que categories/collections.
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    imageUrl: text("image_url"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("brands_org_slug_unique").on(t.orgId, t.slug)]
);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // Precios en centavos (int): sin flotantes; el frontend formatea
  price: integer("price").notNull(),
  // Costo interno — nunca se expone en endpoints públicos
  costPrice: integer("cost_price"),
  // Precio anterior, para mostrar tachado (T11) — solo si es mayor que price; público
  compareAtPrice: integer("compare_at_price"),
  // Leyenda de cuotas de la ficha de producto (ej. "3 cuotas sin interés de
  // $11.666") — texto libre por producto, nullable: sin ella no se muestra
  // nada (antes esta línea estaba hardcodeada e igual para todos, T33).
  installmentsText: text("installments_text"),
  // T29 — catálogo propio de marcas (antes: brand era texto libre, T12).
  // Nullable: no todo producto tiene marca. onDelete: "set null" — a
  // diferencia de categoryId (obligatorio, borrado bloqueado si hay
  // productos), una marca es opcional: se puede borrar y sus productos
  // simplemente quedan sin marca, sin bloquear ni cascadear el borrado.
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  status: productStatus("status").notNull().default("active"),
  visibleInCatalog: boolean("visible_in_catalog").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const productCollections = pgTable(
  "product_collections",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] })]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    sku: text("sku"),
    // Código de barras físico de la prenda (T23) — distinto de sku (código
    // interno, sin unicidad). Nullable: las variantes viejas no lo tienen.
    barcode: text("barcode"),
    talle: text("talle").notNull(),
    color: text("color").notNull(),
    // Stock omnicanal = split manual (decisión del plan): online y local por separado
    stockOnline: integer("stock_online").notNull().default(0),
    stockLocal: integer("stock_local").notNull().default(0),
    priceOverride: integer("price_override"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("product_variants_product_talle_color_unique").on(t.productId, t.talle, t.color),
    unique("product_variants_org_barcode_unique").on(t.orgId, t.barcode),
  ]
);

// ── Secciones del home (T3) ──────────────────────────────────────────────────

export const homeSections = pgTable(
  "home_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    refType: homeSectionRefType("ref_type").notNull(),
    // Referencia polimórfica a categories o collections según refType — SIN FK:
    // la integridad es responsabilidad de la app (validación al crear + limpieza
    // al borrar la taxonomía) y el renderer saltea refs faltantes.
    refId: uuid("ref_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Una misma categoría/colección no puede estar dos veces en el home
  (t) => [unique("home_sections_org_ref_unique").on(t.orgId, t.refType, t.refId)]
);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Stock (T4) ────────────────────────────────────────────────────────────────
// El stock nunca se setea: se mueve. Cada cambio es un movimiento inmutable
// (sin updated_at) + update del contador de la variante, en transacción.

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  channel: stockChannel("channel").notNull(),
  // entrada: delta > 0 | venta: delta < 0 | ajuste: cualquiera ≠ 0
  // sync: reservado para el webhook de Mercado Pago (T6), no se expone al admin
  type: stockMovementType("type").notNull(),
  delta: integer("delta").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Checkout (T6): compradores, envíos y órdenes ─────────────────────────────

export const customers = pgTable(
  "customers",
  {
    // id propio (no auth.users.id): el vínculo con Supabase Auth es googleSub,
    // y el mismo Google account es un customer DISTINTO en cada tienda
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    // T34 — nullable: un cliente puerta a puerta (POST /admin/customers,
    // alta manual sin login) todavía no tiene cuenta de Google. Si esa misma
    // persona se loguea más adelante en la tienda online, resolveCustomer
    // (auth.ts) empareja por googleSub — no encuentra esta fila (null nunca
    // matchea) y crea una segunda, separada; limitación conocida, no
    // resuelta en T34 (ver docs/T34_VentaConAnticipo/plan.md, Hallazgo 3).
    googleSub: uuid("google_sub"),
    // T34 — nullable por el mismo motivo: el alta puerta a puerta no pide
    // email. notifyCustomer() ya maneja email nulo con un early-return.
    email: text("email"),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("customers_org_google_sub_unique").on(t.orgId, t.googleSub)]
);

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  // Centavos, como todos los montos
  cost: integer("cost").notNull(),
  freeShippingFrom: integer("free_shipping_from"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    // Nullable: T7 permite pedidos manuales del admin sin cliente registrado
    customerId: uuid("customer_id").references(() => customers.id),
    // Secuencial POR ORG — asignación transaccional con retry sobre la unique
    orderNumber: integer("order_number").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    // La zona puede borrarse: la orden guarda snapshot de nombre y costo
    shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id, {
      onDelete: "set null",
    }),
    shippingZoneName: text("shipping_zone_name"),
    shippingCost: integer("shipping_cost").notNull().default(0),
    subtotal: integer("subtotal").notNull(),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("ARS"),
    trackingNumber: text("tracking_number"),
    mpPreferenceId: text("mp_preference_id"),
    mpPaymentId: text("mp_payment_id"),
    note: text("note"),
    // T34 — solo se completa cuando el pedido nace con medioPago "anticipo"
    // (venta con saldo pendiente, puerta a puerta); null en cualquier otro
    // pedido. Fecha límite única, sin cuotas (decisión de negocio, ver
    // docs/T34_VentaConAnticipo/analisis.md).
    balanceDueDate: date("balance_due_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("orders_org_number_unique").on(t.orgId, t.orderNumber),
    index("orders_org_created_idx").on(t.orgId, t.createdAt),
  ]
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  // set null (NO cascade): el historial de ventas sobrevive a borrar el producto
  // — por eso cada ítem lleva snapshot de nombre/talle/color/precios.
  // productId null desde el origen = ítem personalizado/bespoke (T7).
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  talle: text("talle"),
  color: text("color"),
  qty: integer("qty").notNull(),
  // De qué stock sale el ítem al cobrarse: checkout online → "online";
  // pedidos manuales (T7) eligen por ítem; bespoke → null (no toca stock)
  channel: stockChannel("channel"),
  unitPrice: integer("unit_price").notNull(),
  // Costo al momento de la venta (patrón bordart) — alimenta ganancia en T9/T10
  unitCostSnapshot: integer("unit_cost_snapshot"),
  total: integer("total").notNull(),
  // Foto/boceto de referencia para ítems personalizados (T7)
  referenceImageUrl: text("reference_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Configuración de tienda (nace en T4 por lowStockThreshold; T5 la completa) ─

// ── Finanzas (T9): carteras + movimientos — patrón bordart ────────────────────
// Saldo de cartera = initialBalance + Σ income − Σ expense: SIEMPRE calculado,
// jamás persistido (mismo principio que el stock: nunca setear, solo mover).

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color"),
    // Centavos; fijo al crear — los ajustes posteriores son movimientos
    initialBalance: integer("initial_balance").notNull().default(0),
    // Sin DELETE de carteras: solo se desactivan (los movimientos las referencian)
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("wallets_org_name_unique").on(t.orgId, t.name)]
);

export const financialMovements = pgTable(
  "financial_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    type: movementType("type").notNull(),
    // Siempre positivo (centavos): el signo lo da `type`
    amount: integer("amount").notNull(),
    // Texto libre con rubros sugeridos en la UI (no enum: cada tienda tiene los suyos)
    category: text("category"),
    description: text("description"),
    // Fecha CONTABLE (sin hora): el reporte mensual agrupa por esto, no por createdAt
    date: date("date").notNull(),
    // Cobro de un pedido => vinculado e IMBORRABLE (regla bordart)
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("financial_movements_org_date_idx").on(t.orgId, t.date)]
);

export const catalogConfigs = pgTable("catalog_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Una config por org
  orgId: uuid("org_id")
    .notNull()
    .unique()
    .references(() => organizations.id),
  // URL pública de la tienda (/store/<slug>) — único GLOBAL, entre todas las orgs
  slug: text("slug").notNull().unique(),
  storeName: text("store_name").notNull(),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").notNull().default("#111827"),
  theme: text("theme").notNull().default("light"),
  businessDescription: text("business_description"),
  // Header/footer personalizables (T14) — todos opcionales
  bannerUrl: text("banner_url"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  // T21/08 — red social adicional; mismo patrón que instagram (icono en el
  // footer solo si tiene valor)
  facebook: text("facebook"),
  email: text("email"),
  address: text("address"),
  businessHours: text("business_hours"),
  // T21/08 — mensajes propios del announcement bar, en orden de rotación;
  // [] = autogenerado desde zonas de envío reales (mismo criterio de T20/02,
  // ahora como fallback). Pasó de un texto único a una lista (carrusel con
  // flechas cuando hay 2+, mensaje fijo sin flechas cuando hay exactamente 1).
  announcementTexts: text("announcement_texts").array().notNull().default([]),
  // T21/04 — texto opcional superpuesto al mid-banner del home; null = el
  // banner se muestra solo (bannerUrl), sin overlay ni texto (T20/03).
  midBannerTitle: text("mid_banner_title"),
  midBannerSubtitle: text("mid_banner_subtitle"),
  // T21/06 — texto libre de la política de cambios/devoluciones; null = la
  // ficha de producto sigue derivando a WhatsApp (T20/06).
  returnPolicy: text("return_policy"),
  // Imagen de fondo del hero del home; null = fondo navy sólido (T20/03)
  heroImageUrl: text("hero_image_url"),
  // Mercado Pago propia de la org (T16) — cifradas (ver lib/crypto.ts), nunca
  // en texto plano; nunca en updateCatalogConfigSchema, se setean aparte
  mpAccessToken: text("mp_access_token"),
  mpWebhookSecret: text("mp_webhook_secret"),
  // Facturación electrónica AFIP de la org (T25) — mismo criterio que Mercado
  // Pago: certificado/clave/access_token cifrados, nunca en texto plano, nunca
  // en updateCatalogConfigSchema, se setean por su propio endpoint. `afipCuit`
  // y `afipPuntoVenta` no son secretos pero viven acá igual, junto al resto de
  // la config de facturación de la org.
  afipCuit: text("afip_cuit"),
  afipPuntoVenta: integer("afip_punto_venta"),
  afipAmbiente: afipAmbiente("afip_ambiente"),
  afipCertificado: text("afip_certificado"),
  afipClavePrivada: text("afip_clave_privada"),
  afipAccessToken: text("afip_access_token"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// T25 — comprobante AFIP de una venta local. 1 a 1 con `orders` (nunca dos
// facturas del mismo pedido). `numero`/`cae`/`caeVencimiento` quedan null
// hasta que `estado` pasa a `emitida`; `mensajeError` solo se usa en `error`.
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    // Texto libre (no enum cerrado) — hoy siempre "C", pero no bloquea si el
    // día de mañana se suma Factura A/B para responsables inscriptos.
    tipo: text("tipo").notNull().default("C"),
    numero: integer("numero"),
    cae: text("cae"),
    // AFIP/el SDK la devuelven como texto "AAAA-MM-DD" — se guarda tal cual,
    // no como date, para no depender de un parseo propio de ese formato.
    caeVencimiento: text("cae_vencimiento"),
    // T25 Fase 3 — fecha real que se le mandó a AFIP en `CbteFch` (formato
    // "AAAA-MM-DD"), NO la fecha de creación de la factura: hace falta tal
    // cual para el JSON del QR (RG 4892), y sin guardarla no hay forma de
    // reconstruirla con precisión después de emitida.
    fecha: text("fecha"),
    estado: invoiceEstado("estado").notNull().default("pendiente"),
    clienteNombre: text("cliente_nombre"),
    clienteEmail: text("cliente_email"),
    clienteDni: text("cliente_dni"),
    mensajeError: text("mensaje_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("invoices_org_idx").on(t.orgId)]
);
