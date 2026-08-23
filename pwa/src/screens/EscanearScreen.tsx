import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { readBarcodes } from "zxing-wasm/reader";
import { ApiError, apiJson } from "../lib/api";
import type { VariantByBarcode } from "../types";

type Props = {
  onFound: (variant: VariantByBarcode) => void;
  onNotFound: (barcode: string) => void;
};

// Enfoque final (T23, Fase 3 Tarea 2), tras una sesión larga de pruebas en un
// iPhone 13 real:
//
// 1) Escaneo en vivo (html5-qrcode, con y sin selector de cámara propio):
//    la selección de cámara se resolvió (Html5QrcodeScanner sí abría la
//    trasera), pero el DECODER nunca leyó un código de barras real, ni
//    siquiera con una foto nítida — el motor que trae esa librería (zxing en
//    JavaScript puro) es sabidamente débil para códigos lineales (EAN/UPC),
//    a diferencia de QR. Se abandonó por completo, no solo la config.
// 2) Este enfoque: <input capture="environment"> para la foto (mecanismo
//    nativo del navegador, ya probado que abre bien la cámara trasera en
//    iOS — no pasa por getUserMedia ni por el bug de selección de cámara) +
//    `zxing-wasm` para decodificar (el motor REAL de ZXing en C++,
//    compilado a WebAssembly — mucho más preciso que la versión JS).
export function EscanearScreen({ onFound, onNotFound }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCode(code: string) {
    try {
      const variant = await apiJson<VariantByBarcode>(
        `/admin/variants/by-barcode/${encodeURIComponent(code)}`
      );
      onFound(variant);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        onNotFound(code);
        return;
      }
      setError(err instanceof Error ? err.message : "Error al buscar el código");
    }
  }

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto si hace falta reintentar
    if (!file) return;

    setError(null);
    setDecoding(true);
    try {
      // "AllLinear": todos los formatos de código de barras lineales
      // (EAN/UPC/Code128/Code39/ITF/Codabar/DataBar/...) — nunca QR, no hace
      // falta para etiquetas de indumentaria.
      const results = await readBarcodes(file, {
        formats: ["AllLinear"],
        tryHarder: true,
      });
      if (results.length === 0) {
        setError("No se detectó ningún código en la foto. Probá con más luz, más cerca, y bien enfocado.");
        return;
      }
      await handleCode(results[0].text);
    } catch (err) {
      setError("Error al leer la foto: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDecoding(false);
    }
  }

  // Respaldo cuando la foto no alcanza — mismo camino que un código
  // decodificado, solo que el texto lo escribe el vendedor.
  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualSubmitting(true);
    await handleCode(code);
    setManualSubmitting(false);
  }

  return (
    <div style={{ padding: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: "#5f5e5a", marginBottom: 12 }}>Escanear</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void handlePhoto(e)}
        style={{ display: "none" }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={decoding}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 12,
          border: "none",
          background: "#FF6B4A",
          color: "#fff",
          fontSize: 15,
          cursor: decoding ? "default" : "pointer",
          opacity: decoding ? 0.7 : 1,
        }}
      >
        {decoding ? "Leyendo código..." : "Sacar foto del código de barras"}
      </button>

      {error && (
        <p style={{ color: "#a32d2d", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>
      )}

      <p style={{ fontSize: 12, color: "#888780", textAlign: "center", margin: "16px 0 8px" }}>
        o escribilo a mano
      </p>
      <form onSubmit={(e) => void handleManualSubmit(e)} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Código de barras"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cac7ba",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={manualSubmitting || manualCode.trim() === ""}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#FF6B4A",
            color: "#fff",
            fontSize: 14,
            cursor: manualSubmitting ? "default" : "pointer",
            opacity: manualSubmitting || manualCode.trim() === "" ? 0.6 : 1,
          }}
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
