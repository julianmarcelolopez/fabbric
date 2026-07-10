import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCustomerAuth } from "../CustomerAuthContext";
import type { StoreContext } from "../types";

export type OrderStatusPublic =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatusPublic, { label: string; color: string }> = {
  pending: { label: "Pendiente de pago", color: "#b45309" },
  paid: { label: "Pagado", color: "#15803d" },
  preparing: { label: "En preparación", color: "#1d4ed8" },
  shipped: { label: "Enviado", color: "#7c3aed" },
  delivered: { label: "Entregado", color: "#374151" },
  cancelled: { label: "Cancelado", color: "#b91c1c" },
};

type OrderRow = {
  id: string;
  orderNumber: number;
  status: OrderStatusPublic;
  total: number;
  createdAt: string;
  itemCount: number;
};

export function MyOrdersPage() {
  const { slug } = useOutletContext<StoreContext>();
  const { me, loading, signInWithGoogle } = useCustomerAuth();
  const [ordersList, setOrdersList] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    apiJson<OrderRow[]>(`/portal/${slug}/orders`)
      .then(setOrdersList)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug, me]);

  if (!loading && !me) {
    return (
      <div className="store-message">
        <h1>Mis pedidos</h1>
        <p>Ingresá para ver tus pedidos en esta tienda.</p>
        <button className="pdv-buy" style={{ maxWidth: 320 }} onClick={() => void signInWithGoogle()}>
          Ingresar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="portal">
      <p className="store-back"><Link to={`/store/${slug}`}>← Volver a la tienda</Link></p>
      <h1>Mis pedidos</h1>
      {error && <p className="error">{error}</p>}
      {ordersList === null ? (
        <p className="muted">Cargando…</p>
      ) : ordersList.length === 0 ? (
        <p className="muted">Todavía no hiciste ningún pedido en esta tienda.</p>
      ) : (
        <div className="portal-orders">
          {ordersList.map((order) => {
            const st = ORDER_STATUS_LABELS[order.status];
            return (
              <Link key={order.id} to={`/store/${slug}/portal/orders/${order.id}`} className="portal-order">
                <span className="portal-order-num">#{order.orderNumber}</span>
                <span className="muted">{new Date(order.createdAt).toLocaleDateString("es-AR")}</span>
                <span className="muted">{order.itemCount} ítem{order.itemCount === 1 ? "" : "s"}</span>
                <span className="portal-badge" style={{ color: st.color, borderColor: st.color }}>
                  {st.label}
                </span>
                <span className="portal-order-total">{formatPrice(order.total)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
