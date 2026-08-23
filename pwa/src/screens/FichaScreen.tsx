// Fase 3, Tarea 2: muestra los datos reales resueltos por by-barcode.
// "Registrar entrada" (Fase 4) ya está resuelto acá. "Agregar a la venta"
// queda de placeholder hasta la Fase 5 del plan general.
import { useState } from "react";
import { apiJson, ApiError } from "../lib/api";
import type { VariantByBarcode } from "../types";

type Props = {
  variant: VariantByBarcode;
  onDone: () => void;
  onAddToCart: (variant: VariantByBarcode) => void;
};

export function FichaScreen({ variant, onDone, onAddToCart }: Props) {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEntrada() {
    setError(null);
    setSubmitting(true);
    try {
      await apiJson(`/admin/variants/${variant.id}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ channel: "local", type: "entrada", delta: qty }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la entrada");
    } finally {
      setSubmitting(false);
    }
  }

  const priceCents = variant.priceOverride ?? variant.product.price;
  const priceLabel = (priceCents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={onDone} style={{ border: "none", background: "none", cursor: "pointer" }}>
          ←
        </button>
        <p style={{ fontSize: 14, fontWeight: 500 }}>Ficha de producto</p>
      </div>

      <div
        style={{
          height: 140,
          borderRadius: 8,
          background: "#eeece6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        {variant.imageUrl ? (
          <img
            src={variant.imageUrl}
            alt={variant.product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#888780", fontSize: 12 }}>Sin foto</span>
        )}
      </div>

      <p style={{ fontSize: 15, fontWeight: 500 }}>
        {variant.product.brand ? `${variant.product.brand} — ` : ""}
        {variant.product.name}
      </p>
      <p style={{ fontSize: 13, color: "#5f5e5a", margin: "2px 0 8px" }}>
        Talle {variant.talle} · {variant.color} · {priceLabel}
      </p>
      <span
        style={{
          display: "inline-block",
          background: "#eaf3de",
          color: "#3b6d11",
          fontSize: 12,
          padding: "3px 10px",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        Stock: {variant.stockLocal}
      </span>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={submitting || qty <= 1}
          style={{ width: 32, padding: 4 }}
        >
          −
        </button>
        <span style={{ fontSize: 14, minWidth: 20, textAlign: "center" }}>{qty}</span>
        <button onClick={() => setQty((q) => q + 1)} disabled={submitting} style={{ width: 32, padding: 4 }}>
          +
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#888780", textAlign: "center", margin: "0 0 10px" }}>
        Cantidad (aplica a "Registrar entrada")
      </p>

      {error && (
        <p style={{ color: "#a32d2d", fontSize: 13, margin: "0 0 8px", textAlign: "center" }}>{error}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => void handleEntrada()}
          disabled={submitting}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#eeece6",
            fontSize: 14,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Registrando..." : "Registrar entrada"}
        </button>
        <button
          onClick={() => onAddToCart(variant)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#FF6B4A",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Agregar a la venta
        </button>
      </div>
    </div>
  );
}
