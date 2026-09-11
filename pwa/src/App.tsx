import type { FacturaAfipInput, InvoiceStatus, MedioPago } from "@fabbric/shared";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { apiJson, ApiError } from "./lib/api";
import { supabase } from "./lib/supabaseClient";
import { LoginScreen } from "./LoginScreen";
import { colors } from "./lib/theme";
import { AltaScreen } from "./screens/AltaScreen";
import { CarritoScreen, type CartItem } from "./screens/CarritoScreen";
import { ConfirmarScreen } from "./screens/ConfirmarScreen";
import { EntradaOkScreen } from "./screens/EntradaOkScreen";
import { EscanearScreen } from "./screens/EscanearScreen";
import { FichaScreen } from "./screens/FichaScreen";
import { VentaAgregadaOkScreen } from "./screens/VentaAgregadaOkScreen";
import type { VariantByBarcode } from "./types";

// Navegación por estado, sin router (overview.md/analisis.md: solo Escanear y
// Carrito son destinos reales; Alta y Ficha son estados a los que se llega
// por una acción concreta, no lugares a los que se navega libremente).
// entrada-ok / venta-agregada-ok (T27, Fase 1): confirmaciones de pantalla
// completa de "Registrar entrada" / "Agregar a la venta" — también estados,
// no destinos, se llega solo tras ejecutar la acción correspondiente.
type Screen =
  | { kind: "escanear" }
  | { kind: "alta"; barcode: string }
  | { kind: "ficha"; variant: VariantByBarcode }
  | { kind: "entrada-ok"; qty: number; stockNuevo: number }
  | { kind: "venta-agregada-ok"; nombre: string; countCarrito: number }
  | { kind: "carrito" }
  | { kind: "confirmar"; total: number; medioPago: MedioPago; factura: InvoiceStatus | null };

const FACTURA_FORM_VACIO: FacturaAfipInput = { nombre: "", email: "", dni: "" };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "escanear" });

  // Carrito: estado local de la app, no persistido hasta confirmar la venta
  // (Fase 5 — "Agregar a la venta" desde la Ficha lo alimenta).
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  // T27, Fase 2: estado de sesión de la PWA, no se persiste ni se manda al
  // backend — decide qué acción se ve en la Ficha y qué hace un 404 al
  // escanear (ver docs/T27_UX-PWA/tareas/02-modo-vender-recibir-mercaderia).
  const [modo, setModo] = useState<"venta" | "entrada">("venta");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // T25 — apagado por default: no cambia nada del comportamiento de T23 hasta
  // que el vendedor lo activa a propósito.
  const [facturar, setFacturar] = useState(false);
  const [facturaForm, setFacturaForm] = useState<FacturaAfipInput>(FACTURA_FORM_VACIO);

  function addToCart(variant: VariantByBarcode) {
    // Sin llamada al backend (estado local hasta confirmar la venta), así que
    // la confirmación se muestra al instante — no hace falta un estado de
    // "procesando" acá (T27, Fase 1).
    const nombre = variant.product.brand
      ? `${variant.product.brand} — ${variant.product.name}`
      : variant.product.name;
    const countCarrito = cart.reduce((sum, it) => sum + it.qty, 0) + 1;

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
          barcode: variant.barcode,
          name: variant.product.name,
          brand: variant.product.brand,
          talle: variant.talle,
          color: variant.color,
          unitPrice: variant.priceOverride ?? variant.product.price,
          qty: 1,
        },
      ];
    });
    setScreen({ kind: "venta-agregada-ok", nombre, countCarrito });
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((it) => it.variantId !== variantId));
  }

  async function confirmVenta() {
    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      const order = await apiJson<{ total: number; factura: InvoiceStatus | null }>(
        "/admin/orders/venta-local",
        {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((it) => ({ variantId: it.variantId, qty: it.qty })),
            medioPago,
            ...(facturar ? { factura: facturaForm } : {}),
          }),
        }
      );
      setCart([]);
      setFacturar(false);
      setFacturaForm(FACTURA_FORM_VACIO);
      setScreen({ kind: "confirmar", total: order.total, medioPago, factura: order.factura });
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
    <div style={{ minHeight: "100vh", background: colors.off, color: colors.text, paddingBottom: 56 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 0" }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ border: "none", background: "none", fontSize: 11, color: colors.muted, cursor: "pointer" }}
        >
          Cerrar sesión
        </button>
      </div>

      {screen.kind === "escanear" && (
        <EscanearScreen
          modo={modo}
          onModoChange={setModo}
          onFound={(variant) => setScreen({ kind: "ficha", variant })}
          onNotFound={(barcode) => setScreen({ kind: "alta", barcode })}
        />
      )}
      {screen.kind === "alta" && <AltaScreen barcode={screen.barcode} onDone={backToEscanear} />}
      {screen.kind === "ficha" && (
        <FichaScreen
          variant={screen.variant}
          modo={modo}
          onDone={backToEscanear}
          onEntradaOk={(info) => setScreen({ kind: "entrada-ok", ...info })}
          onAddToCart={addToCart}
        />
      )}
      {screen.kind === "entrada-ok" && (
        <EntradaOkScreen qty={screen.qty} stockNuevo={screen.stockNuevo} onDone={backToEscanear} />
      )}
      {screen.kind === "venta-agregada-ok" && (
        <VentaAgregadaOkScreen
          nombre={screen.nombre}
          countCarrito={screen.countCarrito}
          onDone={backToEscanear}
          onIrCarrito={() => setScreen({ kind: "carrito" })}
        />
      )}
      {screen.kind === "carrito" && (
        <CarritoScreen
          items={cart}
          medioPago={medioPago}
          onMedioPagoChange={setMedioPago}
          onRemove={removeFromCart}
          onConfirm={() => void confirmVenta()}
          facturar={facturar}
          onFacturarChange={setFacturar}
          facturaForm={facturaForm}
          onFacturaFormChange={setFacturaForm}
          submitting={confirmSubmitting}
          error={confirmError}
        />
      )}
      {screen.kind === "confirmar" && (
        <ConfirmarScreen
          total={screen.total}
          medioPago={screen.medioPago}
          factura={screen.factura}
          onDone={backToEscanear}
        />
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
