import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import {
  ADMIN_ORDER_STATUS,
  ADMIN_ORDER_TYPE_LABELS,
  type AdminOrderDetail,
  type AdminOrderStatus,
  type AdminWallet,
} from "../types";

const ACTION_LABELS: Partial<Record<AdminOrderStatus, string>> = {
  preparing: "Preparar",
  shipped: "Marcar enviado",
  delivered: "Marcar entregado",
  cancelled: "Cancelar",
};

export function OrderAdminDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  // Cobro manual (T9): el cobro siempre entra a una cartera activa
  const [wallets, setWallets] = useState<AdminWallet[] | null>(null);
  const [walletId, setWalletId] = useState("");

  const load = useCallback(async () => {
    try {
      const detail = await apiJson<AdminOrderDetail>(`/admin/orders/${id}`);
      setOrder(detail);
      setTracking(detail.trackingNumber ?? "");
      if (detail.status === "pending" && wallets === null) {
        const all = await apiJson<AdminWallet[]>("/admin/wallets");
        const active = all.filter((w) => w.active);
        setWallets(active);
        if (active.length === 1) setWalletId(active[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [id, wallets]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function transition(next: AdminOrderStatus) {
    if (next === "cancelled" && !confirm(`¿Cancelar el pedido #${order?.orderNumber}?`)) return;
    const body: Record<string, unknown> = { status: next };
    if (next === "shipped") {
      if (!tracking.trim()) {
        setError("Cargá el número de seguimiento antes de marcar enviado");
        return;
      }
      body.trackingNumber = tracking.trim();
    }
    void run(() =>
      apiJson(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(body) })
    );
  }

  if (error && !order) {
    return (
      <>
        <h1>Pedido</h1>
        <p className="error">{error}</p>
        <Link to="/admin/orders">← Volver a pedidos</Link>
      </>
    );
  }
  if (!order) return <p className="muted">Cargando…</p>;

  const st = ADMIN_ORDER_STATUS[order.status];
  return (
    <>
      <p><Link to="/admin/orders">← Pedidos</Link></p>
      <div className="row" style={{ alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Pedido #{order.orderNumber}</h1>
        <span className="portal-badge" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
        <span className="badge">{ADMIN_ORDER_TYPE_LABELS[order.type]}</span>
      </div>
      <p className="muted">
        {new Date(order.createdAt).toLocaleString("es-AR")}
        {order.mpPaymentId && <> · pago MP <code>{order.mpPaymentId}</code></>}
      </p>

      <div className="card">
        <h2>Cliente</h2>
        {order.customerName ? (
          <p>
            <strong>{order.customerName}</strong> · {order.customerEmail}
            {order.customerPhone && <> · {order.customerPhone}</>}
            {order.customerAddress && (
              <>
                <br />
                <span className="muted">{order.customerAddress}</span>
              </>
            )}
          </p>
        ) : (
          <p className="muted">Venta sin cliente registrado</p>
        )}
        {order.note && <p className="muted">Nota: “{order.note}”</p>}
      </div>

      <div className="card">
        <h2>Ítems</h2>
        <table className="grid">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Variante</th>
              <th>Canal</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Costo</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.productId === null && <span className="badge" style={{ marginLeft: 6 }}>bespoke</span>}
                  {item.referenceImageUrl && (
                    <a href={item.referenceImageUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>
                      <img src={item.referenceImageUrl} alt="referencia" className="thumb" style={{ verticalAlign: "middle" }} />
                    </a>
                  )}
                </td>
                <td>{item.talle ? `${item.talle}/${item.color}` : "—"}</td>
                <td className="muted">{item.channel ?? "—"}</td>
                <td>{item.qty}</td>
                <td>{formatPrice(item.unitPrice)}</td>
                <td className="muted">{item.unitCostSnapshot === null ? "—" : formatPrice(item.unitCostSnapshot)}</td>
                <td>{formatPrice(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ textAlign: "right", margin: "10px 0 0" }}>
          Envío{order.shippingZoneName ? ` (${order.shippingZoneName})` : ""}:{" "}
          {order.shippingCost === 0 ? "—" : formatPrice(order.shippingCost)} · <strong>Total: {formatPrice(order.total)}</strong>
        </p>
      </div>

      <div className="card">
        <h2>Acciones</h2>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ alignItems: "flex-end" }}>
          {order.status === "pending" &&
            (wallets !== null && wallets.length === 0 ? (
              <span className="muted">
                Para cobrar necesitás una cartera activa — <Link to="/admin/finance">creala en Finanzas</Link>.
              </span>
            ) : (
              <>
                <label className="field">
                  Cobrar a cartera
                  <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                    <option value="">Elegir…</option>
                    {(wallets ?? []).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn primary"
                  disabled={busy || !walletId}
                  onClick={() =>
                    run(() =>
                      apiJson(`/admin/orders/${id}/mark-paid`, {
                        method: "POST",
                        body: JSON.stringify({ walletId }),
                      })
                    )
                  }
                >
                  Cobrar (venta manual)
                </button>
              </>
            ))}
          {order.allowedTransitions.includes("shipped") && (
            <label className="field">
              N.º de seguimiento
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AR123456789" />
            </label>
          )}
          {order.allowedTransitions.map((next) => (
            <button
              key={next}
              className={`btn ${next === "cancelled" ? "danger" : "primary"}`}
              disabled={busy}
              onClick={() => transition(next)}
            >
              {ACTION_LABELS[next] ?? next}
            </button>
          ))}
          {order.allowedTransitions.length === 0 && order.status !== "pending" && (
            <span className="muted">Estado terminal — sin acciones disponibles.</span>
          )}
        </div>
        {order.trackingNumber && (
          <p className="muted" style={{ marginTop: 8 }}>Seguimiento actual: <strong>{order.trackingNumber}</strong></p>
        )}
      </div>
    </>
  );
}
