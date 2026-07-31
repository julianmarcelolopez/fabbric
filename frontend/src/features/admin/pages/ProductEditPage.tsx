import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { centsToPesosInput, pesosToCents } from "../../../lib/money";
import { ProductDetailView } from "../../catalog/ProductDetailView";
import { ImageDropzone } from "../components/ImageDropzone";
import { VariantEditor } from "../components/VariantEditor";
import {
  STATUS_LABELS,
  SUGGESTED_BRANDS,
  type ProductDetail,
  type ProductStatus,
  type Taxonomy,
} from "../types";

// T19/08 — alta de producto en pasos guiados (Datos básicos → Variantes → Fotos).
// "Guardado por paso" (Opción A, decisión del usuario): cada "Siguiente" persiste
// lo que corresponde a ese paso — nada queda solo en memoria del navegador. El
// producto nace oculto (ver ProductsPage.create) y recién "Guardar y publicar"
// en el paso 3 lo hace visible — si el admin cierra a mitad de camino, el
// producto queda como borrador, no aparece en la tienda.

type Step = 1 | 2 | 3;

type Form = {
  name: string;
  description: string;
  price: string;
  costPrice: string;
  compareAtPrice: string;
  brand: string;
  categoryId: string;
  status: ProductStatus;
  collectionIds: string[];
};

type WizardStepsProps = {
  step: Step;
  hasVariant: boolean;
  published: boolean;
  onGoto: (step: Step) => void;
};

function WizardSteps({ step, hasVariant, published, onGoto }: WizardStepsProps) {
  const steps: { n: Step; label: string; done: boolean }[] = [
    { n: 1, label: "Datos básicos", done: step > 1 },
    { n: 2, label: "Variantes", done: hasVariant },
    { n: 3, label: "Fotos", done: published },
  ];
  return (
    <div className="wizard-steps">
      {steps.map((s, i) => {
        // Solo se puede saltar a un paso ya visitado/completo — no adelantarse
        // salteando un paso pendiente.
        const reachable = s.n <= step || s.done;
        return (
          <Fragment key={s.n}>
            {i > 0 && <span className={`wizard-line${steps[i - 1].done ? " done" : ""}`} />}
            <button
              type="button"
              className="wizard-step"
              disabled={!reachable}
              onClick={() => onGoto(s.n)}
            >
              <span className={`wizard-circle${s.done ? " done" : step === s.n ? " active" : ""}`}>
                {s.done ? "✓" : s.n}
              </span>
              <span className={`wizard-label${step === s.n ? " active" : ""}`}>{s.label}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
          compareAtPrice: centsToPesosInput(detail.compareAtPrice),
          brand: detail.brand ?? "",
          categoryId: detail.categoryId,
          status: detail.status,
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

  function goToStep(next: Step) {
    setStep(next);
    setError(null);
  }

  async function saveStep1(e: FormEvent) {
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
    const compareAtPrice = form.compareAtPrice.trim() === "" ? null : pesosToCents(form.compareAtPrice);
    if (form.compareAtPrice.trim() !== "" && compareAtPrice === null) {
      setError("Precio anterior inválido");
      return;
    }
    // El schema exige min(1): un campo vacío se manda como null, nunca ""
    const brand = form.brand.trim() === "" ? null : form.brand.trim();
    setSaving(true);
    try {
      await apiJson(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price,
          costPrice,
          compareAtPrice,
          brand,
          categoryId: form.categoryId,
          status: form.status,
        }),
      });
      await apiJson(`/admin/products/${id}/collections`, {
        method: "PUT",
        body: JSON.stringify({ collectionIds: form.collectionIds }),
      });
      setSaved(true);
      await load();
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function goToStep3() {
    if (!product || product.variants.length === 0) {
      setError("Agregá al menos una variante antes de continuar.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function publish() {
    if (!id) return;
    setError(null);
    setPublishing(true);
    try {
      await apiJson(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ visibleInCatalog: true }),
      });
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setPublishing(false);
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
  // Visible en los 3 pasos, no solo en el de datos básicos.
  const previewPrice = pesosToCents(form.price) ?? product.price;
  const previewCompareAtPrice =
    form.compareAtPrice.trim() === "" ? null : pesosToCents(form.compareAtPrice);
  const hasVariant = product.variants.length > 0;

  return (
    <>
      <p>
        <Link to="/admin/products">← Productos</Link>
      </p>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{product.name}</h1>
        {!product.visibleInCatalog && <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>Borrador</span>}
      </div>

      <WizardSteps step={step} hasVariant={hasVariant} published={product.visibleInCatalog} onGoto={goToStep} />

      <div className="editor-split">
        <div>
          {step === 1 && (
            <form onSubmit={saveStep1} className="card">
              <h2>Datos del producto</h2>
              <div className="row" style={{ marginBottom: 12 }}>
                <label className="field" style={{ flex: 2, minWidth: 220 }}>
                  Nombre
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label className="field">
                  Marca
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    list="product-suggested-brands"
                    maxLength={60}
                    placeholder="opcional"
                  />
                  <datalist id="product-suggested-brands">
                    {SUGGESTED_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
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
                <label className="field">
                  Precio anterior ($)
                  <input
                    style={{ width: 110 }}
                    value={form.compareAtPrice}
                    onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                    placeholder="opcional, para mostrar tachado"
                    inputMode="decimal"
                  />
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
                {saving ? "Guardando…" : "Siguiente: Variantes →"}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="card">
              <h2>Variantes (talle / color)</h2>
              {!hasVariant && (
                <div className="alert-warning">
                  ⚠️ Sin al menos una variante, tus clientes no van a poder agregar el producto al carrito.
                </div>
              )}
              <VariantEditor productId={product.id} variants={product.variants} onChange={() => void load()} />
              {error && <p className="error">{error}</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => goToStep(1)}>
                  ← Atrás
                </button>
                <button type="button" className="btn primary" onClick={goToStep3}>
                  Siguiente: Fotos →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <h2>Fotos</h2>
              <ImageDropzone productId={product.id} images={product.images} onChange={() => void load()} />
              {error && <p className="error">{error}</p>}
              {saved && product.visibleInCatalog && <p className="success">Publicado ✓ — ya está visible en tu tienda.</p>}
              <div className="row" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => goToStep(2)}>
                  ← Atrás
                </button>
                <button type="button" className="btn primary" disabled={publishing} onClick={() => void publish()}>
                  {publishing ? "Publicando…" : product.visibleInCatalog ? "Guardado — visible en la tienda ✓" : "Guardar y publicar →"}
                </button>
              </div>
            </div>
          )}
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
            compareAtPrice={previewCompareAtPrice}
            brand={form.brand.trim() === "" ? null : form.brand}
            images={product.images}
            variants={product.variants}
          />
        </aside>
      </div>
    </>
  );
}
