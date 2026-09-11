import { colors } from "./lib/theme";

type Dest = "escanear" | "carrito";

type Props = {
  active: Dest;
  onNavigate: (dest: Dest) => void;
  cartCount: number;
};

// Únicos dos destinos reales de la navegación (overview.md/analisis.md) —
// Alta y Ficha son estados a los que se llega por una acción, no por acá.
// T27, Fase 3: fondo navy sólido, calcado de mockups_v5.html — antes fondo
// blanco/gris genérico, sin relación con la identidad de la tienda.
export function BottomNav({ active, onNavigate, cartCount }: Props) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        background: colors.navy,
      }}
    >
      {(["escanear", "carrito"] as const).map((dest) => (
        <button
          key={dest}
          onClick={() => onNavigate(dest)}
          style={{
            position: "relative",
            flex: 1,
            border: "none",
            background: "transparent",
            padding: 10,
            fontSize: 11,
            cursor: "pointer",
            color: active === dest ? colors.accent : "rgba(255, 255, 255, 0.55)",
          }}
        >
          {dest === "escanear" ? "Escanear" : "Carrito"}
          {dest === "carrito" && cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: "calc(50% - 28px)",
                background: colors.accent,
                color: colors.white,
                fontSize: 10,
                borderRadius: 8,
                minWidth: 15,
                height: 15,
                lineHeight: "15px",
                textAlign: "center",
                padding: "0 3px",
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
