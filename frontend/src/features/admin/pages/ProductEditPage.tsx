import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { centsToPesosInput, pesosToCents } from "../../../lib/money";
import { ProductDetailView } from "../../catalog/ProductDetailView";
import { ImageDropzone } from "../components/ImageDropzone";
import { VariantEditor } from "../components/VariantEditor";
import { STATUS_LABELS, type ProductDetail, type ProductStatus, type Taxonomy } from "../types";

type Form = {
  name: string;
  description: string;
  price: string;
  costPrice: string;
  categoryId: string;
  status: ProductStatus;
  visibleInCatalog: boolean;
  collectionIds: string[];
};

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, cats, cols] = await Promise.all([
        apiJson<ProductDetail>(`/admin/products/${id}`),
        apiJson<Taxonomy[]>("/admin/categories"),
        apiJson<Taxonomy[]>("/admin/collections"),
      ]);
      setProduct(detail);
      setCategories(cats);
      setCollections(cols);
      // El form solo se inicializa la primera vez — los reloads (variantes/imágenes)
      // no pisan lo que el usuario está tipeando
      setForm((prev) =>
        prev ?? {
          name: detail.name,
          description: detail.description,
          price: centsToPesosInput(detail.price),
          costPrice: centsToPesosInput(detail.costPrice),
          categoryId: detail.categoryId,
          status: detail.status,
          visibleInCatalog: detail.visibleInCatalog,
          collectionIds: detail.collections.map((c) => c.id),
        }
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    setError(null);
    setSaved(false);
    const price = pesosToCents(form.price);
    if (price === null) {
      setError("Precio inválido");
      return;
    }
    const costPrice = form.costPrice.trim() === "" ? null : pesosToCents(form.costPrice);
    if (form.costPrice.trim() !== "" && costPrice === null) {
      setError("Costo inválido");
      return;
    }
    setSaving(true);
    try {
      await apiJson(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price,
          costPrice,
          categoryId: form.categoryId,
          status: form.status,
          visibleInCatalog: form.visibleInCatalog,
        }),
      });
      await apiJson(`/admin/products/${id}/collections`, {
        method: "PUT",
        body: JSON.stringify({ collectionIds: form.collectionIds }),
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (error && !product) {
    return (
      <>
        <h1>Producto</h1>
        <p className="error">{error}</p>
        <Link to="/admin/products">← Volver a productos</Link>
      </>
    );
  }
  if (!product || !form) return <p className="muted">Cargando…</p>;

  // Preview en vivo: alimentado por el ESTADO DEL FORMULARIO, no por la API —
  // cada tecla se refleja al instante, sin guardar primero (patrón Bordart).
  const previewPrice = pesosToCents(form.price) ?? product.price;

  return (
    <>
      <p>
        <Link to="/admin/products">← Productos</Link>
      </p>
      <h1>{product.name}</h1>

      <div className="editor-split">
        <div>
      <form onSubmit={save} className="card">
        <h2>Datos del producto</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="field" style={{ flex: 2, minWidth: 220 }}>
            Nombre
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="field">
            Categoría
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Estado
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="field">
            Precio ($)
            <input
              style={{ width: 110 }}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
              inputMode="decimal"
            />
          </label>
          <label className="field">
            Costo interno ($)
            <input
              style={{ width: 110 }}
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              placeholder="—"
              inputMode="decimal"
            />
          </label>
          <label className="field" style={{ flexDirection: "row", alignItems: "center", display: "flex", gap: 6 }}>
            <input
              type="checkbox"
              checked={form.visibleInCatalog}
              onChange={(e) => setForm({ ...form, visibleInCatalog: e.target.checked })}
            />
            Visible en catálogo
          </label>
        </div>
        <label className="field" style={{ marginBottom: 12 }}>
          Descripción
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <div className="field" style={{ marginBottom: 12 }}>
          Colecciones
          <div className="row" style={{ alignItems: "center" }}>
            {collections.length === 0 && (
              <span className="muted">No hay colecciones — creá alguna en el menú.</span>
            )}
            {collections.map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={form.collectionIds.includes(c.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      collectionIds: e.target.checked
                        ? [...form.collectionIds, c.id]
                        : form.collectionIds.filter((x) => x !== c.id),
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Guardado ✓</p>}
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <VariantEditor productId={product.id} variants={product.variants} onChange={() => void load()} />
      <ImageDropzone productId={product.id} images={product.images} onChange={() => void load()} />
        </div>

        <aside className="preview-pane">
          <h2>Vista previa</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Así se ve en la tienda — se actualiza mientras editás, sin guardar.
          </p>
          <ProductDetailView
            name={form.name}
            description={form.description}
            price={previewPrice}
            images={product.images}
            variants={product.variants}
          />
        </aside>
      </div>
    </>
  );
}
