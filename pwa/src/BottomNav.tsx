import { colors } from "./lib/theme";

type Dest = "escanear" | "carrito" | "saldos";

type Props = {
  active: Dest;
  onNavigate: (dest: Dest) => void;
  cartCount: number;
  // T34 — cantidad de pedidos `partial` con balanceDueDate vencida, para el
  // badge de "Saldos" (mismo lenguaje visual que el badge de Carrito).
  vencidosCount: number;
  // T33/08: la barra ahora se monta en TODAS las pantallas (antes solo en
  // escanear/carrito) para que el layout no salte al entrar a un estado
  // intermedio (Alta/Ficha/Confirmar/etc.) — pero esos estados siguen sin
  // ser destinos de navegación real (T23/T27), así que ahí se muestra
  // atenuada y no clickeable en vez de agregar links nuevos.
  disabled?: boolean;
};

const LABELS: Record<Dest, string> = {
  escanear: "Escanear",
  carrito: "Carrito",
  // T34 — tercer destino real de la navegación (antes solo Escanear/Carrito).
  saldos: "Saldos",
};

// T27, Fase 3: fondo navy sólido, calcado de mockups_v5.html — antes fondo
// blanco/gris genérico, sin relación con la identidad de la tienda.
export function BottomNav({ active, onNavigate, cartCount, vencidosCount, disabled = false }: Props) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        background: colors.navy,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {(["escanear", "carrito", "saldos"] as const).map((dest) => {
        const badgeCount = dest === "carrito" ? cartCount : dest === "saldos" ? vencidosCount : 0;
        return (
          <button
            key={dest}
            onClick={() => onNavigate(dest)}
            disabled={disabled}
            style={{
              position: "relative",
              flex: 1,
              border: "none",
              background: "transparent",
              padding: 10,
              fontSize: 11,
              cursor: disabled ? "default" : "pointer",
              color: !disabled && active === dest ? colors.accent : "rgba(255, 255, 255, 0.55)",
            }}
          >
            {LABELS[dest]}
            {badgeCount > 0 && (
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
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
