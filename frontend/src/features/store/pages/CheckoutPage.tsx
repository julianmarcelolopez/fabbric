import type { FacturaAfipInput } from "@fabbric/shared";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, apiJson, publicJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCart } from "../../cart/CartContext";
import { useCustomerAuth } from "../CustomerAuthContext";
import { Loading } from "../components/Loading";
import type { StoreContext } from "../types";

type Zone = { id: string; name: string; cost: number; freeShippingFrom: number | null };

const FACTURA_FORM_VACIO: FacturaAfipInput = { nombre: "", email: "", dni: "" };

// T37 — mismo criterio que CarritoScreen.tsx (PWA): los 3 campos son
// obligatorios para el backend si se manda `factura` en absoluto (ver
// facturaAfipSchema en @fabbric/shared), no alcanza con validar el email.
function facturaFormCompleto(form: FacturaAfipInput): boolean {
  return form.nombre.trim() !== "" && /\S+@\S+\.\S+/.test(form.email) && form.dni.trim() !== "";
}

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
  // T37 — factura AFIP opcional, apagada por default (igual que en la venta
  // local de la PWA): no cambia nada del checkout hasta que el comprador la
  // activa a propósito.
  const [facturar, setFacturar] = useState(false);
  const [facturaForm, setFacturaForm] = useState<FacturaAfipInput>(FACTURA_FORM_VACIO);

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

  const facturaIncompleta = facturar && !facturaFormCompleto(facturaForm);

  async function pay() {
    if (!zone || facturaIncompleta) return;
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
          ...(facturar ? { factura: facturaForm } : {}),
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
              <Loading label="Cargando zonas…" />
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

        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-num">5</span>
            <span className="form-section-title">Factura (opcional)</span>
          </div>
          <div className="form-body">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: facturar ? 12 : 0 }}>
              <input type="checkbox" checked={facturar} onChange={(e) => setFacturar(e.target.checked)} />
              Quiero factura de esta compra
            </label>
            {facturar && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="factura-nombre">
                    Nombre y apellido *
                  </label>
                  <input
                    id="factura-nombre"
                    className="form-input"
                    value={facturaForm.nombre}
                    onChange={(e) => setFacturaForm({ ...facturaForm, nombre: e.target.value })}
                    required={facturar}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="factura-email">
                    Email *
                  </label>
                  <input
                    id="factura-email"
                    type="email"
                    className="form-input"
                    value={facturaForm.email}
                    onChange={(e) => setFacturaForm({ ...facturaForm, email: e.target.value })}
                    required={facturar}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="factura-dni">
                    DNI *
                  </label>
                  <input
                    id="factura-dni"
                    className="form-input"
                    value={facturaForm.dni}
                    onChange={(e) => setFacturaForm({ ...facturaForm, dni: e.target.value })}
                    required={facturar}
                  />
                </div>
              </div>
            )}
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
        <div className="summary-cta">
          {/* T21/08: type="submit" + form="checkout-form" (en vez de type="button"
              con onClick propio) — el botón vive fuera del <form> por el layout
              (sidebar aparte), pero así dispara su onSubmit igual, incluida la
              validación nativa de los required. Antes esto se saltaba entero:
              el onClick llamaba a pay() directo, sin pasar por el form. */}
          {facturaIncompleta && (
            <p className="error" style={{ marginBottom: 8 }}>
              Completá nombre, email y DNI para poder facturar.
            </p>
          )}
          <button className="btn-confirm" type="submit" form="checkout-form" disabled={paying || !zone || facturaIncompleta}>
            {paying ? "Redirigiendo a Mercado Pago…" : "Confirmar y pagar →"}
          </button>
          <div className="security-note">🔒 Tu información está protegida</div>
        </div>
      </aside>
    </div>
  );
}
