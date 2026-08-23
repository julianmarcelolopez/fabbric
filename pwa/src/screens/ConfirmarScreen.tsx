import type { MedioPago } from "@fabbric/shared";
import { formatPrice } from "../lib/money";

const MEDIO_LABELS: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
};

type Props = {
  total: number;
  medioPago: MedioPago;
  onDone: () => void;
};

export function ConfirmarScreen({ total, medioPago, onDone }: Props) {
  return (
    <div
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 56px)",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "#eaf3de",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: "#3b6d11",
        }}
      >
        ✓
      </div>
      <p style={{ fontSize: 15, fontWeight: 500 }}>Venta registrada</p>
      <p style={{ fontSize: 13, color: "#5f5e5a" }}>
        Total {formatPrice(total)} · {MEDIO_LABELS[medioPago]}
      </p>
      <button
        onClick={onDone}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 10,
          borderRadius: 8,
          border: "none",
          background: "#FF6B4A",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Volver a escanear
      </button>
    </div>
  );
}
