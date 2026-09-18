import type { FacturaAfipInput, MedioPago } from "@fabbric/shared";
import { useEffect, useState } from "react";
import { apiJson } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import { formatPrice } from "../lib/money";
import type { VariantByBarcode } from "../types";

export type CartItem = {
  variantId: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  talle: string;
  color: string;
  unitPrice: number;
  qty: number;
};

type Props = {
  items: CartItem[];
  medioPago: MedioPago;
  onMedioPagoChange: (medioPago: MedioPago) => void;
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
};

// Los tres campos son obligatorios para el backend si se manda `factura` en
// absoluto (ver `facturaAfipSchema` en @fabbric/shared) — no alcanza con
// validar solo el email.
function facturaFormCompleto(form: FacturaAfipInput): boolean {
  return form.nombre.trim() !== "" && /\S+@\S+\.\S+/.test(form.email) && form.dni.trim() !== "";
}

const MEDIOS: { value: MedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "mercadopago", label: "Mercado Pago" },
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
}: Props) {
  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const facturaIncompleta = facturar && !facturaFormCompleto(facturaForm);

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
    <div style={{ padding: 14, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
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

      <button
        onClick={onConfirm}
        disabled={items.length === 0 || submitting || facturaIncompleta}
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
          cursor: items.length === 0 || submitting || facturaIncompleta ? "default" : "pointer",
          opacity: items.length === 0 || submitting || facturaIncompleta ? 0.6 : 1,
        }}
      >
        {submitting ? "Confirmando..." : "Confirmar venta"}
      </button>
    </div>
  );
}
