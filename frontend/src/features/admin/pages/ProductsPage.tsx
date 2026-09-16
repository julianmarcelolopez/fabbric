import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice, pesosToCents } from "../../../lib/money";
import { Loading } from "../components/Loading";
import { TaxonomyManager } from "../components/TaxonomyManager";
import { STATUS_LABELS, type ProductListItem, type ProductStatus, type Taxonomy } from "../types";
import { StockPage } from "./StockPage";

type SortOption = "name" | "price_asc" | "price_desc" | "recent";
const SORT_LABELS: Record<SortOption, string> = {
  name: "Nombre (A-Z)",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  recent: "Más recientes primero",
};

type Tab = "lista" | "categorias" | "colecciones" | "marcas" | "stock";
const TABS: { key: Tab; label: string }[] = [
  { key: "lista", label: "Todos los productos" },
  { key: "categorias", label: "Categorías" },
  { key: "colecciones", label: "Colecciones" },
  { key: "marcas", label: "Marcas" },
  { key: "stock", label: "Stock" },
];

function ProductsList() {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [brands, setBrands] = useState<Taxonomy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | ProductStatus>("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterVisible, setFilterVisible] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  // T32/xx — paginación client-side (misma lista ya cargada de una, sin tocar
  // el backend — igual criterio que search/filterCategory/filterStatus arriba).
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [prods, cats, brandList] = await Promise.all([
        apiJson<ProductListItem[]>("/admin/products"),
        apiJson<Taxonomy[]>("/admin/categories"),
        apiJson<Taxonomy[]>("/admin/brands"),
      ]);
      setProducts(prods);
      setCategories(cats);
      setBrands(brandList);
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

  // T32/xx — antes solo se podía publicar desde el wizard del producto (3
  // pasos); para un producto que ya tiene todo cargado (variantes, estado
  // activo) era una vuelta innecesaria solo para tildar "visible". Toggle
  // directo acá, mismo endpoint que usa el wizard (PATCH visibleInCatalog).
  async function toggleVisible(p: ProductListItem) {
    if (!p.visibleInCatalog && p.variantCount === 0) {
      setError(`"${p.name}" no tiene variantes todavía — agregá al menos una antes de hacerlo visible.`);
      return;
    }
    setError(null);
    try {
      await apiJson(`/admin/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ visibleInCatalog: !p.visibleInCatalog }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  // T32/xx — mismo criterio que toggleVisible: "Activo" es el estado que se
  // toca seguido (pausar/reactivar), así que se resuelve con un clic en vez
  // de abrir el wizard solo para eso. "Sin stock" queda afuera del toggle
  // (es un estado manual más raro, se sigue editando desde la ficha) — acá
  // alterna entre active y paused nomás; togglear un producto "sin stock"
  // lo pasa directo a active (reactivarlo es el caso de uso típico).
  async function toggleActive(p: ProductListItem) {
    setError(null);
    try {
      await apiJson(`/admin/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: p.status === "active" ? "paused" : "active" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function deleteProduct(p: ProductListItem) {
    if (!confirm(`¿Borrar el producto "${p.name}"? Esto borra también sus variantes, imágenes y stock.`)) return;
    setError(null);
    try {
      await apiJson(`/admin/products/${p.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  // Búsqueda y filtros: client-side sobre la lista ya cargada (T19/02) — sin tocar el backend.
  const visibleProducts = useMemo(() => {
    if (!products) return null;
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filterCategory && p.categoryId !== filterCategory) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterBrand && p.brandId !== filterBrand) return false;
      if (filterVisible && p.visibleInCatalog !== (filterVisible === "true")) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, search, filterCategory, filterStatus, filterBrand, filterVisible, sortBy]);

  // Volver a la página 1 cada vez que cambia lo que se está viendo — evita
  // quedar parado en una página vacía si el filtro nuevo tiene menos resultados.
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus, filterBrand, filterVisible, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil((visibleProducts?.length ?? 0) / pageSize));
  // Clamp — por si visibleProducts encoge por otra vía (borrar el último producto
  // de la página actual, por ejemplo) sin pasar por el effect de arriba.
  const safePage = Math.min(page, totalPages);
  const pageProducts = useMemo(
    () => visibleProducts?.slice((safePage - 1) * pageSize, safePage * pageSize) ?? null,
    [visibleProducts, safePage, pageSize]
  );

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
        <Loading />
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
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
              <option value="">Todas las marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select value={filterVisible} onChange={(e) => setFilterVisible(e.target.value as typeof filterVisible)}>
              <option value="">Visible: todos</option>
              <option value="true">Visible</option>
              <option value="false">Oculto</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
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
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Visible</th>
                  <th>Variantes</th>
                  <th>Colecciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageProducts?.map((p) => (
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
                    <td className="muted">{p.brandName ?? "—"}</td>
                    <td>{p.categoryName}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.status === "active"}
                        title={p.status === "active" ? "Activo — clic para pausar" : `${STATUS_LABELS[p.status]} — clic para activar`}
                        onChange={() => void toggleActive(p)}
                      />
                      {p.status === "out_of_stock" && (
                        <span className="badge" style={{ marginLeft: 6, color: "#92400e", background: "#fffbeb" }}>
                          sin stock
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={p.visibleInCatalog}
                        title={p.visibleInCatalog ? "Visible — clic para ocultar" : "Oculto — clic para hacer visible"}
                        onChange={() => void toggleVisible(p)}
                      />
                    </td>
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
                    <td>
                      <button className="btn small danger" onClick={() => void deleteProduct(p)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {visibleProducts && visibleProducts.length > 0 && (
            <div className="row" style={{ marginTop: 12, alignItems: "center", justifyContent: "space-between" }}>
              <label className="field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                Por página
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="row" style={{ alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn small"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  ← Anterior
                </button>
                <span className="muted">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  className="btn small"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Siguiente →
                </button>
              </div>
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

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`admin-tab${tab === t.key ? " active" : ""}`}
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
      {tab === "marcas" && (
        <TaxonomyManager title="Marcas" endpoint="/admin/brands" noun="marca" hideTitle />
      )}
      {tab === "stock" && <StockPage embedded />}
    </>
  );
}
