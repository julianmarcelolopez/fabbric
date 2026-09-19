import type { MedioPago } from "@fabbric/shared";
import { useEffect, useState } from "react";
import { apiJson, ApiError } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import { centsToPesosInput, formatPrice, pesosToCents } from "../lib/money";

// Subconjunto de AdminOrderRow (backend/src/modules/orders/routes.ts,
// GET /admin/orders) que usa esta pantalla — el endpoint devuelve más
// campos (type, itemCount, etc.) que acá no hacen falta.
type PedidoPartial = {
  id: string;
  orderNumber: number;
  customerName: string | null;
  total: number;
  saldoPendiente: number;
  balanceDueDate: string | null;
};

// T34 — sin "anticipo" acá: registrar un cobro sobre el saldo no es un
// anticipo nuevo, es la segunda (o tercera) parte de la misma venta.
const MEDIOS: { value: MedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "mercadopago", label: "Mercado Pago" },
];

// Comparación de strings ISO (yyyy-mm-dd) — alcanza, ambos lados tienen el
// mismo formato, no hace falta parsear a Date para esto.
function vencido(balanceDueDate: string | null): boolean {
  if (!balanceDueDate) return false;
  return balanceDueDate < new Date().toISOString().slice(0, 10);
}

function formatFecha(balanceDueDate: string): string {
  return new Date(`${balanceDueDate}T00:00:00`).toLocaleDateString("es-AR");
}

export function SaldosPendientesScreen() {
  const [pedidos, setPedidos] = useState<PedidoPartial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Fila expandida con el formulario de cobro — una sola a la vez, sin
  // necesidad de un Screen nuevo en App.tsx (mismo criterio que las tabs
  // locales de CarritoScreen).
  const [openId, setOpenId] = useState<string | null>(null);
  const [monto, setMonto] = useState<number | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");
  const [submitting, setSubmitting] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);

  async function cargar() {
    setError(null);
    try {
      const data = await apiJson<PedidoPartial[]>("/admin/orders?status=partial");
      setPedidos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los saldos pendientes");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  function abrir(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
    setMonto(null);
    setMedioPago("efectivo");
    setCobroError(null);
  }

  async function registrarCobro(pedido: PedidoPartial) {
    if (!monto) return;
    setCobroError(null);
    setSubmitting(true);
    try {
      await apiJson(`/admin/orders/${pedido.id}/cobrar-saldo`, {
        method: "POST",
        body: JSON.stringify({ monto, medioPago }),
      });
      setOpenId(null);
      // Recarga la lista completa — el pedido cobrado sale sola si pasó a
      // "paid" (el filtro es status=partial), o se ve con el saldo nuevo
      // si fue un cobro parcial.
      await cargar();
    } catch (err) {
      setCobroError(err instanceof ApiError ? err.message : "No se pudo registrar el cobro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <p style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 600, color: colors.navy, marginBottom: 12 }}>
        Saldos pendientes
      </p>

      {error && (
        <p style={{ color: colors.danger, fontSize: 13, textAlign: "center", marginTop: 20 }}>{error}</p>
      )}
      {pedidos === null && !error && (
        <p style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 20 }}>Cargando...</p>
      )}
      {pedidos !== null && pedidos.length === 0 && (
        <p style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 20 }}>
          No hay saldos pendientes.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pedidos?.map((p) => {
          const esVencido = vencido(p.balanceDueDate);
          return (
            <div key={p.id} style={{ border: `1px solid ${colors.gray}`, borderRadius: radius, padding: 10 }}>
              <button
                onClick={() => abrir(p.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                  {p.customerName ?? "Sin cliente"} · #{p.orderNumber}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: colors.navy, fontWeight: 600 }}>
                    Saldo {formatPrice(p.saldoPendiente)}
                  </span>
                  <span style={{ fontSize: 12, color: esVencido ? colors.danger : colors.muted }}>
                    {p.balanceDueDate
                      ? `${esVencido ? "Vencido" : "Vence"} ${formatFecha(p.balanceDueDate)}`
                      : "Sin fecha límite"}
                  </span>
                </div>
              </button>

              {openId === p.id && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${colors.gray}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", background: colors.gray, borderRadius: radius, padding: 3 }}>
                    {MEDIOS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMedioPago(m.value)}
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: radius - 2,
                          padding: "8px 4px",
                          fontSize: 12,
                          fontWeight: 500,
                          background: medioPago === m.value ? colors.white : "transparent",
                          color: medioPago === m.value ? colors.navy : colors.muted,
                          cursor: "pointer",
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Monto a cobrar"
                    value={centsToPesosInput(monto)}
                    onChange={(e) => setMonto(pesosToCents(e.target.value))}
                    style={{ padding: "8px 10px", borderRadius: radius, border: `1px solid ${colors.gray}`, fontSize: 14 }}
                  />
                  {monto != null && monto > p.saldoPendiente && (
                    <p style={{ color: colors.danger, fontSize: 12, margin: 0 }}>
                      No puede ser mayor al saldo ({formatPrice(p.saldoPendiente)}).
                    </p>
                  )}
                  {cobroError && <p style={{ color: colors.danger, fontSize: 12, margin: 0 }}>{cobroError}</p>}
                  <button
                    onClick={() => void registrarCobro(p)}
                    disabled={submitting || !monto || monto > p.saldoPendiente}
                    style={{
                      padding: 10,
                      borderRadius: radius,
                      border: "none",
                      background: colors.accent,
                      color: colors.white,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: submitting ? "default" : "pointer",
                      opacity: submitting || !monto || monto > p.saldoPendiente ? 0.6 : 1,
                    }}
                  >
                    {submitting ? "Registrando..." : "Registrar cobro"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
