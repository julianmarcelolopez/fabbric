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
