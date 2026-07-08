import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiJson } from "../../../lib/api";
import {
  MOVEMENT_TYPE_LABELS,
  type StockItem,
  type StockMovementRow,
  type StockOverview,
} from "../types";

type Expanded = { variantId: string; mode: "move" | "history" } | null;

function MoveForm({ item, onDone, onError }: { item: StockItem; onDone: () => void; onError: (m: string) => void }) {
  const [type, setType] = useState<"entrada" | "venta" | "ajuste">("entrada");
  const [channel, setChannel] = useState<"online" | "local">("online");
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState<"+" | "-">("+");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      onError("La cantidad debe ser un entero positivo");
      return;
    }
    // El signo lo deriva el tipo: entrada suma, venta resta, ajuste según selector
    const delta = type === "entrada" ? n : type === "venta" ? -n : sign === "+" ? n : -n;
    setSaving(true);
    try {
      await apiJson(`/admin/variants/${item.variantId}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ channel, type, delta, note: note.trim() || null }),
      });
      onDone();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="row" style={{ padding: "10px 0" }}>
      <label className="field">
        Tipo
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="entrada">Entrada (+)</option>
          <option value="venta">Venta (−)</option>
          <option value="ajuste">Ajuste (±)</option>
        </select>
      </label>
      <label className="field">
        Canal
        <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
          <option value="online">Online</option>
          <option value="local">Local</option>
        </select>
      </label>
      {type === "ajuste" && (
        <label className="field">
          Signo
          <select value={sign} onChange={(e) => setSign(e.target.value as typeof sign)}>
            <option value="+">+ sumar</option>
            <option value="-">− restar</option>
          </select>
        </label>
      )}
      <label className="field">
        Cantidad
        <input style={{ width: 80 }} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" required />
      </label>
      <label className="field" style={{ flex: 1, minWidth: 160 }}>
        Nota (opcional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </label>
      <button className="btn primary" type="submit" disabled={saving}>
        {saving ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}

function History({ variantId, onError }: { variantId: string; onError: (m: string) => void }) {
  const [movements, setMovements] = useState<StockMovementRow[] | null>(null);

  useEffect(() => {
    apiJson<StockMovementRow[]>(`/admin/variants/${variantId}/stock-movements`)
      .then(setMovements)
      .catch((err) => onError(err instanceof ApiError ? err.message : String(err)));
  }, [variantId, onError]);

  if (movements === null) return <p className="muted">Cargando historial…</p>;
  if (movements.length === 0) return <p className="muted">Sin movimientos todavía (el stock inicial del alta no genera movimiento).</p>;
  return (
    <table className="grid" style={{ margin: "8px 0" }}>
      <thead>
        <tr><th>Fecha</th><th>Tipo</th><th>Canal</th><th>Delta</th><th>Nota</th></tr>
      </thead>
      <tbody>
        {movements.map((m) => (
          <tr key={m.id}>
            <td className="muted">{new Date(m.createdAt).toLocaleString("es-AR")}</td>
            <td>{MOVEMENT_TYPE_LABELS[m.type]}</td>
            <td>{m.channel}</td>
            <td style={{ color: m.delta > 0 ? "#15803d" : "#b91c1c" }}>
              {m.delta > 0 ? `+${m.delta}` : m.delta}
            </td>
            <td className="muted">{m.note ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StockPage() {
  const [data, setData] = useState<StockOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [threshold, setThreshold] = useState("");

  const load = useCallback(async () => {
    try {
      const overview = await apiJson<StockOverview>("/admin/stock");
      setData(overview);
      setThreshold(String(overview.lowStockThreshold));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveThreshold(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(threshold);
    if (!Number.isInteger(n) || n < 0) {
      setError("El umbral debe ser un entero ≥ 0");
      return;
    }
    try {
      await apiJson("/admin/catalog-config/low-stock-threshold", {
        method: "PATCH",
        body: JSON.stringify({ lowStockThreshold: n }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  const items = data?.items.filter((i) => !onlyCritical || i.critical) ?? [];
  const criticalCount = data?.items.filter((i) => i.critical).length ?? 0;

  return (
    <>
      <h1>Stock</h1>

      <div className="card">
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <form onSubmit={saveThreshold} className="row" style={{ alignItems: "flex-end" }}>
            <label className="field">
              Umbral de stock crítico (online + local ≤)
              <input style={{ width: 80 }} value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" />
            </label>
            <button className="btn" type="submit">Guardar</button>
          </form>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={onlyCritical} onChange={(e) => setOnlyCritical(e.target.checked)} />
            Solo críticos ({criticalCount})
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {data === null ? (
        <p className="muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="muted">{onlyCritical ? "Sin variantes críticas 🎉" : "No hay variantes — creá productos con variantes primero."}</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Variante</th>
              <th>Online</th>
              <th>Local</th>
              <th>Total</th>
              <th></th>
              <th style={{ width: 170 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <>
                <tr key={item.variantId} className={item.critical ? "critical-row" : ""}>
                  <td>{item.productName}</td>
                  <td>{item.talle} / {item.color}{item.sku ? <span className="muted"> · {item.sku}</span> : null}</td>
                  <td>{item.stockOnline}</td>
                  <td>{item.stockLocal}</td>
                  <td><strong>{item.total}</strong></td>
                  <td>{item.critical && <span className="hs-warn">crítico</span>}</td>
                  <td>
                    <button
                      className="btn small"
                      onClick={() =>
                        setExpanded(
                          expanded?.variantId === item.variantId && expanded.mode === "move"
                            ? null
                            : { variantId: item.variantId, mode: "move" }
                        )
                      }
                    >
                      Mover
                    </button>{" "}
                    <button
                      className="btn small"
                      onClick={() =>
                        setExpanded(
                          expanded?.variantId === item.variantId && expanded.mode === "history"
                            ? null
                            : { variantId: item.variantId, mode: "history" }
                        )
                      }
                    >
                      Historial
                    </button>
                  </td>
                </tr>
                {expanded?.variantId === item.variantId && (
                  <tr key={`${item.variantId}-panel`}>
                    <td colSpan={7} style={{ background: "#f9fafb" }}>
                      {expanded.mode === "move" ? (
                        <MoveForm
                          item={item}
                          onDone={() => {
                            setExpanded(null);
                            void load();
                          }}
                          onError={setError}
                        />
                      ) : (
                        <History variantId={item.variantId} onError={setError} />
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
