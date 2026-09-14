import { colors, fonts, radius } from "../lib/theme";

// T27, Fase 1: confirmación visible tras "Agregar a la venta" (hoy la app
// vuelve a Escanear sin ninguna señal — la única pista era el badge chico del
// carrito en la bottom nav). addToCart es local/síncrono (no pega al
// backend), así que se llega acá al instante, sin estado de carga.
// Sin auto-avance a propósito (ajuste posterior): el vendedor elige a
// propósito "Seguir vendiendo" o "Ir al carrito" — un cartel que desaparece
// solo no garantiza que lo haya visto.
type Props = {
  nombre: string;
  countCarrito: number;
  onDone: () => void;
  onIrCarrito: () => void;
};

export function VentaAgregadaOkScreen({ nombre, countCarrito, onDone, onIrCarrito }: Props) {
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
          background: colors.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.accent,
        }}
      >
        {/* Ícono de bolsa inline (sin librería ni emoji — el emoji de bolsa
            no renderiza de forma confiable en todos los navegadores/teléfonos). */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      </div>
      <p style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.navy, marginTop: 6 }}>
        Agregado al carrito
      </p>
      <p style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
        {nombre} · {countCarrito} {countCarrito === 1 ? "producto" : "productos"} en el carrito
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
          background: colors.accent,
          color: colors.white,
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Seguir vendiendo
      </button>
      <button
        onClick={onIrCarrito}
        style={{
          border: "none",
          background: "none",
          color: colors.muted,
          fontSize: 13,
          textDecoration: "underline",
          cursor: "pointer",
          padding: "4px 0 0",
        }}
      >
        Ir al carrito
      </button>
    </div>
  );
}
