import { colors } from "../lib/theme";

// Extraído de FichaScreen (T27): mismo control de +/- reusado ahora también
// en el alta por escaneo, misma cantidad mínima (1).
export function QtyStepper({
  qty,
  onChange,
  disabled,
  label,
}: {
  qty: number;
  onChange: (qty: number) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <button
          onClick={() => onChange(Math.max(1, qty - 1))}
          disabled={disabled || qty <= 1}
          style={{ width: 32, padding: 4 }}
        >
          −
        </button>
        <span style={{ fontSize: 14, minWidth: 20, textAlign: "center" }}>{qty}</span>
        <button onClick={() => onChange(qty + 1)} disabled={disabled} style={{ width: 32, padding: 4 }}>
          +
        </button>
      </div>
      <p style={{ fontSize: 11, color: colors.muted, textAlign: "center", margin: "6px 0 10px" }}>{label}</p>
    </div>
  );
}
