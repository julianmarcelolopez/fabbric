import type { MedioPago } from "@fabbric/shared";
import { useEffect, useState } from "react";
import { apiJson } from "../lib/api";
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
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
};

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
  onConfirm,
  submitting,
  error,
}: Props) {
  const total = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

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
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Venta en curso</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "auto" }}>
        {items.length === 0 && (
          <p style={{ fontSize: 13, color: "#888780", textAlign: "center", marginTop: 20 }}>
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
                alignItems: "center",
                gap: 10,
                border: "1px solid #e2e0d8",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13 }}>
                  {item.brand ? `${item.brand} — ` : ""}
                  {item.name} ({item.talle}/{item.color})
                </p>
                <p style={{ fontSize: 12, color: "#888780" }}>
                  {formatPrice(item.unitPrice)} x{item.qty}
                </p>
                <p style={{ fontSize: 11, color: short ? "#a32d2d" : "#888780", marginTop: 2 }}>
                  Stock actual: {stock === undefined ? "…" : (stock ?? "—")}
                  {short ? " · no alcanza" : ""}
                </p>
              </div>
              <button
                onClick={() => onRemove(item.variantId)}
                aria-label="Quitar del carrito"
                style={{ border: "none", background: "none", color: "#888780", cursor: "pointer", fontSize: 18 }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "#5f5e5a", margin: "10px 0 6px" }}>Medio de pago</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {MEDIOS.map((m) => (
          <button
            key={m.value}
            onClick={() => onMedioPagoChange(m.value)}
            style={{
              flex: 1,
              fontSize: 12,
              padding: "6px 4px",
              borderRadius: 8,
              border: medioPago === m.value ? "none" : "1px solid #cac7ba",
              background: medioPago === m.value ? "#FF6B4A" : "transparent",
              color: medioPago === m.value ? "#fff" : "#201f1c",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 14px", fontSize: 14 }}>
        <span style={{ color: "#5f5e5a" }}>Total</span>
        <span style={{ fontWeight: 500 }}>{formatPrice(total)}</span>
      </div>

      {error && <p style={{ color: "#a32d2d", fontSize: 13, margin: "0 0 8px", textAlign: "center" }}>{error}</p>}

      <button
        onClick={onConfirm}
        disabled={items.length === 0 || submitting}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "none",
          background: "#FF6B4A",
          color: "#fff",
          fontSize: 14,
          cursor: items.length === 0 || submitting ? "default" : "pointer",
          opacity: items.length === 0 || submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Confirmando..." : "Confirmar venta"}
      </button>
    </div>
  );
}
