import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { centsToPesosInput, pesosToCents } from "../../../lib/money";
import type { Variant } from "../types";

type Props = {
  productId: string;
  variants: Variant[];
  onChange: () => void;
};

function VariantRow({ variant, onChange, onError }: { variant: Variant; onChange: () => void; onError: (m: string) => void }) {
  const [talle, setTalle] = useState(variant.talle);
  const [color, setColor] = useState(variant.color);
  const [sku, setSku] = useState(variant.sku ?? "");
  const [priceOverride, setPriceOverride] = useState(centsToPesosInput(variant.priceOverride));

  const dirty =
    talle !== variant.talle ||
    color !== variant.color ||
    sku !== (variant.sku ?? "") ||
    priceOverride !== centsToPesosInput(variant.priceOverride);

  async function save() {
    const override = priceOverride.trim() === "" ? null : pesosToCents(priceOverride);
    if (priceOverride.trim() !== "" && override === null) {
      onError("Precio override inválido");
      return;
    }
    try {
      // Stock: solo-lectura desde T4 — se mueve por /admin/stock (movimientos)
      await apiJson(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          talle,
          color,
          sku: sku.trim() === "" ? null : sku,
          priceOverride: override,
        }),
      });
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function remove() {
    if (!confirm(`¿Borrar la variante ${variant.talle}/${variant.color}?`)) return;
    try {
      await apiJson(`/admin/variants/${variant.id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <tr>
      <td><input style={{ width: 64 }} value={talle} onChange={(e) => setTalle(e.target.value)} /></td>
      <td><input style={{ width: 96 }} value={color} onChange={(e) => setColor(e.target.value)} /></td>
      <td><input style={{ width: 96 }} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="—" /></td>
      <td title="El stock se mueve desde la página Stock">{variant.stockOnline}</td>
      <td title="El stock se mueve desde la página Stock">{variant.stockLocal}</td>
      <td><input style={{ width: 96 }} value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} placeholder="base" inputMode="decimal" /></td>
      <td>
        <button className="btn small primary" disabled={!dirty} onClick={save}>Guardar</button>{" "}
        <button className="btn small danger" onClick={remove}>Borrar</button>
      </td>
    </tr>
  );
}

export function VariantEditor({ productId, variants, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [talle, setTalle] = useState("");
  const [color, setColor] = useState("");
  const [stockOnline, setStockOnline] = useState("0");
  const [stockLocal, setStockLocal] = useState("0");

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiJson(`/admin/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          talle,
          color,
          stockOnline: Number(stockOnline) || 0,
          stockLocal: Number(stockLocal) || 0,
        }),
      });
      setTalle("");
      setColor("");
      setStockOnline("0");
      setStockLocal("0");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <div className="card">
      <h2>Variantes (talle / color)</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        El stock se gestiona con movimientos desde <Link to="/admin/stock">Stock</Link> — acá es
        solo lectura (el alta de una variante nueva sí acepta stock inicial).
      </p>
      {error && <p className="error">{error}</p>}
      {variants.length > 0 && (
        <table className="grid" style={{ marginBottom: 12 }}>
          <thead>
            <tr>
              <th>Talle</th>
              <th>Color</th>
              <th>SKU</th>
              <th>Stock online</th>
              <th>Stock local</th>
              <th>Precio override ($)</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <VariantRow key={v.id} variant={v} onChange={onChange} onError={setError} />
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={add} className="row">
        <label className="field">
          Talle
          <input style={{ width: 64 }} value={talle} onChange={(e) => setTalle(e.target.value)} required />
        </label>
        <label className="field">
          Color
          <input style={{ width: 96 }} value={color} onChange={(e) => setColor(e.target.value)} required />
        </label>
        <label className="field">
          Stock online
          <input style={{ width: 72 }} value={stockOnline} onChange={(e) => setStockOnline(e.target.value)} inputMode="numeric" />
        </label>
        <label className="field">
          Stock local
          <input style={{ width: 72 }} value={stockLocal} onChange={(e) => setStockLocal(e.target.value)} inputMode="numeric" />
        </label>
        <button className="btn primary" type="submit">Agregar variante</button>
      </form>
    </div>
  );
}
