import type { HsrSection } from "../catalog/HomeSectionsRenderer";

export type PublicStoreConfig = {
  storeName: string;
  logoUrl: string | null;
  accentColor: string;
  theme: string;
  businessDescription: string | null;
};

export type PublicHomeSection = HsrSection;

export type PublicProductDetail = {
  id: string;
  name: string;
  description: string;
  price: number;
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
