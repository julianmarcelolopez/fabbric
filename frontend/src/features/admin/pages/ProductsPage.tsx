import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice, pesosToCents } from "../../../lib/money";
import { STATUS_LABELS, type ProductListItem, type Taxonomy } from "../types";

export function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
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
      const row = await apiJson<{ id: string }>("/admin/products", {
        method: "POST",
        body: JSON.stringify({ name, categoryId, price: cents }),
      });
      navigate(`/admin/products/${row.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <>
      <h1>Productos</h1>

      <div className="card">
        <h2>Nuevo producto</h2>
        {categories.length === 0 ? (
          <p className="muted">
            Primero creá al menos una <Link to="/admin/categories">categoría</Link>.
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
            {products.map((p) => (
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
                <td>{p.variantCount}</td>
                <td>
                  {p.collections.map((c) => (
                    <span key={c.id} className="badge">{c.name}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
