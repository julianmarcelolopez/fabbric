import { useEffect } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useCart } from "../../cart/CartContext";
import type { StoreContext } from "../types";

// Página de vuelta del redirect de MP. IMPORTANTE: esto es solo informativo —
// el estado real de la orden lo confirma el WEBHOOK (el comprador puede cerrar
// la pestaña y el pago igual se procesa).

export function CheckoutResultPage() {
  const { slug } = useOutletContext<StoreContext>();
  const [params] = useSearchParams();
  const cart = useCart();

  const status = params.get("collection_status") ?? params.get("status") ?? "unknown";
  const ok = status === "approved" || status === "in_process" || status === "pending";

  useEffect(() => {
    // El carrito se limpia solo si el pago no falló
    if (ok) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  return (
    <div className="store-message">
      {status === "approved" ? (
        <>
          <h1>¡Gracias por tu compra! 🎉</h1>
          <p>Tu pago fue aprobado. Te va a llegar la confirmación en breve.</p>
        </>
      ) : ok ? (
        <>
          <h1>Pago en proceso</h1>
          <p>Mercado Pago está procesando tu pago. Vas a ver el estado en "Mis pedidos".</p>
        </>
      ) : (
        <>
          <h1>El pago no se completó</h1>
          <p>Podés intentar de nuevo desde tu carrito — no se te cobró nada.</p>
        </>
      )}
      <p>
        <Link to={`/store/${slug}/portal/orders`}>Ver mis pedidos</Link>
        {" · "}
        <Link to={`/store/${slug}`}>Volver a la tienda</Link>
      </p>
    </div>
  );
}
