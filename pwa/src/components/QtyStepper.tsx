import { colors } from "../lib/theme";

// Extraído de FichaScreen (T27): mismo control de +/- reusado ahora también
// en el alta por escaneo, misma cantidad mínima (1).
export function QtyStepper({
  qty,
  onChange,
  disabled,
  label,
  max,
}: {
  qty: number;
  onChange: (qty: number) => void;
  disabled: boolean;
  label: string;
  // T37 — tope opcional (ej. stock disponible): el "+" se desactiva al
  // llegarlo en vez de dejar seguir sumando de más.
  max?: number;
}) {
  const atMax = max != null && qty >= max;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(1, qty - 1))}
          disabled={disabled || qty <= 1}
          style={{ width: 32, padding: 4 }}
        >
          −
        </button>
        <span style={{ fontSize: 14, minWidth: 20, textAlign: "center" }}>{qty}</span>
        <button
          type="button"
          onClick={() => onChange(max != null ? Math.min(max, qty + 1) : qty + 1)}
          disabled={disabled || atMax}
          style={{ width: 32, padding: 4 }}
        >
          +
        </button>
      </div>
      <p style={{ fontSize: 11, color: colors.muted, textAlign: "center", margin: "6px 0 10px" }}>
        {label}
        {atMax && " (máximo disponible)"}
      </p>
    </div>
  );
}
