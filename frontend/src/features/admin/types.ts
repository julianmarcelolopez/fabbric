// Formas de las respuestas de la API admin (las fechas llegan como string ISO)

export type Me = {
  id: string;
  email: string;
  role: "super_admin" | "owner" | "staff";
  orgId: string | null;
  orgName: string | null;
};

export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type ProductStatus = "active" | "paused" | "out_of_stock";

export type Variant = {
  id: string;
  productId: string;
  sku: string | null;
  talle: string;
  color: string;
  stockOnline: number;
  stockLocal: number;
  priceOverride: number | null;
};

export type ProductImage = {
  id: string;
  url: string;
  storagePath: string;
  sortOrder: number;
};

export type ProductBase = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  costPrice: number | null;
  status: ProductStatus;
  visibleInCatalog: boolean;
  sortOrder: number;
};

export type ProductListItem = ProductBase & {
  categoryName: string;
  variantCount: number;
  collections: { id: string; name: string }[];
  firstImageUrl: string | null;
};

export type ProductDetail = ProductBase & {
  categoryName: string;
  variants: Variant[];
  images: ProductImage[];
  collections: { id: string; name: string }[];
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  out_of_stock: "Sin stock",
};

export type StockItem = {
  variantId: string;
  productId: string;
  productName: string;
  talle: string;
  color: string;
  sku: string | null;
  stockOnline: number;
  stockLocal: number;
  total: number;
  critical: boolean;
};

export type StockOverview = {
  lowStockThreshold: number;
  items: StockItem[];
};

export type StockMovementRow = {
  id: string;
  channel: "online" | "local";
  type: "entrada" | "venta" | "ajuste" | "sync";
  delta: number;
  note: string | null;
  createdAt: string;
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementRow["type"], string> = {
  entrada: "Entrada",
  venta: "Venta",
  ajuste: "Ajuste",
  sync: "Sync (auto)",
};

export type HomeSectionItem = {
  id: string;
  refType: "category" | "collection";
  refId: string;
  sortOrder: number;
  visible: boolean;
  refName: string | null;
  refSlug: string | null;
  refActive: boolean;
  products: { id: string; name: string; price: number; imageUrl: string | null }[];
};
