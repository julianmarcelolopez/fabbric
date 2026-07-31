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

// T19/10
export type PublicCategoryProducts = {
  category: { name: string; slug: string };
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
};
