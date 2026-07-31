import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { ProductCard } from "../../catalog/ProductCard";
import type { PublicCategoryProducts, StoreContext } from "../types";

// T19/10 — "Ver todos" de una sección del home con más de 8 productos.
// Paginada (sin buscador por texto, fuera de alcance de esta tarea).
export function CategoryPage() {
  const { slug } = useOutletContext<StoreContext>();
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [data, setData] = useState<PublicCategoryProducts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    publicJson<PublicCategoryProducts>(`/public/${slug}/categories/${categorySlug}/products?page=${page}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug, categorySlug, page]);

  if (error) {
    return (
      <div className="store-message">
        <h1>No encontramos esta categoría</h1>
        <p>
          <Link to={`/store/${slug}`}>← Volver a la tienda</Link>
        </p>
      </div>
    );
  }
  if (data === null) return <p className="store-message">Cargando…</p>;

  return (
    <div className="category-page">
      <p className="store-back">
        <Link to={`/store/${slug}`}>← Volver a la tienda</Link>
      </p>
      <h1 className="hsr-title">{data.category.name}</h1>

      {data.products.length === 0 ? (
        <p className="category-page-empty">Todavía no hay productos en esta categoría.</p>
      ) : (
        <div className="hsr-grid">
          {data.products.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              price={p.price}
              compareAtPrice={p.compareAtPrice}
              brand={p.brand}
              imageUrl={p.imageUrl}
              onClick={() => navigate(`/store/${slug}/p/${p.id}`)}
            />
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="hsr-pagination">
          <button
            type="button"
            className="store-auth-btn"
            disabled={page <= 1}
            onClick={() => setSearchParams({ page: String(page - 1) })}
          >
            ← Anterior
          </button>
          <span className="category-page-pagelabel">
            Página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            className="store-auth-btn"
            disabled={page >= data.totalPages}
            onClick={() => setSearchParams({ page: String(page + 1) })}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
