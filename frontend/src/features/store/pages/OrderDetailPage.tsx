import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCustomerAuth } from "../CustomerAuthContext";
import type { StoreContext } from "../types";
import { ORDER_STATUS_LABELS, type OrderStatusPublic } from "./MyOrdersPage";

type OrderDetail = {
  id: string;
  orderNumber: number;
  status: OrderStatusPublic;
  shippingZoneName: string | null;
  shippingCost: number;
  subtotal: number;
  total: number;
  trackingNumber: string | null;
  note: string | null;
  createdAt: string;
  items: {
    id: string;
    name: string;
    talle: string | null;
    color: string | null;
    qty: number;
    unitPrice: number;
    total: number;
  }[];
};

export function OrderDetailPage() {
  const { slug } = useOutletContext<StoreContext>();
  const { orderId } = useParams<{ orderId: string }>();
  const { me, loading } = useCustomerAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    apiJson<OrderDetail>(`/portal/${slug}/orders/${orderId}`)
      .then(setOrder)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "Pedido no encontrado"
            : err instanceof ApiError
              ? err.message
              : String(err)
        )
      );
  }, [slug, orderId, me]);

  if (!loading && !me) {
    return (
      <div className="store-message">
        <p><Link to={`/store/${slug}/portal/orders`}>← Mis pedidos</Link></p>
        <p>Ingresá para ver este pedido.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="store-message">
        <h1>{error}</h1>
        <p><Link to={`/store/${slug}/portal/orders`}>← Mis pedidos</Link></p>
      </div>
    );
  }
  if (!order) return <p className="store-message">Cargando…</p>;

  const st = ORDER_STATUS_LABELS[order.status];
  return (
    <div className="portal">
      <p className="store-back"><Link to={`/store/${slug}/portal/orders`}>← Mis pedidos</Link></p>
      <h1>
        Pedido #{order.orderNumber}{" "}
        <span className="portal-badge" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
      </h1>
      <p className="muted">{new Date(order.createdAt).toLocaleString("es-AR")}</p>

      <div className="checkout-summary" style={{ maxWidth: 480 }}>
        {order.items.map((item) => (
          <div key={item.id} className="checkout-line">
            <span>
              {item.qty}× {item.name}
              {item.talle && <span className="muted"> ({item.talle}/{item.color})</span>}
            </span>
            <span>{formatPrice(item.total)}</span>
          </div>
        ))}
        <div className="checkout-line">
          <span>Envío{order.shippingZoneName ? ` (${order.shippingZoneName})` : ""}</span>
          <span>{order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}</span>
        </div>
        <div className="checkout-line checkout-total">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {order.trackingNumber && (
        <p>Seguimiento: <strong>{order.trackingNumber}</strong></p>
      )}
      {order.note && <p className="muted">Tu nota: “{order.note}”</p>}
      {order.status === "pending" && (
        <p className="muted">
          Este pedido está esperando la confirmación del pago. Si ya pagaste, se actualiza solo en
          unos minutos.
        </p>
      )}
    </div>
  );
}
