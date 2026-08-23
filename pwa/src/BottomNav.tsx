type Dest = "escanear" | "carrito";

type Props = {
  active: Dest;
  onNavigate: (dest: Dest) => void;
  cartCount: number;
};

// Únicos dos destinos reales de la navegación (overview.md/analisis.md) —
// Alta y Ficha son estados a los que se llega por una acción, no por acá.
export function BottomNav({ active, onNavigate, cartCount }: Props) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        borderTop: "1px solid #e2e0d8",
        background: "#fff",
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
            color: active === dest ? "#FF6B4A" : "#5f5e5a",
          }}
        >
          {dest === "escanear" ? "Escanear" : "Carrito"}
          {dest === "carrito" && cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: "calc(50% - 28px)",
                background: "#FF6B4A",
                color: "#fff",
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
