import { useNavigate } from "react-router-dom";
import { formatPrice } from "../../lib/money";
import { useCart } from "./CartContext";

// T20/07 — rediseño del drawer. Sin código de descuento (decisión del
// usuario: no hay sistema de cupones real, un input que no hace nada
// confunde más que no tenerlo — ver docs/T20_UX-Store/tareas/07-checkout.md).
export function CartDrawer({ slug }: { slug: string }) {
  const cart = useCart();
  const navigate = useNavigate();

  if (!cart.isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={cart.close} />
      <aside className="cart-drawer">
        <div className="cart-header">
          <div>
            <div className="cart-title">Tu carrito</div>
            <div className="cart-count">
              {cart.count} producto{cart.count === 1 ? "" : "s"}
            </div>
          </div>
          <button className="cart-close" onClick={cart.close} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {cart.items.length === 0 ? (
          <p className="store-message" style={{ margin: "16px 24px" }}>
            El carrito está vacío.
          </p>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item.variantId} className="cart-item">
                  {item.imageUrl ? (
                    <img className="cart-item-img" src={item.imageUrl} alt="" />
                  ) : (
                    <div className="cart-item-img cart-item-img-ph" />
                  )}
                  <div className="cart-item-info">
                    {item.brand && <div className="cart-item-brand">{item.brand}</div>}
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-variant">
                      Talle {item.talle} · {item.color}
                    </div>
                    <div className="cart-item-qty">
                      <button
                        type="button"
                        className="qty-btn-sm"
                        onClick={() => cart.setQty(item.variantId, item.qty - 1)}
                        disabled={item.qty <= 1}
                      >
                        −
                      </button>
                      <span className="qty-val-sm">{item.qty}</span>
                      <button
                        type="button"
                        className="qty-btn-sm"
                        onClick={() => cart.setQty(item.variantId, item.qty + 1)}
                        disabled={item.qty >= item.stockOnline}
                        title={item.qty >= item.stockOnline ? "Sin más stock online" : ""}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price">
                    <span className="item-price-current">{formatPrice(item.unitPrice * item.qty)}</span>
                    <span className="item-remove" onClick={() => cart.remove(item.variantId)}>
                      Eliminar
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal ({cart.count})</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Envío</span>
                  <span>A calcular</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="summary-value">{formatPrice(cart.subtotal)}</span>
                </div>
              </div>
              <button
                type="button"
                className="cart-cta"
                onClick={() => {
                  cart.close();
                  navigate(`/store/${slug}/checkout`);
                }}
              >
                Continuar con el pago →
              </button>
              <div className="cart-security">🔒 Pago seguro con Mercado Pago</div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
