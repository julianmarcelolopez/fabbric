import type { InvoiceStatus, MedioPago } from "@fabbric/shared";
import { useState } from "react";
import { apiDownload, ApiError } from "../lib/api";
import { formatPrice } from "../lib/money";

const MEDIO_LABELS: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
};

type Props = {
  total: number;
  medioPago: MedioPago;
  factura: InvoiceStatus | null;
  onDone: () => void;
};

export function ConfirmarScreen({ total, medioPago, factura, onDone }: Props) {
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
        minHeight: "calc(100vh - 56px)",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "#eaf3de",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: "#3b6d11",
        }}
      >
        ✓
      </div>
      <p style={{ fontSize: 15, fontWeight: 500 }}>Venta registrada</p>
      <p style={{ fontSize: 13, color: "#5f5e5a" }}>
        Total {formatPrice(total)} · {MEDIO_LABELS[medioPago]}
      </p>

      {/* T25 — sin toggle activado, factura es null y esta sección no aparece:
          la pantalla queda idéntica a la de T23. */}
      {factura?.estado === "emitida" && (
        <div style={{ width: "100%", marginTop: 6 }}>
          <button
            onClick={() => void descargarPdf()}
            disabled={descargando}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cac7ba",
              background: "#fff",
              color: "#201f1c",
              fontSize: 14,
              cursor: descargando ? "default" : "pointer",
              opacity: descargando ? 0.6 : 1,
            }}
          >
            {descargando ? "Descargando..." : "Descargar factura (PDF)"}
          </button>
          {descargaError && (
            <p style={{ color: "#a32d2d", fontSize: 12, marginTop: 6, textAlign: "center" }}>{descargaError}</p>
          )}
        </div>
      )}

      {/* pendiente/error: aviso tranquilo, sin sugerir que el vendedor tiene
          que hacer algo — el reintento es cosa del admin de escritorio (Fase 6). */}
      {(factura?.estado === "pendiente" || factura?.estado === "error") && (
        <p style={{ fontSize: 12, color: "#888780", textAlign: "center", marginTop: 6 }}>
          La factura se está terminando de procesar. No hace falta que hagas nada — se va a resolver solo.
        </p>
      )}

      <button
        onClick={onDone}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 10,
          borderRadius: 8,
          border: "none",
          background: "#FF6B4A",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Volver a escanear
      </button>
    </div>
  );
}
