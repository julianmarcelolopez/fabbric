import { useNavigate } from "react-router-dom";
import { formatPrice } from "../../lib/money";
import { useCart } from "./CartContext";

export function CartDrawer({ slug }: { slug: string }) {
  const cart = useCart();
  const navigate = useNavigate();

  if (!cart.isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={cart.close} />
      <aside className="cart-drawer">
        <div className="cart-head">
          <h2>Tu carrito</h2>
          <button className="store-auth-btn" onClick={cart.close}>Cerrar</button>
        </div>

        {cart.items.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>El carrito está vacío.</p>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item.variantId} className="cart-item">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <span className="cart-ph" />
                  )}
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-variant">{item.talle} / {item.color}</p>
                    <div className="cart-qty">
                      <button onClick={() => cart.setQty(item.variantId, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => cart.setQty(item.variantId, item.qty + 1)}
                        disabled={item.qty >= item.stockOnline}
                        title={item.qty >= item.stockOnline ? "Sin más stock online" : ""}
                      >
                        +
                      </button>
                      <button className="cart-remove" onClick={() => cart.remove(item.variantId)}>Quitar</button>
                    </div>
                  </div>
                  <p className="cart-item-price">{formatPrice(item.unitPrice * item.qty)}</p>
                </div>
              ))}
            </div>
            <div className="cart-foot">
              <p className="cart-subtotal">
                Subtotal <strong>{formatPrice(cart.subtotal)}</strong>
              </p>
              <p className="muted" style={{ margin: "0 0 10px", fontSize: 12 }}>
                El envío se calcula en el checkout.
              </p>
              <button
                className="pdv-buy"
                onClick={() => {
                  cart.close();
                  navigate(`/store/${slug}/checkout`);
                }}
              >
                Iniciar compra
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
