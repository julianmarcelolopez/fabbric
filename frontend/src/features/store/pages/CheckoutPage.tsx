import { useEffect, useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, apiJson, publicJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCart } from "../../cart/CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";
import type { StoreContext } from "../types";

type Zone = { id: string; name: string; cost: number; freeShippingFrom: number | null };

export function CheckoutPage() {
  const { slug } = useOutletContext<StoreContext>();
  const cart = useCart();
  const { me, loading, signInWithGoogle, refresh } = useCustomerAuth();
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    publicJson<Zone[]>(`/public/${slug}/shipping-zones`)
      .then(setZones)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug]);

  useEffect(() => {
    if (me) {
      setName((v) => v || me.name);
      setPhone((v) => v || me.phone || "");
      setAddress((v) => v || me.address || "");
    }
  }, [me]);

  const zone = zones?.find((z) => z.id === zoneId) ?? null;
  const shippingCost =
    zone === null
      ? null
      : zone.freeShippingFrom !== null && cart.subtotal >= zone.freeShippingFrom
        ? 0
        : zone.cost;

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!zone) return;
    setError(null);
    setPaying(true);
    try {
      // Perfil de contacto actualizado antes de la orden
      await apiJson(`/portal/${slug}/me`, {
        method: "PATCH",
        body: JSON.stringify({ name, phone: phone.trim() || null, address: address.trim() || null }),
      });
      await refresh();
      const result = await apiJson<{ initPoint: string }>(`/public/${slug}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          items: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          shippingZoneId: zone.id,
          note: note.trim() || null,
        }),
      });
      // El carrito se limpia en la página de resultado (si el pago no falla)
      window.location.href = result.initPoint;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setPaying(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="store-message">
        <h1>Tu carrito está vacío</h1>
        <p><Link to={`/store/${slug}`}>← Volver a la tienda</Link></p>
      </div>
    );
  }

  if (!loading && !me) {
    return (
      <div className="store-message">
        <h1>Ingresá para completar tu compra</h1>
        <p>Usamos tu cuenta de Google solo para identificarte y mostrarte tus pedidos.</p>
        <button className="pdv-buy" style={{ maxWidth: 320 }} onClick={() => void signInWithGoogle()}>
          Ingresar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="checkout">
      <p className="store-back"><Link to={`/store/${slug}`}>← Seguir comprando</Link></p>
      <h1>Checkout</h1>

      <div className="checkout-grid">
        <form onSubmit={pay} className="checkout-form">
          <h2>Datos de contacto</h2>
          <label className="field">Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="field">Dirección de entrega
            <input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>

          <h2>Envío</h2>
          {zones === null ? (
            <p className="muted">Cargando zonas…</p>
          ) : zones.length === 0 ? (
            <p className="error">La tienda no configuró zonas de envío todavía.</p>
          ) : (
            <label className="field">Zona
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
                <option value="">Elegir…</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {formatPrice(z.cost)}
                    {z.freeShippingFrom !== null ? ` (gratis desde ${formatPrice(z.freeShippingFrom)})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">Nota para la tienda (opcional)
            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error && <p className="error">{error}</p>}
          <button className="pdv-buy" type="submit" disabled={paying || !zone}>
            {paying ? "Redirigiendo a Mercado Pago…" : "Pagar con Mercado Pago"}
          </button>
          <p className="muted" style={{ fontSize: 12 }}>
            Te llevamos al sitio de Mercado Pago para pagar de forma segura.
          </p>
        </form>

        <aside className="checkout-summary">
          <h2>Tu pedido</h2>
          {cart.items.map((item) => (
            <div key={item.variantId} className="checkout-line">
              <span>{item.qty}× {item.name} <span className="muted">({item.talle}/{item.color})</span></span>
              <span>{formatPrice(item.unitPrice * item.qty)}</span>
            </div>
          ))}
          <div className="checkout-line">
            <span>Envío</span>
            <span>
              {shippingCost === null ? "—" : shippingCost === 0 ? "¡Gratis!" : formatPrice(shippingCost)}
            </span>
          </div>
          <div className="checkout-line checkout-total">
            <span>Total</span>
            <span>{formatPrice(cart.subtotal + (shippingCost ?? 0))}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
