// T34 — subconjunto de la respuesta de GET /admin/customers (search) que
// usa el buscador de cliente del anticipo; el endpoint devuelve más campos
// (orderCount, totalSpent, lastOrderAt) que acá no hacen falta.
export type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string | null;
};

// Forma exacta de la respuesta de GET /admin/variants/by-barcode/:code
// (backend/src/modules/variants/routes.ts, Fase 1 de T23).
export type VariantByBarcode = {
  id: string;
  barcode: string | null;
  talle: string;
  color: string;
  stockLocal: number;
  priceOverride: number | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
  };
  category: { id: string; name: string };
  imageUrl: string | null;
};
