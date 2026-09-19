import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiDownload, apiJson } from "../../../lib/api";
import { centsToPesosInput, formatPrice, pesosToCents } from "../../../lib/money";
import { Loading } from "../components/Loading";
import {
  ADMIN_ORDER_STATUS,
  ADMIN_ORDER_TYPE_LABELS,
  type AdminInvoiceStatus,
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

// T34 — "cobrar saldo" resuelve la cartera del lado del servidor a partir
// del medio de pago (igual que /venta-local) — a diferencia de "Cobrar
// (venta manual)" más abajo, que sí le pide al admin elegir una cartera
// concreta. Mismo endpoint que usa la PWA (decisión de negocio, ver
// docs/T34_VentaConAnticipo/analisis.md) — no reusar el patrón de walletId.
const MEDIOS_COBRO: { value: string; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "mercadopago", label: "Mercado Pago" },
];

function vencido(balanceDueDate: string | null): boolean {
  if (!balanceDueDate) return false;
  return balanceDueDate < new Date().toISOString().slice(0, 10);
}

// T34 — tarjeta de saldo pendiente + formulario de cobro, solo para pedidos
// `partial`. Componente aparte (no inline en OrderAdminDetailPage) porque
// tiene su propio estado de formulario, igual que InvoiceCard más arriba.
function SaldoPendienteCard({ order, onCobrado }: { order: AdminOrderDetail; onCobrado: () => Promise<void> }) {
  const [monto, setMonto] = useState<number | null>(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function cobrar() {
    if (!monto) return;
    setLocalError(null);
    setBusy(true);
    try {
      await apiJson(`/admin/orders/${order.id}/cobrar-saldo`, {
        method: "POST",
        body: JSON.stringify({ monto, medioPago }),
      });
      setMonto(null);
      await onCobrado();
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const excedeSaldo = monto != null && monto > order.saldoPendiente;

  return (
    <div className="card">
      <h2>Saldo pendiente</h2>
      <p>
        Total {formatPrice(order.total)} · Pagado {formatPrice(order.pagado)} ·{" "}
        <strong>Saldo {formatPrice(order.saldoPendiente)}</strong>
      </p>
      {order.balanceDueDate && (
        <p className={vencido(order.balanceDueDate) ? "error" : "muted"}>
          {vencido(order.balanceDueDate) ? "Venció" : "Vence"} el{" "}
          {new Date(`${order.balanceDueDate}T00:00:00`).toLocaleDateString("es-AR")}
        </p>
      )}
      <div className="row" style={{ alignItems: "flex-end" }}>
        <label className="field">
          Monto a cobrar
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={centsToPesosInput(monto)}
            onChange={(e) => setMonto(pesosToCents(e.target.value))}
          />
        </label>
        <label className="field">
          Medio de pago
          <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
            {MEDIOS_COBRO.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>
        <button className="btn primary" disabled={busy || !monto || excedeSaldo} onClick={() => void cobrar()}>
          {busy ? "Registrando…" : "Registrar cobro"}
        </button>
      </div>
      {excedeSaldo && (
        <p className="error" style={{ marginTop: 8 }}>
          El monto no puede ser mayor al saldo pendiente ({formatPrice(order.saldoPendiente)}).
        </p>
      )}
      {localError && <p className="error" style={{ marginTop: 8 }}>{localError}</p>}
    </div>
  );
}

// T25 — estado de la factura AFIP del pedido (a lo sumo una por pedido).
// Reintentar reusa el mismo endpoint que el botón "Reintentar" de otras
// pantallas administrativas no tiene todavía (Fase 6 es la primera UI de esto).
function InvoiceCard({ invoice, onRetried }: { invoice: AdminInvoiceStatus; onRetried: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function retry() {
    setLocalError(null);
    setBusy(true);
    try {
      await apiJson(`/admin/invoices/${invoice.id}/retry`, { method: "POST" });
      await onRetried();
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setLocalError(null);
    setBusy(true);
    try {
      await apiDownload(`/admin/invoices/${invoice.id}/pdf`, `factura-${invoice.numero}.pdf`);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Factura AFIP</h2>
      {invoice.estado === "emitida" && (
        <>
          <p>
            Factura C N.º <strong>{invoice.numero}</strong> · CAE <code>{invoice.cae}</code>
            {invoice.caeVencimiento && <span className="muted"> (vence {invoice.caeVencimiento})</span>}
          </p>
          <button className="btn" disabled={busy} onClick={() => void download()}>
            {busy ? "Descargando…" : "Descargar factura (PDF)"}
          </button>
        </>
      )}
      {invoice.estado === "pendiente" && (
        <p className="muted">La factura se está terminando de procesar.</p>
      )}
      {invoice.estado === "error" && (
        <>
          <p className="error">{invoice.mensajeError ?? "No se pudo emitir la factura."}</p>
          <button className="btn primary" disabled={busy} onClick={() => void retry()}>
            {busy ? "Reintentando…" : "Reintentar"}
          </button>
        </>
      )}
      {localError && <p className="error" style={{ marginTop: 8 }}>{localError}</p>}
    </div>
  );
}

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
  if (!order) return <Loading />;

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
        <div className="table-scroll">
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
        </div>
        <p style={{ textAlign: "right", margin: "10px 0 0" }}>
          Envío{order.shippingZoneName ? ` (${order.shippingZoneName})` : ""}:{" "}
          {order.shippingCost === 0 ? "—" : formatPrice(order.shippingCost)} · <strong>Total: {formatPrice(order.total)}</strong>
        </p>
      </div>

      {/* T34 — solo pedidos que nacieron con anticipo (venta-local, PWA) */}
      {order.status === "partial" && <SaldoPendienteCard order={order} onCobrado={load} />}

      {/* T25 — sin factura (toggle nunca activado en la venta), esta tarjeta
          no aparece: cero cambio respecto de un pedido de T23. */}
      {order.invoice && <InvoiceCard invoice={order.invoice} onRetried={load} />}

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
