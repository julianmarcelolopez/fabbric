import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCart } from "../../cart/CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";
import type { StoreContext } from "../types";
import type { OrderDetail } from "./OrderDetailPage";

// Página de vuelta del redirect de MP. IMPORTANTE: esto es solo informativo —
// el estado real de la orden lo confirma el WEBHOOK (el comprador puede cerrar
// la pestaña y el pago igual se procesa).
//
// T20/07 — el mockup de confirmación muestra número de pedido, total, medio de
// pago, envío y dirección reales, no datos de ejemplo. MP redirige acá con
// `external_reference` (el id de la orden que mandamos al crear la preference,
// ver backend/src/modules/payments/service.ts) — se usa para pedir el detalle
// real vía GET /portal/:slug/orders/:id (mismo endpoint que "Mis pedidos").
// Si por lo que sea no llega o falla el fetch, se degrada al mensaje genérico
// de antes en vez de romper la página.

export function CheckoutResultPage() {
  const { slug, config } = useOutletContext<StoreContext>();
  const [params] = useSearchParams();
  const cart = useCart();
  const { me } = useCustomerAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const status = params.get("collection_status") ?? params.get("status") ?? "unknown";
  const orderId = params.get("external_reference");
  const ok = status === "approved" || status === "in_process" || status === "pending";

  useEffect(() => {
    // El carrito se limpia solo si el pago no falló
    if (ok) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  useEffect(() => {
    if (!ok || !orderId || !me) return;
    apiJson<OrderDetail>(`/portal/${slug}/orders/${orderId}`)
      .then(setOrder)
      .catch(() => {});
  }, [ok, orderId, me, slug]);

  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;

  if (!ok) {
    return (
      <div className="confirmation-wrapper">
        <div className="confirm-icon confirm-icon-fail">✕</div>
        <h1 className="confirm-title">El pago no se completó</h1>
        <p className="confirm-sub">Podés intentar de nuevo desde tu carrito — no se te cobró nada.</p>
        <div className="confirm-actions">
          <Link className="btn-orders" to={`/store/${slug}`}>
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = order?.items.reduce((acc, i) => acc + i.qty, 0);

  return (
    <div className="confirmation-wrapper">
      <div className="confirm-icon">{status === "approved" ? "✅" : "🕓"}</div>

      <h1 className="confirm-title">
        {status === "approved" ? (
          <>
            ¡Pedido
            <br />
            confirmado!
          </>
        ) : (
          <>
            Pago en
            <br />
            proceso
          </>
        )}
      </h1>

      <p className="confirm-sub">
        {status === "approved" ? (
          <>
            {me ? `Gracias ${me.name.split(" ")[0]}. ` : ""}Tu pedido fue recibido y está siendo preparado.
            <br />
            Te avisamos cuando salga para entrega.
          </>
        ) : (
          <>
            Mercado Pago está procesando tu pago.
            <br />
            Vas a ver el estado actualizado en "Mis pedidos".
          </>
        )}
      </p>

      {order && (
        <div className="confirm-order-box">
          <div className="confirm-order-num">Número de pedido</div>
          <div className="confirm-order-val">#{order.orderNumber}</div>
          <div className="confirm-details">
            <div className="confirm-row">
              <span className="confirm-key">Productos</span>
              <span className="confirm-val">
                {itemCount} prenda{itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">Total pagado</span>
              <span className="confirm-val confirm-val-accent">{formatPrice(order.total)}</span>
            </div>
            <div className="confirm-row">
              <span className="confirm-key">Método de pago</span>
              <span className="confirm-val">Mercado Pago</span>
            </div>
            {order.shippingZoneName && (
              <div className="confirm-row">
                <span className="confirm-key">Envío</span>
                <span className="confirm-val">{order.shippingZoneName}</span>
              </div>
            )}
            {me?.address && (
              <div className="confirm-row">
                <span className="confirm-key">Dirección</span>
                <span className="confirm-val">{me.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* T20/07 — sin sistema de tracking real: mensaje genérico en vez del
          link de seguimiento que sugiere el mockup (decisión del usuario). */}
      <div className="confirm-tracking">
        <span className="tracking-icon">📦</span>
        <div className="tracking-text">
          <h4>Te mantenemos al tanto</h4>
          <p>Te avisamos por email cuando tu pedido salga para entrega.</p>
        </div>
      </div>

      <div className="confirm-actions">
        <Link className="btn-orders" to={`/store/${slug}/portal/orders`}>
          Ver mis pedidos
        </Link>
        <Link className="btn-continue" to={`/store/${slug}`}>
          Seguir comprando
        </Link>
        {whatsappHref && (
          <a className="btn-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
            💬 ¿Tenés alguna duda? Escribinos
          </a>
        )}
      </div>
    </div>
  );
}
