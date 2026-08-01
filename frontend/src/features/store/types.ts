import type { HsrSection } from "../catalog/HomeSectionsRenderer";

export type PublicStoreConfig = {
  storeName: string;
  logoUrl: string | null;
  accentColor: string;
  theme: string;
  businessDescription: string | null;
  bannerUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  // T21/03 — null = StoreLayout.tsx autogenera desde zonas de envío
  announcementText: string | null;
  // T21/04 — null = mid-banner del home sin overlay ni texto (T20/03)
  midBannerTitle: string | null;
  midBannerSubtitle: string | null;
  // T21/06 — null = la ficha de producto sigue derivando a WhatsApp (T20/06)
  returnPolicy: string | null;
};

export type PublicHomeSection = HsrSection;

export type PublicProductDetail = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  status: "active" | "out_of_stock";
  // T20/06: para "también te puede gustar" (misma categoría, sin endpoint nuevo)
  categorySlug: string;
  categoryName: string;
  images: { id: string; url: string; sortOrder: number }[];
  variants: {
    id: string;
    talle: string;
    color: string;
    priceOverride: number | null;
    stockOnline: number;
  }[];
};

export type StoreContext = {
  slug: string;
  config: PublicStoreConfig;
};

// T21/05 — qué talles/colores/marcas existen realmente en la categoría/
// colección (con stock, en el caso de talle/color) — para no ofrecer un
// filtro que no devolvería ningún producto.
export type PublicAvailableFilters = {
  talles: string[];
  colores: string[];
  marcas: string[];
};

// T19/10 (paginación) + T21/05 (filtros/orden)
export type PublicCategoryProducts = {
  category: { name: string; slug: string; imageUrl: string | null };
  products: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    brand: string | null;
    imageUrl: string | null;
  }[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  availableFilters: PublicAvailableFilters;
};

// T21/02 — mismo contrato que PublicCategoryProducts, solo cambia la clave
// del grupo (collection en vez de category)
export type PublicCollectionProducts = {
  collection: { name: string; slug: string; imageUrl: string | null };
  products: PublicCategoryProducts["products"];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  availableFilters: PublicAvailableFilters;
};
