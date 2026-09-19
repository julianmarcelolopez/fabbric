import { colors, FOOTER_HEIGHT, fonts, HEADER_HEIGHT, radius } from "../lib/theme";

// T27, Fase 1: confirmación visible tras "Registrar entrada" (hoy la app
// vuelve a Escanear sin ninguna señal de que la operación se ejecutó). Solo
// se llega acá después de que el backend confirmó el movimiento — ver
// FichaScreen.handleEntrada, que espera la respuesta real antes de navegar.
// Sin auto-avance a propósito (ajuste posterior): un cartel que desaparece
// solo no garantiza que el vendedor lo haya visto — tiene que confirmarlo
// tocando el botón.
type Props = {
  qty: number;
  stockNuevo: number;
  onDone: () => void;
};

export function EntradaOkScreen({ qty, stockNuevo, onDone }: Props) {
  return (
    <div
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // T34 — mismo fix que VentaAgregadaOkScreen (ver ese comentario).
        minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
        gap: 10,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: colors.greenBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: colors.green,
        }}
      >
        ✓
      </div>
      <p style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.navy, marginTop: 6 }}>
        Entrada registrada
      </p>
      <p style={{ fontSize: 13, color: colors.muted }}>
        +{qty} {qty === 1 ? "unidad" : "unidades"} · Stock ahora: {stockNuevo}
      </p>

      <button
        onClick={onDone}
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: 16,
          padding: 10,
          borderRadius: radius,
          border: "none",
          background: colors.navy,
          color: colors.white,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Seguir recibiendo
      </button>
    </div>
  );
}
