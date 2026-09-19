import type { FacturaAfipInput, InvoiceStatus, VentaLocalMedioPago } from "@fabbric/shared";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { apiJson, ApiError } from "./lib/api";
import { supabase } from "./lib/supabaseClient";
import { LoginScreen } from "./LoginScreen";
import { colors, FOOTER_HEIGHT, fonts, HEADER_HEIGHT } from "./lib/theme";
import { AltaScreen } from "./screens/AltaScreen";
import { CarritoScreen, type CartItem } from "./screens/CarritoScreen";
import { ConfirmarScreen } from "./screens/ConfirmarScreen";
import { EntradaOkScreen } from "./screens/EntradaOkScreen";
import { EscanearScreen } from "./screens/EscanearScreen";
import { FichaScreen } from "./screens/FichaScreen";
import { SaldosPendientesScreen } from "./screens/SaldosPendientesScreen";
import { VentaAgregadaOkScreen } from "./screens/VentaAgregadaOkScreen";
import type { VariantByBarcode } from "./types";

// Navegación por estado, sin router (overview.md/analisis.md: solo Escanear y
// Carrito son destinos reales; Alta y Ficha son estados a los que se llega
// por una acción concreta, no lugares a los que se navega libremente).
// entrada-ok / venta-agregada-ok (T27, Fase 1): confirmaciones de pantalla
// completa de "Registrar entrada" / "Agregar a la venta" — también estados,
// no destinos, se llega solo tras ejecutar la acción correspondiente.
// T34 — "saldos" suma un TERCER destino real de navegación (antes solo
// Escanear/Carrito) — a diferencia de las confirmaciones de arriba, sí es
// un lugar al que se navega libremente, no un estado post-acción.
type Screen =
  | { kind: "escanear" }
  | { kind: "alta"; barcode: string }
  | { kind: "ficha"; variant: VariantByBarcode }
  | { kind: "entrada-ok"; qty: number; stockNuevo: number }
  | { kind: "venta-agregada-ok"; nombre: string; countCarrito: number }
  | { kind: "carrito" }
  | { kind: "saldos" }
  | {
      kind: "confirmar";
      total: number;
      medioPago: VentaLocalMedioPago;
      // T34 — solo se completa si medioPago === "anticipo"; ConfirmarScreen
      // lo usa para mostrar "Anticipo $X de $Y — saldo $Z" en vez del total.
      montoPagado: number | null;
      factura: InvoiceStatus | null;
    };

const FACTURA_FORM_VACIO: FacturaAfipInput = { nombre: "", email: "", dni: "" };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "escanear" });

  // Carrito: estado local de la app, no persistido hasta confirmar la venta
  // (Fase 5 — "Agregar a la venta" desde la Ficha lo alimenta).
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medioPago, setMedioPago] = useState<VentaLocalMedioPago>("efectivo");
  // T34 — solo se usan/validan cuando medioPago === "anticipo" (ver
  // CarritoScreen). balanceDueDate vive como string de <input type="date">
  // (ISO yyyy-mm-dd), no como Date — se manda tal cual al backend.
  const [montoPagado, setMontoPagado] = useState<number | null>(null);
  const [balanceDueDate, setBalanceDueDate] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  // T34 — badge de "Saldos" en BottomNav. Se recalcula al cambiar de
  // pantalla (no solo al entrar a "saldos") para que el badge se vea
  // actualizado sin importar dónde esté el vendedor — la query es liviana,
  // no hace falta optimizar con un callback de refresco más fino.
  const [vencidosCount, setVencidosCount] = useState(0);
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

  function addToCart(variant: VariantByBarcode, qty: number) {
    // Sin llamada al backend (estado local hasta confirmar la venta), así que
    // la confirmación se muestra al instante — no hace falta un estado de
    // "procesando" acá (T27, Fase 1).
    const nombre = variant.product.brand
      ? `${variant.product.brand} — ${variant.product.name}`
      : variant.product.name;
    const countCarrito = cart.reduce((sum, it) => sum + it.qty, 0) + qty;

    setCart((prev) => {
      const idx = prev.findIndex((it) => it.variantId === variant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
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
          imageUrl: variant.imageUrl,
          qty,
        },
      ];
    });
    setScreen({ kind: "venta-agregada-ok", nombre, countCarrito });
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((it) => it.variantId !== variantId));
  }

  // Bajar a 0 quita el ítem — mismo criterio que un carrito de e-commerce
  // común, no queda un ítem en cantidad 0 dando vueltas.
  function updateCartQty(variantId: string, qty: number) {
    if (qty <= 0) return removeFromCart(variantId);
    setCart((prev) => prev.map((it) => (it.variantId === variantId ? { ...it, qty } : it)));
  }

  async function confirmVenta() {
    setConfirmError(null);
    setConfirmSubmitting(true);
    const esAnticipo = medioPago === "anticipo";
    try {
      const order = await apiJson<{ total: number; factura: InvoiceStatus | null }>(
        "/admin/orders/venta-local",
        {
          method: "POST",
          body: JSON.stringify({
            items: cart.map((it) => ({ variantId: it.variantId, qty: it.qty })),
            medioPago,
            ...(facturar ? { factura: facturaForm } : {}),
            ...(esAnticipo ? { montoPagado, customerId, balanceDueDate } : {}),
          }),
        }
      );
      setCart([]);
      setFacturar(false);
      setFacturaForm(FACTURA_FORM_VACIO);
      setScreen({
        kind: "confirmar",
        total: order.total,
        medioPago,
        montoPagado: esAnticipo ? montoPagado : null,
        factura: order.factura,
      });
      // T34 — reset del estado de anticipo, mismo criterio que facturar/
      // facturaForm arriba: la próxima venta arranca en blanco. Bug real
      // encontrado en vivo: faltaba resetear medioPago en sí — sin esto,
      // una venta con anticipo dejaba "Anticipo" pegado como default para
      // la siguiente venta (el valor inicial del useState es "efectivo",
      // pero eso solo corre una vez, al montar la app).
      setMedioPago("efectivo");
      setMontoPagado(null);
      setBalanceDueDate("");
      setCustomerId(null);
      setCustomerName(null);
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

  // T34 — recalcula el badge de saldos vencidos al cambiar de pantalla
  // (no solo al entrar a "saldos"), para que se vea al día sin importar
  // dónde esté el vendedor.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    apiJson<{ balanceDueDate: string | null }[]>("/admin/orders?status=partial")
      .then((rows) => {
        if (cancelled) return;
        const hoy = new Date().toISOString().slice(0, 10);
        setVencidosCount(rows.filter((r) => r.balanceDueDate != null && r.balanceDueDate < hoy).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, screen.kind]);

  if (!checkedSession) return null;
  if (!session) return <LoginScreen />;

  const backToEscanear = () => setScreen({ kind: "escanear" });

  // T33/08: header global — antes el logo vivía solo dentro de
  // EscanearScreen, así que desaparecía en Alta/Ficha/Carrito/etc. Se mueve
  // acá (junto a "Cerrar sesión", lo único que ya era global) para que la
  // identidad de marca esté presente en toda la PWA, no solo en Escanear.
  const navActive =
    screen.kind === "carrito" || screen.kind === "confirmar"
      ? "carrito"
      : screen.kind === "saldos"
        ? "saldos"
        : "escanear";
  // BottomNav antes solo se montaba en escanear/carrito (T23/T27: Alta y
  // Ficha son estados de un flujo, no destinos) — se sigue respetando esa
  // restricción de NAVEGACIÓN tal cual (no se agregan links nuevos), pero
  // ahora la barra se muestra igual en todas las pantallas (atenuada/no
  // interactiva) para que el layout no "salte" al entrar a un estado
  // intermedio. T34 — "saldos" suma como TERCER destino real, igual que
  // escanear/carrito (no un estado intermedio) — la barra queda activa ahí.
  const navDisabled = screen.kind !== "escanear" && screen.kind !== "carrito" && screen.kind !== "saldos";

  return (
    // T33/09: header y footer fijos — antes el header vivía en el flujo
    // normal del documento (se iba con el scroll), a diferencia del footer
    // (BottomNav) que ya era position:fixed. paddingTop/paddingBottom acá
    // reservan exactamente el alto de cada barra fija (HEADER_HEIGHT abajo,
    // 56 ya usado desde antes para el footer) para que el contenido no
    // arranque tapado debajo del header ni termine tapado detrás del footer.
    <div style={{ minHeight: "100vh", background: colors.off, color: colors.text, paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          background: colors.off,
        }}
      >
        <p style={{ fontFamily: fonts.script, fontSize: 20, color: colors.navy, margin: 0 }}>Eliathi</p>
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
          onUpdateQty={updateCartQty}
          onConfirm={() => void confirmVenta()}
          facturar={facturar}
          onFacturarChange={setFacturar}
          facturaForm={facturaForm}
          onFacturaFormChange={setFacturaForm}
          submitting={confirmSubmitting}
          error={confirmError}
          montoPagado={montoPagado}
          onMontoPagadoChange={setMontoPagado}
          balanceDueDate={balanceDueDate}
          onBalanceDueDateChange={setBalanceDueDate}
          customerId={customerId}
          customerName={customerName}
          onCustomerSelect={(id, name) => {
            setCustomerId(id || null);
            setCustomerName(name || null);
          }}
        />
      )}
      {screen.kind === "confirmar" && (
        <ConfirmarScreen
          total={screen.total}
          medioPago={screen.medioPago}
          montoPagado={screen.montoPagado}
          factura={screen.factura}
          onDone={backToEscanear}
        />
      )}
      {screen.kind === "saldos" && <SaldosPendientesScreen />}

      <BottomNav
        active={navActive}
        disabled={navDisabled}
        onNavigate={(dest) => setScreen({ kind: dest })}
        cartCount={cart.reduce((sum, it) => sum + it.qty, 0)}
        vencidosCount={vencidosCount}
      />
    </div>
  );
}
