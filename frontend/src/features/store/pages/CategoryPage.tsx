import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { ProductCard } from "../../catalog/ProductCard";
import type { PublicCategoryProducts, PublicCollectionProducts, StoreContext } from "../types";

// T20/05 — rediseño visual de la página que ya existía desde T19/10. Mismo
// fetch/paginación de siempre, layout nuevo (banner + toolbar + grilla +
// paginación numerada). Decisiones del usuario (ver Resultado en
// docs/T20_UX-Store/tareas/05-pagina-categoria.md):
// - Sidebar de filtros del mockup: omitida en V1 (requeriría extender el
//   endpoint de T19/10 con parámetros de filtro — cambio de backend, fuera
//   de alcance de T20).
// - Select de orden: solo visual, deshabilitado — mejor que un sort
//   client-side que solo actuaría sobre la página ya cargada.
// - Talles disponibles on-hover en la card: omitido, el endpoint no trae
//   variantes por producto.
//
// T21/02 — mode="collection": mismo componente para /c/:categorySlug y
// /col/:collectionSlug (decisión del usuario, evita duplicar un layout que
// ya funciona) — elige el endpoint y los textos según el modo, todo lo demás
// (banner, toolbar, grilla, paginación) es idéntico.

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

type Props = { mode?: "category" | "collection" };

export function CategoryPage({ mode = "category" }: Props) {
  const { slug } = useOutletContext<StoreContext>();
  const { categorySlug, collectionSlug } = useParams<{ categorySlug?: string; collectionSlug?: string }>();
  const itemSlug = mode === "collection" ? collectionSlug : categorySlug;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [data, setData] = useState<PublicCategoryProducts | PublicCollectionProducts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    const path =
      mode === "collection"
        ? `/public/${slug}/collections/${itemSlug}/products?page=${page}`
        : `/public/${slug}/categories/${itemSlug}/products?page=${page}`;
    publicJson<PublicCategoryProducts | PublicCollectionProducts>(path)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug, mode, itemSlug, page]);

  if (error) {
    return (
      <div className="store-message">
        <h1>No encontramos {mode === "collection" ? "esta colección" : "esta categoría"}</h1>
        <p>
          <Link to={`/store/${slug}`}>← Volver a la tienda</Link>
        </p>
      </div>
    );
  }
  if (data === null) return <p className="store-message">Cargando…</p>;

  const item = "collection" in data ? data.collection : data.category;

  function goToPage(p: number) {
    setSearchParams({ page: String(p) });
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="category-page">
      <div className="cat-banner">
        <div className="cat-banner-content">
          <div className="breadcrumb">
            <Link to={`/store/${slug}`}>Inicio</Link>
            <span className="breadcrumb-sep">›</span>
            <Link to={`/store/${slug}/categorias`}>{mode === "collection" ? "Colecciones" : "Categorías"}</Link>
            <span className="breadcrumb-sep">›</span>
            <span>{item.name}</span>
          </div>
          <h1 className="cat-banner-title">{item.name}</h1>
          <p className="cat-banner-sub">
            {data.totalCount} producto{data.totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-inner">
          <span className="result-count">
            {data.totalCount} producto{data.totalCount === 1 ? "" : "s"}
          </span>
          {/* T20/05: solo visual — ordenar de verdad requiere que el endpoint
              acepte un parámetro de sort, fuera de alcance de T20 (ver Resultado). */}
          <select className="sort-select" disabled title="Ordenar (próximamente)">
            <option>Orden sugerido</option>
          </select>
        </div>
      </div>

      <div className="content">
        {data.products.length === 0 ? (
          <p className="category-page-empty">
            Todavía no hay productos en {mode === "collection" ? "esta colección" : "esta categoría"}.
          </p>
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
          <div className="pagination">
            <button
              type="button"
              className="page-btn arrow"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Página anterior"
            >
              ‹
            </button>
            {pageNumbers(page, data.totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={n === page ? "page-btn active" : "page-btn"}
                  disabled={n === page}
                  onClick={() => goToPage(n)}
                >
                  {n}
                </button>
              )
            )}
            <button
              type="button"
              className="page-btn arrow"
              disabled={page >= data.totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
