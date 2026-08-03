import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { pesosToCents } from "../../../lib/money";
import { colorSwatchStyle } from "../../catalog/colorSwatch";
import { ProductCard } from "../../catalog/ProductCard";
import type { PublicCategoryProducts, PublicCollectionProducts, StoreContext } from "../types";

// T20/05 — rediseño visual de la página que ya existía desde T19/10. Mismo
// fetch/paginación de siempre, layout nuevo (banner + toolbar + grilla +
// paginación numerada).
//
// T21/02 — mode="collection": mismo componente para /c/:categorySlug y
// /col/:collectionSlug (decisión del usuario, evita duplicar un layout que
// ya funciona) — elige el endpoint y los textos según el modo.
//
// T21/05 — sidebar de filtros (talle/color/marca/precio) y sort real,
// conectados al endpoint extendido. Decisiones del usuario (ver Resultado en
// docs/T21_Admin-Configurable/tareas/05-filtros-categoria-backend.md):
// - Filtros de un solo valor a la vez (el backend acepta un talle/color/marca
//   por request, no listas) — se implementan como selección única, no
//   checkboxes multi-select como sugiere el mockup (sería una UI que promete
//   algo que el backend no hace).
// - "Más vendidos" omitido del sort — sin fuente de datos razonable.
// - Los cambios de filtro se debouncean 300ms antes de tocar la URL/el fetch.

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Orden sugerido" },
  { value: "precio_asc", label: "Menor precio" },
  { value: "precio_desc", label: "Mayor precio" },
  { value: "nuevos", label: "Más nuevos" },
];

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

  // Filtros aplicados de verdad (los que ya están en la URL → los que se
  // usan para el fetch). Los "draft" de abajo son lo que el usuario está
  // tocando, con debounce antes de convertirse en esto.
  const appliedTalle = searchParams.get("talle") ?? "";
  const appliedColor = searchParams.get("color") ?? "";
  const appliedMarca = searchParams.get("marca") ?? "";
  const appliedPrecioMin = searchParams.get("precioMin") ?? "";
  const appliedPrecioMax = searchParams.get("precioMax") ?? "";
  const appliedSort = searchParams.get("sort") ?? "";

  const [talle, setTalle] = useState(appliedTalle);
  const [color, setColor] = useState(appliedColor);
  const [marca, setMarca] = useState(appliedMarca);
  const [precioMin, setPrecioMin] = useState(appliedPrecioMin);
  const [precioMax, setPrecioMax] = useState(appliedPrecioMax);
  const [sort, setSort] = useState(appliedSort);

  const [data, setData] = useState<PublicCategoryProducts | PublicCollectionProducts | null>(null);
  const [error, setError] = useState<string | null>(null);
  // T21/08 — separado de `data`: antes cada refetch (ej. al tipear un precio)
  // vaciaba `data`, lo que desmontaba TODA la página (sidebar de filtros
  // incluida) y el input perdía el foco a mitad de escritura. Ahora `data`
  // conserva lo último cargado mientras llega lo nuevo; `loading` solo atenúa
  // la grilla.
  const [loading, setLoading] = useState(false);

  // Al cambiar de categoría/colección, los filtros no tienen sentido que
  // sigan aplicados — se limpian tanto el draft como la URL. Acá sí se resetea
  // `data` (a diferencia del efecto de fetch de abajo): es una categoría
  // distinta de verdad, no un refetch por filtro — mostrar "Cargando…" es lo
  // correcto, no hay nada de la anterior que tenga sentido seguir mostrando.
  const didMountFilters = useRef(false);
  useEffect(() => {
    setTalle("");
    setColor("");
    setMarca("");
    setPrecioMin("");
    setPrecioMax("");
    setSort("");
    setData(null);
  }, [mode, itemSlug]);

  // Debounce: 300ms después del último cambio de filtro, recién ahí se
  // actualiza la URL (y con eso, el fetch de abajo) — evita un request por
  // cada click cuando se combinan varios filtros rápido.
  useEffect(() => {
    if (!didMountFilters.current) {
      didMountFilters.current = true;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams();
      next.set("page", "1");
      if (talle) next.set("talle", talle);
      if (color) next.set("color", color);
      if (marca) next.set("marca", marca);
      if (precioMin) next.set("precioMin", precioMin);
      if (precioMax) next.set("precioMax", precioMax);
      if (sort) next.set("sort", sort);
      setSearchParams(next);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talle, color, marca, precioMin, precioMax, sort]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (appliedTalle) params.set("talle", appliedTalle);
    if (appliedColor) params.set("color", appliedColor);
    if (appliedMarca) params.set("marca", appliedMarca);
    // La URL guarda pesos (legible: precioMin=16000) — la API espera centavos
    // (products.price está en centavos), así que la conversión pasa acá, justo
    // antes del fetch. Bug real encontrado: antes se mandaba el valor de la URL
    // tal cual, sin convertir, y el filtro comparaba pesos contra centavos.
    const precioMinCents = pesosToCents(appliedPrecioMin);
    if (precioMinCents !== null) params.set("precioMin", String(precioMinCents));
    const precioMaxCents = pesosToCents(appliedPrecioMax);
    if (precioMaxCents !== null) params.set("precioMax", String(precioMaxCents));
    if (appliedSort) params.set("sort", appliedSort);
    const path =
      mode === "collection"
        ? `/public/${slug}/collections/${itemSlug}/products?${params}`
        : `/public/${slug}/categories/${itemSlug}/products?${params}`;
    publicJson<PublicCategoryProducts | PublicCollectionProducts>(path)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
        setLoading(false);
      });
  }, [slug, mode, itemSlug, page, appliedTalle, appliedColor, appliedMarca, appliedPrecioMin, appliedPrecioMax, appliedSort]);

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
  const hasActiveFilters = !!(talle || color || marca || precioMin || precioMax);

  function goToPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  }

  function clearFilters() {
    setTalle("");
    setColor("");
    setMarca("");
    setPrecioMin("");
    setPrecioMax("");
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
            <span className="breadcrumb-current">{item.name}</span>
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
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="content">
        <div className="main-layout">
          <aside className="filters-sidebar">
            {data.availableFilters.talles.length > 0 && (
              <div className="filter-group">
                <div className="filter-group-title">Talle</div>
                <div className="talle-options">
                  {data.availableFilters.talles.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={t === talle ? "talle-chip active" : "talle-chip"}
                      onClick={() => setTalle(t === talle ? "" : t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data.availableFilters.colores.length > 0 && (
              <div className="filter-group">
                <div className="filter-group-title">Color</div>
                <div className="color-options">
                  {data.availableFilters.colores.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={c === color ? "color-dot active" : "color-dot"}
                      style={colorSwatchStyle(c)}
                      title={c}
                      onClick={() => setColor(c === color ? "" : c)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="filter-group">
              <div className="filter-group-title">Precio</div>
              <div className="price-range">
                <div className="price-inputs">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="price-input"
                    placeholder="Mín"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                  />
                  <span className="price-sep">—</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="price-input"
                    placeholder="Máx"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {data.availableFilters.marcas.length > 0 && (
              <div className="filter-group">
                <div className="filter-group-title">Marca</div>
                {/* T21/05: selección única (el backend acepta una sola marca por
                    request) — chips en vez de checkboxes, para no sugerir que
                    se puede elegir más de una. */}
                <div className="checkbox-options">
                  {data.availableFilters.marcas.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={m === marca ? "marca-chip active" : "marca-chip"}
                      onClick={() => setMarca(m === marca ? "" : m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <span className="clear-filters" onClick={clearFilters}>
                Limpiar filtros
              </span>
            )}
          </aside>

          <div className="products-area" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {data.products.length === 0 ? (
              <p className="category-page-empty">
                {hasActiveFilters
                  ? "Ningún producto coincide con estos filtros."
                  : `Todavía no hay productos en ${mode === "collection" ? "esta colección" : "esta categoría"}.`}
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
      </div>
    </div>
  );
}
