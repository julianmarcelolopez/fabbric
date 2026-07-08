import { TaxonomyManager } from "../components/TaxonomyManager";

export function CollectionsPage() {
  return <TaxonomyManager title="Colecciones" endpoint="/admin/collections" noun="colección" />;
}
