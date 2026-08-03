import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, apiJson, publicJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCart } from "../../cart/CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";
import type { StoreContext } from "../types";

type Zone = { id: string; name: string; cost: number; freeShippingFrom: number | null };

// T20/07 — mismos 3 campos de siempre (nombre, teléfono, dirección — un solo
// campo, no se parte en calle/CP/ciudad/provincia como el mockup: esos datos
// no existen en el modelo real, ver Resultado). Reorganizados en secciones
// numeradas + radio cards para envío/pago, sin agregar ni sacar campos.
// Método de pago: solo Mercado Pago (decisión del usuario, sin "transferencia
// bancaria" — no existe esa lógica). Sin código de descuento (sin cupones reales).
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
  const [contactOpen, setContactOpen] = useState(false);

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
      // Si ya vino nombre y teléfono de la cuenta, la sección de contacto
      // arranca colapsada (mismo criterio del mockup: "editar" si hace falta).
      setContactOpen((v) => v || !me.name || !me.phone);
    }
  }, [me]);

  const zone = zones?.find((z) => z.id === zoneId) ?? null;
  const shippingCost =
    zone === null
      ? null
      : zone.freeShippingFrom !== null && cart.subtotal >= zone.freeShippingFrom
        ? 0
        : zone.cost;

  async function pay() {
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
        <p>
          <Link to={`/store/${slug}`}>← Volver a la tienda</Link>
        </p>
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

  const contactDone = !contactOpen && !!name && !!phone;
  const total = cart.subtotal + (shippingCost ?? 0);
  const installment = Math.round(total / 3);

  return (
    <div className="checkout-layout">
      <form
        id="checkout-form"
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
        className="checkout-form"
      >
        <div className={contactDone ? "form-section collapsed" : "form-section"}>
          <div className="form-section-header">
            <span className={contactDone ? "form-section-num done" : "form-section-num"}>
              {contactDone ? "✓" : "1"}
            </span>
            <span className="form-section-title">Datos de contacto</span>
            {contactDone && (
              <span className="form-section-edit" onClick={() => setContactOpen(true)}>
                Editar
              </span>
            )}
          </div>
          {contactDone ? (
            <div className="collapsed-preview">
              {name} · {me?.email} · {phone}
            </div>
          ) : (
            <div className="form-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="checkout-name">
                    Nombre *
                  </label>
                  <input
                    id="checkout-name"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="checkout-phone">
                    Teléfono *
                  </label>
                  <input
                    id="checkout-phone"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-num">2</span>
            <span className="form-section-title">Dirección de envío</span>
          </div>
          <div className="form-body">
            <div className="form-row single">
              <div className="form-group">
                <label className="form-label" htmlFor="checkout-address">
                  Dirección *
                </label>
                <input
                  id="checkout-address"
                  className="form-input"
                  placeholder="Calle, número, piso/depto, localidad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-num">3</span>
            <span className="form-section-title">Método de envío</span>
          </div>
          <div className="form-body">
            {zones === null ? (
              <p className="muted">Cargando zonas…</p>
            ) : zones.length === 0 ? (
              <p className="error">La tienda no configuró zonas de envío todavía.</p>
            ) : (
              <div className="shipping-options">
                {zones.map((z) => {
                  const free = z.freeShippingFrom !== null && cart.subtotal >= z.freeShippingFrom;
                  return (
                    <label
                      key={z.id}
                      className={zoneId === z.id ? "shipping-option selected" : "shipping-option"}
                    >
                      <input
                        type="radio"
                        name="shippingZone"
                        value={z.id}
                        checked={zoneId === z.id}
                        onChange={() => setZoneId(z.id)}
                        className="shipping-radio-input"
                        required
                      />
                      <span className="shipping-radio">
                        <span className="shipping-radio-dot" />
                      </span>
                      <span className="shipping-info">
                        <span className="shipping-name">{z.name}</span>
                        {z.freeShippingFrom !== null && !free && (
                          <span className="shipping-sub">
                            Envío gratis desde {formatPrice(z.freeShippingFrom)}
                          </span>
                        )}
                      </span>
                      <span className={free ? "shipping-price free" : "shipping-price"}>
                        {free ? "Gratis" : formatPrice(z.cost)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-num">4</span>
            <span className="form-section-title">Método de pago</span>
          </div>
          <div className="form-body">
            <div className="payment-options">
              <div className="payment-option selected">
                <div className="payment-option-header">
                  <span className="shipping-radio">
                    <span className="shipping-radio-dot" />
                  </span>
                  <span className="payment-option-name">Mercado Pago</span>
                </div>
                <div className="payment-body">
                  <div className="mp-info">
                    <span className="mp-icon">🔒</span>
                    Serás redirigido a Mercado Pago para completar el pago de forma segura. Podés pagar con
                    tarjeta, débito o saldo en tu cuenta MP.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" htmlFor="checkout-note">
            Nota para la tienda (opcional)
          </label>
          <textarea
            id="checkout-note"
            className="form-input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}
      </form>

      <aside className="order-summary">
        <div className="summary-header">
          <span className="summary-title">Resumen del pedido</span>
        </div>
        <div className="summary-items">
          {cart.items.map((item) => (
            <div key={item.variantId} className="summary-item">
              <div className="summary-item-img">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="summary-item-img-ph" />}
                <span className="summary-item-qty">{item.qty}</span>
              </div>
              <div className="summary-item-info">
                <div className="summary-item-name">{item.name}</div>
                <div className="summary-item-variant">
                  {item.talle} · {item.color}
                </div>
              </div>
              <span className="summary-item-price">{formatPrice(item.unitPrice * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="summary-totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="total-row">
            <span>Envío{zone ? ` (${zone.name})` : ""}</span>
            <span>{shippingCost === null ? "—" : shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}</span>
          </div>
          <div className="total-row main">
            <span>Total</span>
            <span className="total-val">{formatPrice(total)}</span>
          </div>
        </div>
        <p className="installments-note">
          Hasta <strong>3 cuotas sin interés de {formatPrice(installment)}</strong> con todas las tarjetas al
          pagar con Mercado Pago.
        </p>
        <div className="summary-cta">
          {/* T21/08: type="submit" + form="checkout-form" (en vez de type="button"
              con onClick propio) — el botón vive fuera del <form> por el layout
              (sidebar aparte), pero así dispara su onSubmit igual, incluida la
              validación nativa de los required. Antes esto se saltaba entero:
              el onClick llamaba a pay() directo, sin pasar por el form. */}
          <button className="btn-confirm" type="submit" form="checkout-form" disabled={paying || !zone}>
            {paying ? "Redirigiendo a Mercado Pago…" : "Confirmar y pagar →"}
          </button>
          <div className="security-note">🔒 Tu información está protegida</div>
        </div>
      </aside>
    </div>
  );
}
