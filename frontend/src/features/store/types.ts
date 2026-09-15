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
  facebook: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  // T21/03 — null = StoreLayout.tsx autogenera desde zonas de envío
  announcementTexts: string[];
  // T21/04 — null = mid-banner del home sin overlay ni texto (T20/03)
  midBannerTitle: string | null;
  midBannerSubtitle: string | null;
  // T21/06 — null = la ficha de producto sigue derivando a WhatsApp (T20/06)
  returnPolicy: string | null;
  // null = fondo navy sólido en el hero del home (T20/03)
  heroImageUrl: string | null;
};

export type PublicHomeSection = HsrSection;

// T29/06 — marca deja de ser un string suelto en el contrato público: ahora
// viaja como {name, slug} (o null) para poder linkear a /store/:slug/m/:slug
// sin adivinar el slug a partir del nombre. HsrSection/ProductCard/
// ProductDetailView siguen esperando un string plano — la conversión pasa en
// las páginas que consumen estos tipos (CatalogHomePage/CategoryPage/
// StoreProductPage), no en esos componentes compartidos con el preview del admin.
export type PublicBrandRef = { name: string; slug: string };

export type PublicProductDetail = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  brand: PublicBrandRef | null;
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
  // T29/06 — {name, slug} en vez de string suelto: el valor que viaja en
  // ?marca= pasa a ser el slug, el nombre es solo para el label del chip.
  // Ausente (no [] vacío) en la página de una marca puntual — no tiene
  // sentido filtrar por marca dentro de la página de esa misma marca.
  marcas?: PublicBrandRef[];
};

// T19/10 (paginación) + T21/05 (filtros/orden)
export type PublicCategoryProducts = {
  category: { name: string; slug: string; imageUrl: string | null };
  products: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    brand: PublicBrandRef | null;
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

// T29/06 — mismo contrato, tercer modo de CategoryPage.tsx. Sin "colección"/
// "categoría": la clave del grupo es `brand`.
export type PublicBrandProducts = {
  brand: { name: string; slug: string; imageUrl: string | null };
  products: PublicCategoryProducts["products"];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  availableFilters: PublicAvailableFilters;
};

// T29/06 — todas las marcas activas con stock visible, para la pestaña
// "Marcas" de "Explorá la tienda" (listado automático, sin home_sections).
export type PublicBrandSummary = PublicBrandRef & {
  id: string;
  imageUrl: string | null;
  productCount: number;
};
