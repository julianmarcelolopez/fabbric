import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { readBarcodes } from "zxing-wasm/reader";
import { ApiError, apiJson } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import type { VariantByBarcode } from "../types";

type Modo = "venta" | "entrada";

type Props = {
  modo: Modo;
  onModoChange: (modo: Modo) => void;
  onFound: (variant: VariantByBarcode) => void;
  onNotFound: (barcode: string) => void;
};

const WARNING_MS = 2200;

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
//
// T27, Fase 3: el mockup (mockups_v5.html:70-78) dibuja una caja navy con
// "CÁMARA LISTA" y scanline animado, simulando una cámara en vivo — esta app
// NO tiene eso (no hay viewfinder, se toma una foto y se decodifica aparte).
// Se decidió no agregar esa caja decorativa: mostraría una funcionalidad que
// no existe. En su lugar, el tratamiento navy del mockup se aplica donde sí
// hay un paralelo funcional real: el botón "Buscar" del código manual.
export function EscanearScreen({ modo, onModoChange, onFound, onNotFound }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  // T27, Fase 2: en modo "Vender", un código no encontrado no lleva a Alta
  // (evita dar de alta productos nuevos por error en medio de una venta) —
  // se avisa acá y se queda en Escanear.
  const [warning, setWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // T33/03 — spike descartable: ¿getUserMedia simple (sin enumerar
  // dispositivos ni elegir deviceId a mano) abre la cámara TRASERA en el
  // iPhone real? En T23 esto falló armado a mano (ver comentario de arriba,
  // punto 1) — acá se prueba la versión más simple posible antes de asumir
  // que sigue fallando. Sin decodificación todavía, solo mostrar el video.
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function toggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => () => clearTimeout(warningTimer.current), []);
  // Cortar el stream al desmontar (cambiar de pantalla) — evita que quede
  // el indicador de cámara prendido si el vendedor navega sin apagarla.
  useEffect(() => () => stopCamera(), []);

  async function handleCode(code: string) {
    try {
      const variant = await apiJson<VariantByBarcode>(
        `/admin/variants/by-barcode/${encodeURIComponent(code)}`
      );
      onFound(variant);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        if (modo === "venta") {
          setWarning(true);
          clearTimeout(warningTimer.current);
          warningTimer.current = setTimeout(() => setWarning(false), WARNING_MS);
          return;
        }
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
      // Formatos de indumentaria/retail: EAN/UPC (el caso normal), + Code128/
      // Code39/Codabar/DataBar por si algún proveedor usa otro esquema.
      // Deliberadamente SIN "ITF"/"ITF14" (a diferencia del "AllLinear" que
      // se usaba antes): ITF es un formato de logística (cajas/embalaje,
      // siempre con cantidad par de dígitos) que nunca aparece en una
      // etiqueta de indumentaria real — pero zxing a veces confunde un
      // EAN-13 borroso/con mal encuadre con un ITF válido y devuelve un
      // resultado con un dígito de más, con total confianza (caso real:
      // "0333242180304" de 13 dígitos leído como "03332421803043" de 14).
      // Sacando ITF del set, esa lectura ambigua ahora falla limpio en vez
      // de guardar un código incorrecto sin que nadie se dé cuenta.
      const results = await readBarcodes(file, {
        formats: ["EAN13", "EAN8", "UPCA", "UPCE", "Code128", "Code39", "Codabar", "DataBar"],
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

  const titulo = modo === "venta" ? "Escanear para vender" : "Escanear para recibir mercadería";

  return (
    <div style={{ padding: 14 }}>
      <p style={{ fontFamily: fonts.script, fontSize: 20, color: colors.navy, margin: "0 0 10px" }}>Eliathi</p>

      <div style={{ display: "flex", background: colors.gray, borderRadius: radius, padding: 3, marginBottom: 14 }}>
        {(
          [
            { value: "venta", label: "Vender" },
            { value: "entrada", label: "Recibir mercadería" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onModoChange(opt.value)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: radius - 2,
              padding: "9px 4px",
              fontSize: 12,
              fontWeight: 500,
              background: modo === opt.value ? colors.white : "transparent",
              color: modo === opt.value ? colors.navy : colors.muted,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.navy, marginBottom: 12 }}>
        {titulo}
      </p>

      {warning && (
        <p
          style={{
            background: colors.dangerBg,
            color: colors.danger,
            borderRadius: radius,
            padding: "10px 12px",
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Código no encontrado. Cambiá a "Recibir mercadería" para darlo de alta.
        </p>
      )}

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
          background: colors.accent,
          color: colors.white,
          fontSize: 15,
          cursor: decoding ? "default" : "pointer",
          opacity: decoding ? 0.7 : 1,
        }}
      >
        {decoding ? "Leyendo código..." : "Sacar foto del código de barras"}
      </button>

      {error && (
        <p style={{ color: colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>
      )}

      {/* T33/03 — spike descartable, no es UI final. Se saca si el resultado es no-go, o se reemplaza por el viewfinder real de la Fase 2 si es go. */}
      <div style={{ marginTop: 16, padding: 10, border: `1px dashed ${colors.muted}`, borderRadius: 12 }}>
        <p style={{ fontSize: 11, color: colors.muted, margin: "0 0 8px", textAlign: "center" }}>
          T33 — spike de cámara en vivo (temporal)
        </p>
        <button
          onClick={() => void toggleCamera()}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 10,
            border: `1px solid ${colors.navy}`,
            background: cameraOn ? colors.navy : colors.white,
            color: cameraOn ? colors.white : colors.navy,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {cameraOn ? "Apagar cámara" : "Probar cámara en vivo"}
        </button>
        {cameraError && (
          <p style={{ color: colors.danger, fontSize: 12, marginTop: 8, textAlign: "center" }}>
            Error: {cameraError}
          </p>
        )}
        {cameraOn && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: "100%", marginTop: 10, borderRadius: 8, background: "#000" }}
          />
        )}
      </div>

      <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", margin: "16px 0 8px" }}>
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
            borderRadius: radius,
            border: `1px solid ${colors.gray}`,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={manualSubmitting || manualCode.trim() === ""}
          style={{
            padding: "8px 14px",
            borderRadius: radius,
            border: "none",
            background: colors.navy,
            color: colors.white,
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
