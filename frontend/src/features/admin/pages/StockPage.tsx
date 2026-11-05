import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, apiJson } from "../../../lib/api";
import { Loading } from "../components/Loading";
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
    <form onSubmit={submit} className="row">
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

  if (movements === null) return <Loading label="Cargando historial…" />;
  if (movements.length === 0) return <p className="muted">Sin movimientos todavía (el stock inicial del alta no genera movimiento).</p>;
  return (
    <div className="table-scroll" style={{ margin: "8px 0" }}>
    <table className="grid">
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
    </div>
  );
}

type Props = {
  /** true cuando se embebe como tab de Productos (T19) — evita un <h1> duplicado */
  embedded?: boolean;
};

export function StockPage({ embedded }: Props = {}) {
  const [data, setData] = useState<StockOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [expanded, setExpanded] = useState<Expanded>(null);
  const [threshold, setThreshold] = useState("");
  // T39 — buscador (nombre/marca/código de barras) + paginación, mismo
  // patrón que ProductsPage.tsx: antes las 763 variantes se renderizaban
  // todas juntas, sin forma de encontrar una puntual.
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const criticalCount = data?.items.filter((i) => i.critical).length ?? 0;
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter((i) => {
      if (onlyCritical && !i.critical) return false;
      if (!q) return true;
      return (
        i.productName.toLowerCase().includes(q) ||
        (i.brandName?.toLowerCase().includes(q) ?? false) ||
        (i.barcode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data, onlyCritical, search]);

  useEffect(() => {
    setPage(1);
    setExpanded(null);
  }, [search, onlyCritical, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = useMemo(
    () => filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredItems, safePage, pageSize]
  );

  return (
    <>
      {!embedded && <h1>Stock</h1>}

      <div className="dash-grid dash-grid-stats" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Variantes críticas</div>
          <div className="stat-card-value">{criticalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Umbral crítico (online + local ≤)</div>
          <form onSubmit={saveThreshold} className="row" style={{ marginTop: 4 }}>
            <input style={{ width: 60 }} value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" />
            <button className="btn small" type="submit">Guardar</button>
          </form>
        </div>
        <label className="stat-card" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={onlyCritical} onChange={(e) => setOnlyCritical(e.target.checked)} />
          <span>Solo críticos ({criticalCount})</span>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {data !== null && data.items.length > 0 && (
        <input
          style={{ marginBottom: 12, maxWidth: 360 }}
          placeholder="Buscar por nombre, marca o código de barras…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {data === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <p className="muted">
          {search.trim()
            ? "Sin resultados para esa búsqueda."
            : onlyCritical
              ? "Sin variantes críticas 🎉"
              : "No hay variantes — creá productos con variantes primero."}
        </p>
      ) : (
        <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th>Producto</th>
              <th>Marca</th>
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
                  <td>
                    {item.firstImageUrl ? (
                      <img className="thumb" src={item.firstImageUrl} alt="" />
                    ) : (
                      <span className="thumb" />
                    )}
                  </td>
                  <td>{item.productName}</td>
                  <td className="muted">{item.brandName ?? "—"}</td>
                  <td>
                    {item.talle}{item.color ? ` / ${item.color}` : ""}
                    {item.sku ? <span className="muted"> · {item.sku}</span> : null}
                    {item.barcode ? <span className="muted"> · {item.barcode}</span> : null}
                  </td>
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
                    <td colSpan={9} style={{ background: "#F8F7F5" }}>
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
        </div>
      )}

      {data !== null && filteredItems.length > 0 && (
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
  );
}
