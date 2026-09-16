// Fase 3, Tarea 2: muestra los datos reales resueltos por by-barcode.
// "Registrar entrada" (Fase 4) ya está resuelto acá. "Agregar a la venta"
// queda de placeholder hasta la Fase 5 del plan general.
import { useState } from "react";
import { QtyStepper } from "../components/QtyStepper";
import { apiJson, ApiError } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import type { VariantByBarcode } from "../types";

type Props = {
  variant: VariantByBarcode;
  modo: "venta" | "entrada";
  onDone: () => void;
  onEntradaOk: (info: { qty: number; stockNuevo: number }) => void;
  onAddToCart: (variant: VariantByBarcode, qty: number) => void;
};

// El propio endpoint devuelve la variante ya actualizada — se usa ese
// stockLocal como fuente de verdad para la confirmación (T27, Fase 1), en vez
// de calcularlo a mano sumando qty al valor que tenía la Ficha al abrirse.
type StockMovementResult = { variant: { stockLocal: number } };

export function FichaScreen({ variant, modo, onDone, onEntradaOk, onAddToCart }: Props) {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEntrada() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiJson<StockMovementResult>(`/admin/variants/${variant.id}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ channel: "local", type: "entrada", delta: qty }),
      });
      onEntradaOk({ qty, stockNuevo: result.variant.stockLocal });
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onDone} style={{ border: "none", background: "none", cursor: "pointer" }}>
            ←
          </button>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Ficha de producto</p>
        </div>
        {/* T27, Fase 2: contextualiza por qué acá solo se ve una acción, no las dos. */}
        <span
          style={{
            fontSize: 10,
            background: modo === "entrada" ? colors.gray : colors.accentSoft,
            color: modo === "entrada" ? colors.navy : colors.accent,
            padding: "3px 8px",
            borderRadius: radius - 2,
            fontWeight: 500,
          }}
        >
          Modo: {modo === "entrada" ? "Recibir mercadería" : "Vender"}
        </span>
      </div>

      {/* Ayuda a detectar de un vistazo si el código escaneado/tipeado no es
          el que uno esperaba (ver análisis de códigos compartidos entre
          variantes) — antes no había forma de comparar sin ir a la base. */}
      <p style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.3, margin: "0 0 10px" }}>
        Código {variant.barcode ?? "—"}
      </p>

      <div
        style={{
          // Antes height:140 fijo: con el ancho casi completo del celular,
          // eso da una caja panorámica (~3:1) que recorta la mayor parte de
          // una foto de celular en vertical (~3:4) — dejaba ver solo una
          // franja angosta del centro (a veces la etiqueta, no la prenda).
          // 3:4 es el mismo aspect-ratio que usa el resto del catálogo para
          // fotos de producto (ver pdv-gallery-main en catalog.css). maxWidth
          // la mantiene como miniatura chica y fija en vez de estirarse a lo
          // ancho de la pantalla (que en un iPhone daría una imagen enorme).
          width: "100%",
          maxWidth: 200,
          aspectRatio: "3 / 4",
          borderRadius: radius,
          background: colors.gray,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
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
          <span style={{ color: colors.muted, fontSize: 12 }}>Sin foto</span>
        )}
      </div>

      <p style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 600, color: colors.navy, margin: 0 }}>
        {variant.product.brand ? `${variant.product.brand} — ` : ""}
        {variant.product.name}
      </p>
      <p style={{ fontSize: 13, color: colors.muted, margin: "3px 0 8px" }}>
        Talle {variant.talle} · {variant.color}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.accent }}>
          {priceLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: colors.greenBg,
            color: colors.green,
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: radius - 2,
            fontWeight: 500,
          }}
        >
          Stock: {variant.stockLocal}
        </span>
      </div>

      {error && (
        <p style={{ color: colors.danger, fontSize: 13, margin: "0 0 8px", textAlign: "center" }}>{error}</p>
      )}

      {/* T27, Fase 2: una sola acción visible según el modo elegido en
          Escanear — antes convivían siempre las dos (ver Hallazgo 2.2 de
          docs/T27_UX-PWA/analisis.md). */}
      {modo === "entrada" ? (
        <div>
          <QtyStepper qty={qty} onChange={setQty} disabled={submitting} label="Cantidad recibida" />
          <button
            onClick={() => void handleEntrada()}
            disabled={submitting}
            style={{
              width: "100%",
              minHeight: 44,
              padding: 10,
              borderRadius: radius,
              border: "none",
              background: colors.navy,
              color: colors.white,
              fontSize: 14,
              fontWeight: 500,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      ) : (
        <div>
          <QtyStepper qty={qty} onChange={setQty} disabled={false} label="Cantidad a vender" />
          <button
            onClick={() => onAddToCart(variant, qty)}
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
              cursor: "pointer",
            }}
          >
            Agregar a la venta
          </button>
        </div>
      )}
    </div>
  );
}
