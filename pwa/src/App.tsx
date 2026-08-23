import type { MedioPago } from "@fabbric/shared";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { apiJson, ApiError } from "./lib/api";
import { supabase } from "./lib/supabaseClient";
import { LoginScreen } from "./LoginScreen";
import { AltaScreen } from "./screens/AltaScreen";
import { CarritoScreen, type CartItem } from "./screens/CarritoScreen";
import { ConfirmarScreen } from "./screens/ConfirmarScreen";
import { EscanearScreen } from "./screens/EscanearScreen";
import { FichaScreen } from "./screens/FichaScreen";
import type { VariantByBarcode } from "./types";

// Navegación por estado, sin router (overview.md/analisis.md: solo Escanear y
// Carrito son destinos reales; Alta y Ficha son estados a los que se llega
// por una acción concreta, no lugares a los que se navega libremente).
type Screen =
  | { kind: "escanear" }
  | { kind: "alta"; barcode: string }
  | { kind: "ficha"; variant: VariantByBarcode }
  | { kind: "carrito" }
  | { kind: "confirmar"; total: number; medioPago: MedioPago };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "escanear" });

  // Carrito: estado local de la app, no persistido hasta confirmar la venta
  // (Fase 5 — "Agregar a la venta" desde la Ficha lo alimenta).
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function addToCart(variant: VariantByBarcode) {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.variantId === variant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          name: variant.product.name,
          brand: variant.product.brand,
          talle: variant.talle,
          color: variant.color,
          unitPrice: variant.priceOverride ?? variant.product.price,
          qty: 1,
        },
      ];
    });
    setScreen({ kind: "escanear" });
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((it) => it.variantId !== variantId));
  }

  async function confirmVenta() {
    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      const order = await apiJson<{ total: number }>("/admin/orders/venta-local", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((it) => ({ variantId: it.variantId, qty: it.qty })),
          medioPago,
        }),
      });
      setCart([]);
      setScreen({ kind: "confirmar", total: order.total, medioPago });
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : "No se pudo confirmar la venta");
    } finally {
      setConfirmSubmitting(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckedSession(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  if (!checkedSession) return null;
  if (!session) return <LoginScreen />;

  const backToEscanear = () => setScreen({ kind: "escanear" });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EC", color: "#201f1c", paddingBottom: 56 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 0" }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ border: "none", background: "none", fontSize: 11, color: "#888780", cursor: "pointer" }}
        >
          Cerrar sesión
        </button>
      </div>

      {screen.kind === "escanear" && (
        <EscanearScreen
          onFound={(variant) => setScreen({ kind: "ficha", variant })}
          onNotFound={(barcode) => setScreen({ kind: "alta", barcode })}
        />
      )}
      {screen.kind === "alta" && <AltaScreen barcode={screen.barcode} onDone={backToEscanear} />}
      {screen.kind === "ficha" && (
        <FichaScreen variant={screen.variant} onDone={backToEscanear} onAddToCart={addToCart} />
      )}
      {screen.kind === "carrito" && (
        <CarritoScreen
          items={cart}
          medioPago={medioPago}
          onMedioPagoChange={setMedioPago}
          onRemove={removeFromCart}
          onConfirm={() => void confirmVenta()}
          submitting={confirmSubmitting}
          error={confirmError}
        />
      )}
      {screen.kind === "confirmar" && (
        <ConfirmarScreen total={screen.total} medioPago={screen.medioPago} onDone={backToEscanear} />
      )}

      {(screen.kind === "escanear" || screen.kind === "carrito") && (
        <BottomNav
          active={screen.kind}
          onNavigate={(dest) => setScreen({ kind: dest })}
          cartCount={cart.reduce((sum, it) => sum + it.qty, 0)}
        />
      )}
    </div>
  );
}
