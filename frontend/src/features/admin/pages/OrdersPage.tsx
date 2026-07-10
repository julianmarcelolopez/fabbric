import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import {
  ADMIN_ORDER_STATUS,
  ADMIN_ORDER_TYPE_LABELS,
  type AdminOrderRow,
  type AdminOrderStatus,
  type AdminOrderType,
} from "../types";

export function OrdersPage() {
  const [rows, setRows] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | AdminOrderStatus>("");
  const [type, setType] = useState<"" | AdminOrderType>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    try {
      setRows(await apiJson<AdminOrderRow[]>(`/admin/orders${params.size ? `?${params}` : ""}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [status, type, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Pedidos</h1>
        <Link to="/admin/orders/new" className="btn primary" style={{ textDecoration: "none" }}>
          + Nuevo pedido
        </Link>
      </div>

      <div className="card">
        <div className="row">
          <label className="field">
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">Todos</option>
              {Object.entries(ADMIN_ORDER_STATUS).map(([value, s]) => (
                <option key={value} value={value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="">Todos</option>
              {Object.entries(ADMIN_ORDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {rows === null ? (
        <p className="muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Sin pedidos con estos filtros.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Ítems</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const st = ADMIN_ORDER_STATUS[order.status];
              return (
                <tr key={order.id}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`}><strong>#{order.orderNumber}</strong></Link>
                  </td>
                  <td className="muted">{new Date(order.createdAt).toLocaleDateString("es-AR")}</td>
                  <td>{order.customerName ?? <span className="muted">sin cliente</span>}</td>
                  <td><span className="badge">{ADMIN_ORDER_TYPE_LABELS[order.type]}</span></td>
                  <td>{order.itemCount}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <span className="portal-badge" style={{ color: st.color, borderColor: st.color }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
