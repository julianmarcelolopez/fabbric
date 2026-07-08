import { TaxonomyManager } from "../components/TaxonomyManager";

export function CategoriesPage() {
  return <TaxonomyManager title="Categorías" endpoint="/admin/categories" noun="categoría" />;
}
