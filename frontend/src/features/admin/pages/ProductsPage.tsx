import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice, pesosToCents } from "../../../lib/money";
import { TaxonomyManager } from "../components/TaxonomyManager";
import { STATUS_LABELS, type ProductListItem, type ProductStatus, type Taxonomy } from "../types";
import { StockPage } from "./StockPage";

type Tab = "lista" | "categorias" | "colecciones" | "stock";
const TABS: { key: Tab; label: string }[] = [
  { key: "lista", label: "Todos los productos" },
  { key: "categorias", label: "Categorías" },
  { key: "colecciones", label: "Colecciones" },
  { key: "stock", label: "Stock" },
];

function ProductsList() {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | ProductStatus>("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        apiJson<ProductListItem[]>("/admin/products"),
        apiJson<Taxonomy[]>("/admin/categories"),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = pesosToCents(price);
    if (cents === null) {
      setError("Precio inválido");
      return;
    }
    try {
      // T19/08: nace como borrador (no visible) — recién se publica al terminar
      // el wizard de 3 pasos en la ficha del producto ("Guardar y publicar").
      const row = await apiJson<{ id: string }>("/admin/products", {
        method: "POST",
        body: JSON.stringify({ name, categoryId, price: cents, visibleInCatalog: false }),
      });
      navigate(`/admin/products/${row.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  // Búsqueda y filtros: client-side sobre la lista ya cargada (T19/02) — sin tocar el backend.
  const visibleProducts = useMemo(() => {
    if (!products) return null;
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filterCategory && p.categoryId !== filterCategory) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [products, search, filterCategory, filterStatus]);

  return (
    <>
      <div className="card">
        <h2>Nuevo producto</h2>
        {categories.length === 0 ? (
          <p className="muted">
            Primero creá al menos una <Link to="/admin/products?tab=categorias">categoría</Link>.
          </p>
        ) : (
          <form onSubmit={create} className="row">
            <label className="field">
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              Categoría
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Elegir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Precio ($)
              <input value={price} onChange={(e) => setPrice(e.target.value)} required inputMode="decimal" />
            </label>
            <button className="btn primary" type="submit">Crear y editar</button>
          </form>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {products === null ? (
        <p className="muted">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="muted">Todavía no hay productos.</p>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
            <input
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Buscar producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {visibleProducts?.length === 0 ? (
            <p className="muted">Sin productos que coincidan con la búsqueda.</p>
          ) : (
            <div className="table-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th></th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Visible</th>
                  <th>Variantes</th>
                  <th>Colecciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts?.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.firstImageUrl ? (
                        <img className="thumb" src={p.firstImageUrl} alt="" />
                      ) : (
                        <span className="thumb" />
                      )}
                    </td>
                    <td>
                      <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>{p.categoryName}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{STATUS_LABELS[p.status]}</td>
                    <td>{p.visibleInCatalog ? "Sí" : "No"}</td>
                    <td>
                      {p.variantCount}
                      {p.variantCount === 0 && (
                        <span className="badge" style={{ marginLeft: 6, color: "#92400e", background: "#fffbeb" }}>
                          sin variantes
                        </span>
                      )}
                    </td>
                    <td>
                      {p.collections.map((c) => (
                        <span key={c.id} className="badge">{c.name}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "lista";

  function setTab(next: Tab) {
    setSearchParams(next === "lista" ? {} : { tab: next });
  }

  return (
    <>
      <h1>Productos</h1>

      <div className="row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn${tab === t.key ? " primary" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lista" && <ProductsList />}
      {tab === "categorias" && (
        <TaxonomyManager title="Categorías" endpoint="/admin/categories" noun="categoría" hideTitle />
      )}
      {tab === "colecciones" && (
        <TaxonomyManager title="Colecciones" endpoint="/admin/collections" noun="colección" hideTitle />
      )}
      {tab === "stock" && <StockPage embedded />}
    </>
  );
}
