import type { InvoiceStatus, VentaLocalMedioPago } from "@fabbric/shared";
import { useState } from "react";
import { apiDownload, ApiError } from "../lib/api";
import { colors, FOOTER_HEIGHT, fonts, HEADER_HEIGHT, radius } from "../lib/theme";
import { formatPrice } from "../lib/money";

const MEDIO_LABELS: Record<VentaLocalMedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
  anticipo: "Anticipo",
};

type Props = {
  total: number;
  medioPago: VentaLocalMedioPago;
  // T34 — solo no-null cuando medioPago === "anticipo".
  montoPagado: number | null;
  factura: InvoiceStatus | null;
  onDone: () => void;
};

export function ConfirmarScreen({ total, medioPago, montoPagado, factura, onDone }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [descargaError, setDescargaError] = useState<string | null>(null);

  async function descargarPdf() {
    if (!factura) return;
    setDescargaError(null);
    setDescargando(true);
    try {
      await apiDownload(`/admin/invoices/${factura.id}/pdf`, `factura-${factura.numero}.pdf`);
    } catch (err) {
      setDescargaError(err instanceof ApiError ? err.message : "No se pudo descargar la factura");
    } finally {
      setDescargando(false);
    }
  }

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
      <p style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 600, color: colors.navy, marginTop: 6 }}>
        Venta registrada
      </p>
      {/* T34 — anticipo muestra lo cobrado ahora + el saldo, no el total a
          secas (el vendedor necesita ver de un vistazo cuánto quedó pendiente). */}
      {medioPago === "anticipo" && montoPagado != null ? (
        <p style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
          Anticipo {formatPrice(montoPagado)} de {formatPrice(total)}
          <br />
          Saldo pendiente: {formatPrice(total - montoPagado)}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: colors.muted }}>
          Total {formatPrice(total)} · {MEDIO_LABELS[medioPago]}
        </p>
      )}

      {/* T25 — sin toggle activado, factura es null y esta sección no aparece:
          la pantalla queda idéntica a la de T23. */}
      {factura?.estado === "emitida" && (
        <div style={{ width: "100%", marginTop: 6 }}>
          <button
            onClick={() => void descargarPdf()}
            disabled={descargando}
            style={{
              width: "100%",
              minHeight: 44,
              padding: 10,
              borderRadius: radius,
              border: `1px solid ${colors.gray}`,
              background: colors.white,
              color: colors.text,
              fontSize: 14,
              cursor: descargando ? "default" : "pointer",
              opacity: descargando ? 0.6 : 1,
            }}
          >
            {descargando ? "Descargando..." : "Descargar factura (PDF)"}
          </button>
          {descargaError && (
            <p style={{ color: colors.danger, fontSize: 12, marginTop: 6, textAlign: "center" }}>{descargaError}</p>
          )}
        </div>
      )}

      {/* pendiente/error: aviso tranquilo, sin sugerir que el vendedor tiene
          que hacer algo — el reintento es cosa del admin de escritorio (Fase 6). */}
      {(factura?.estado === "pendiente" || factura?.estado === "error") && (
        <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 6 }}>
          La factura se está terminando de procesar. No hace falta que hagas nada — se va a resolver solo.
        </p>
      )}

      {/* T27, Fase 3: navy (no coral) — a diferencia de las confirmaciones de
          entrada/venta, que usan el color de su propia acción, esta pantalla
          cierra el circuito completo (venta ya cobrada), calcado de
          mockups_v5.html:194. */}
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
        Volver a escanear
      </button>
    </div>
  );
}
