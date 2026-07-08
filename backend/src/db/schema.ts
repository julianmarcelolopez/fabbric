import {
  boolean,
  integer,
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
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [unique("collections_org_slug_unique").on(t.orgId, t.slug)]
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
  (t) => [unique("product_variants_product_talle_color_unique").on(t.productId, t.talle, t.color)]
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

// ── Configuración de tienda (nace en T4 por lowStockThreshold; T5 la completa) ─

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
  lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
