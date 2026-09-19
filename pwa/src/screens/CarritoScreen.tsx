import type { FacturaAfipInput, VentaLocalMedioPago } from "@fabbric/shared";
import { useEffect, useState } from "react";
import { apiJson } from "../lib/api";
import { colors, FOOTER_HEIGHT, fonts, HEADER_HEIGHT, radius } from "../lib/theme";
import { centsToPesosInput, formatPrice, pesosToCents } from "../lib/money";
import type { CustomerSearchResult, VariantByBarcode } from "../types";

export type CartItem = {
  variantId: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  talle: string;
  color: string;
  unitPrice: number;
  qty: number;
  // Ya viene en VariantByBarcode al escanear — no hace falta pedirlo de
  // nuevo acá, App.tsx lo copia tal cual al agregar al carrito.
  imageUrl: string | null;
};

type Props = {
  items: CartItem[];
  medioPago: VentaLocalMedioPago;
  onMedioPagoChange: (medioPago: VentaLocalMedioPago) => void;
  onRemove: (variantId: string) => void;
  onUpdateQty: (variantId: string, qty: number) => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
  // T25 — toggle apagado por default: la venta se comporta igual que en T23
  // hasta que el vendedor lo activa a propósito.
  facturar: boolean;
  onFacturarChange: (facturar: boolean) => void;
  facturaForm: FacturaAfipInput;
  onFacturaFormChange: (form: FacturaAfipInput) => void;
  // T34 — solo se usan/validan cuando medioPago === "anticipo". Estado
  // levantado a App.tsx (mismo criterio que facturar/facturaForm arriba),
  // porque confirmVenta() los necesita para armar el body de venta-local.
  montoPagado: number | null;
  onMontoPagadoChange: (v: number | null) => void;
  balanceDueDate: string;
  onBalanceDueDateChange: (v: string) => void;
  customerId: string | null;
  customerName: string | null;
  onCustomerSelect: (id: string, name: string) => void;
};

// Los tres campos son obligatorios para el backend si se manda `factura` en
// absoluto (ver `facturaAfipSchema` en @fabbric/shared) — no alcanza con
// validar solo el email.
function facturaFormCompleto(form: FacturaAfipInput): boolean {
  return form.nombre.trim() !== "" && /\S+@\S+\.\S+/.test(form.email) && form.dni.trim() !== "";
}

const MEDIOS: { value: VentaLocalMedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "anticipo", label: "Anticipo" },
];

export function CarritoScreen({
  items,
  medioPago,
  onMedioPagoChange,
  onRemove,
  onUpdateQty,
  onConfirm,
  submitting,
  error,
  facturar,
  onFacturarChange,
  facturaForm,
  onFacturaFormChange,
  montoPagado,
  onMontoPagadoChange,
  balanceDueDate,
  onBalanceDueDateChange,
  customerId,
  customerName,
  onCustomerSelect,
}: Props) {
  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const facturaIncompleta = facturar && !facturaFormCompleto(facturaForm);
  const esAnticipo = medioPago === "anticipo";
  const anticipoIncompleto =
    esAnticipo && (!customerId || !montoPagado || !balanceDueDate || montoPagado > total);

  // T34 — buscador de cliente (solo para anticipo): mismo debounce 300ms
  // que ya usa CustomersPage.tsx en el admin, sobre el mismo endpoint
  // (GET /admin/customers?search=) — no hay uno nuevo. Estado 100% local a
  // esta pantalla (a diferencia de customerId/customerName, que sí suben a
  // App.tsx porque confirmVenta() los necesita).
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[] | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  useEffect(() => {
    if (!esAnticipo || customerId) return; // ya elegido, no hace falta seguir buscando
    let cancelled = false;
    const term = customerSearch.trim();
    if (term === "") {
      setCustomerResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await apiJson<CustomerSearchResult[]>(`/admin/customers?search=${encodeURIComponent(term)}`);
        if (!cancelled) setCustomerResults(data);
      } catch {
        if (!cancelled) setCustomerResults(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch, esAnticipo, customerId]);

  async function crearCliente() {
    const name = newCustomerName.trim();
    if (!name) return;
    setCustomerError(null);
    setCreatingCustomer(true);
    try {
      const created = await apiJson<{ id: string; name: string }>("/admin/customers", {
        method: "POST",
        body: JSON.stringify({ name, phone: newCustomerPhone.trim() || undefined }),
      });
      onCustomerSelect(created.id, created.name);
      setShowCreateCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setCustomerSearch("");
      setCustomerResults(null);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : "No se pudo crear el cliente");
    } finally {
      setCreatingCustomer(false);
    }
  }

  // T33/11: Productos y Forma de pago pasan a ser dos tabs en vez de una
  // sola pantalla apilada — cada una scrollea de forma independiente dentro
  // de su propio espacio (flex:1 + overflow:auto más abajo), Total/
  // Confirmar venta quedan siempre visibles afuera de las tabs. Esto deja
  // obsoleto el scroll-to-bottom que existía antes para destapar "Confirmar
  // venta" cuando se abría el formulario de facturación (ya no lo empuja
  // fuera de vista, así que se saca).
  const [tab, setTab] = useState<"productos" | "pago">("productos");

  // Stock en vivo por ítem — se pide fresco cada vez que se entra/cambia el
  // carrito (no el que tenía la variante al momento de escanearla), así se ve
  // enseguida si alcanza sin tener que re-escanear ni esperar el error al
  // confirmar (caso real: se registra una entrada mientras hay una venta en
  // curso del mismo producto).
  const [liveStock, setLiveStock] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    items.forEach((item) => {
      if (!item.barcode) return;
      apiJson<VariantByBarcode>(`/admin/variants/by-barcode/${item.barcode}`)
        .then((v) => {
          if (!cancelled) setLiveStock((prev) => ({ ...prev, [item.variantId]: v.stockLocal }));
        })
        .catch(() => {
          if (!cancelled) setLiveStock((prev) => ({ ...prev, [item.variantId]: null }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  return (
    // T34 — mismo fix que VentaAgregadaOkScreen (antes "calc(100vh - 56px)",
    // solo el footer — quedó corto desde que el header pasó a fijo, T33/09).
    <div
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
      }}
    >
      <p style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.navy, marginBottom: 12 }}>
        Venta en curso
      </p>

      {/* T33/11: Productos / Forma de pago como dos tabs — mismo patrón
          segmentado que el resto de la app. */}
      <div style={{ display: "flex", background: colors.gray, borderRadius: radius, padding: 3, marginBottom: 12 }}>
        {(
          [
            { value: "productos", label: items.length > 0 ? `Productos (${items.length})` : "Productos" },
            { value: "pago", label: "Forma de pago" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: radius - 2,
              padding: "9px 4px",
              fontSize: 12,
              fontWeight: 500,
              background: tab === t.value ? colors.white : "transparent",
              color: tab === t.value ? colors.navy : colors.muted,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "productos" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "auto" }}>
        {items.length === 0 && (
          <p style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 20 }}>
            Todavía no agregaste productos
          </p>
        )}
        {items.map((item) => {
          const stock = liveStock[item.variantId];
          const short = stock != null && stock < item.qty;
          return (
            <div
              key={item.variantId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                border: `1px solid ${colors.gray}`,
                borderRadius: radius,
                padding: 8,
              }}
            >
              {/* Thumbnail chico, mismo lenguaje visual que la foto grande de
                  FichaScreen (fondo colors.gray placeholder, objectFit cover,
                  radius del tema) pero a la izquierda de la fila en vez de
                  centrado arriba — patrón estándar de carrito. */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  borderRadius: radius,
                  background: colors.gray,
                  overflow: "hidden",
                }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13 }}>
                  {item.brand ? `${item.brand} — ` : ""}
                  {item.name} ({item.talle}/{item.color})
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                  <button
                    onClick={() => onUpdateQty(item.variantId, item.qty - 1)}
                    aria-label="Restar unidad"
                    style={{ width: 26, height: 26, padding: 0 }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: 13, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.variantId, item.qty + 1)}
                    aria-label="Sumar unidad"
                    style={{ width: 26, height: 26, padding: 0 }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: 12, color: colors.muted }}>
                    {formatPrice(item.unitPrice)} c/u · {formatPrice(item.unitPrice * item.qty)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: short ? colors.danger : colors.muted }}>
                  Stock actual: {stock === undefined ? "…" : (stock ?? "—")}
                  {short ? " · no alcanza" : ""}
                </p>
              </div>
              <button
                onClick={() => onRemove(item.variantId)}
                aria-label="Quitar del carrito"
                style={{ border: "none", background: "none", color: colors.muted, cursor: "pointer", fontSize: 18 }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      )}

      {tab === "pago" && (
      <div style={{ flex: 1, overflow: "auto" }}>
        <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 6px" }}>Medio de pago</p>
        {/* T33/10: mismo patrón de pestaña segmentada que el toggle Vender/
            Recibir mercadería de EscanearScreen (contenedor gris + padding 3 +
            activo recortado en blanco) — antes era un estilo distinto acá
            (botones con borde individual, activo = navy sólido). */}
        <div
          style={{
            display: "flex",
            background: colors.gray,
            borderRadius: radius,
            padding: 3,
            marginBottom: 10,
          }}
        >
          {MEDIOS.map((m) => (
            <button
              key={m.value}
              onClick={() => onMedioPagoChange(m.value)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: radius - 2,
                padding: "8px 4px",
                fontSize: 12,
                fontWeight: 500,
                background: medioPago === m.value ? colors.white : "transparent",
                color: medioPago === m.value ? colors.navy : colors.muted,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {esAnticipo && (
          <div
            style={{
              border: `1px solid ${colors.gray}`,
              borderRadius: radius,
              padding: 10,
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>Cliente</p>

            {customerId ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: colors.off,
                  borderRadius: radius,
                }}
              >
                <span style={{ fontSize: 13 }}>{customerName}</span>
                <button
                  onClick={() => onCustomerSelect("", "")}
                  style={{ border: "none", background: "none", color: colors.muted, fontSize: 12, cursor: "pointer" }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre o email"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
                />
                {customerResults && customerResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onCustomerSelect(c.id, c.name);
                          setCustomerSearch("");
                          setCustomerResults(null);
                        }}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: radius,
                          border: `1px solid ${colors.gray}`,
                          background: colors.white,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </button>
                    ))}
                  </div>
                )}
                {customerResults && customerResults.length === 0 && (
                  <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>Sin resultados.</p>
                )}

                {!showCreateCustomer ? (
                  <button
                    onClick={() => setShowCreateCustomer(true)}
                    style={{
                      alignSelf: "flex-start",
                      border: "none",
                      background: "none",
                      color: colors.navy,
                      fontSize: 12,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    + Crear cliente nuevo
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono (opcional)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
                    />
                    <button
                      onClick={() => void crearCliente()}
                      disabled={creatingCustomer || newCustomerName.trim() === ""}
                      style={{
                        padding: "8px 10px",
                        borderRadius: radius,
                        border: "none",
                        background: colors.navy,
                        color: colors.white,
                        fontSize: 13,
                        cursor: creatingCustomer ? "default" : "pointer",
                        opacity: creatingCustomer || newCustomerName.trim() === "" ? 0.6 : 1,
                      }}
                    >
                      {creatingCustomer ? "Creando..." : "Guardar cliente"}
                    </button>
                    {customerError && (
                      <p style={{ color: colors.danger, fontSize: 12, margin: 0 }}>{customerError}</p>
                    )}
                  </div>
                )}
              </>
            )}

            <p style={{ fontSize: 12, color: colors.muted, margin: "6px 0 0" }}>Monto que paga ahora</p>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={centsToPesosInput(montoPagado)}
              onChange={(e) => onMontoPagadoChange(pesosToCents(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
            />
            {montoPagado != null && montoPagado > 0 && (
              <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>
                Saldo pendiente: {formatPrice(Math.max(total - montoPagado, 0))}
              </p>
            )}
            {montoPagado != null && montoPagado > total && (
              <p style={{ fontSize: 12, color: colors.danger, margin: 0 }}>
                El monto no puede ser mayor al total ({formatPrice(total)}).
              </p>
            )}

            <p style={{ fontSize: 12, color: colors.muted, margin: "6px 0 0" }}>Fecha límite para el saldo</p>
            <input
              type="date"
              value={balanceDueDate}
              onChange={(e) => onBalanceDueDateChange(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
            />
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 2px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Facturar esta venta
          <input
            type="checkbox"
            checked={facturar}
            onChange={(e) => onFacturarChange(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>

        {facturar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={facturaForm.nombre}
              onChange={(e) => onFacturaFormChange({ ...facturaForm, nombre: e.target.value })}
              style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
            />
            <input
              type="email"
              inputMode="email"
              placeholder="Email (para enviar la factura)"
              value={facturaForm.email}
              onChange={(e) => onFacturaFormChange({ ...facturaForm, email: e.target.value })}
              style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="DNI"
              value={facturaForm.dni}
              onChange={(e) => onFacturaFormChange({ ...facturaForm, dni: e.target.value })}
              style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
            />
          </div>
        )}
      </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "10px 0 14px" }}>
        <span style={{ fontSize: 12, color: colors.muted }}>Total</span>
        <span style={{ fontFamily: fonts.display, fontSize: 21, fontWeight: 600, color: colors.navy }}>
          {formatPrice(total)}
        </span>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, margin: "0 0 8px", textAlign: "center" }}>{error}</p>}
      {facturaIncompleta && (
        <p style={{ color: colors.danger, fontSize: 12, margin: "0 0 8px", textAlign: "center" }}>
          Completá nombre, email y DNI para poder facturar
        </p>
      )}
      {anticipoIncompleto && (
        <p style={{ color: colors.danger, fontSize: 12, margin: "0 0 8px", textAlign: "center" }}>
          Elegí un cliente, un monto (no mayor al total) y una fecha límite para el saldo.
        </p>
      )}

      <button
        onClick={onConfirm}
        disabled={items.length === 0 || submitting || facturaIncompleta || anticipoIncompleto}
        style={{
          width: "100%",
          minHeight: 44,
          padding: 10,
          borderRadius: radius,
          border: "none",
          background: colors.accent,
          color: colors.white,
          fontSize: 14,
          fontWeight: 500,
          cursor: items.length === 0 || submitting || facturaIncompleta || anticipoIncompleto ? "default" : "pointer",
          opacity: items.length === 0 || submitting || facturaIncompleta || anticipoIncompleto ? 0.6 : 1,
        }}
      >
        {submitting ? "Confirmando..." : "Confirmar venta"}
      </button>
    </div>
  );
}
