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

export type ShippingZoneRow = {
  id: string;
  name: string;
  cost: number;
  freeShippingFrom: number | null;
  active: boolean;
};

export type CatalogConfig = {
  id: string;
  slug: string;
  storeName: string;
  logoUrl: string | null;
  accentColor: string;
  theme: string;
  businessDescription: string | null;
  lowStockThreshold: number;
  active: boolean;
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

export type AdminOrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
export type AdminOrderType = "catalogo" | "personalizado" | "mixto";

export const ADMIN_ORDER_STATUS: Record<AdminOrderStatus, { label: string; color: string }> = {
  pending: { label: "Pendiente de pago", color: "#b45309" },
  paid: { label: "Pagado", color: "#15803d" },
  preparing: { label: "En preparación", color: "#1d4ed8" },
  shipped: { label: "Enviado", color: "#7c3aed" },
  delivered: { label: "Entregado", color: "#374151" },
  cancelled: { label: "Cancelado", color: "#b91c1c" },
};

export const ADMIN_ORDER_TYPE_LABELS: Record<AdminOrderType, string> = {
  catalogo: "Catálogo",
  personalizado: "Personalizado",
  mixto: "Mixto",
};

export type AdminOrderRow = {
  id: string;
  orderNumber: number;
  status: AdminOrderStatus;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
  type: AdminOrderType;
};

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  talle: string | null;
  color: string | null;
  qty: number;
  channel: "online" | "local" | null;
  unitPrice: number;
  unitCostSnapshot: number | null;
  total: number;
  referenceImageUrl: string | null;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: number;
  status: AdminOrderStatus;
  shippingZoneName: string | null;
  shippingCost: number;
  subtotal: number;
  total: number;
  currency: string;
  trackingNumber: string | null;
  mpPaymentId: string | null;
  note: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  items: AdminOrderItem[];
  type: AdminOrderType;
  allowedTransitions: AdminOrderStatus[];
};

export type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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
