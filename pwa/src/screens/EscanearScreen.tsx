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

// Formatos de indumentaria/retail: EAN/UPC (el caso normal), + Code128/
// Code39/Codabar/DataBar por si algún proveedor usa otro esquema.
// Deliberadamente SIN "ITF"/"ITF14" (a diferencia del "AllLinear" que se
// usaba antes): ITF es un formato de logística (cajas/embalaje, siempre con
// cantidad par de dígitos) que nunca aparece en una etiqueta de indumentaria
// real — pero zxing a veces confunde un EAN-13 borroso/con mal encuadre con
// un ITF válido y devuelve un resultado con un dígito de más, con total
// confianza (caso real: "0333242180304" de 13 dígitos leído como
// "03332421803043" de 14). Sacando ITF del set, esa lectura ambigua ahora
// falla limpio en vez de guardar un código incorrecto sin que nadie se dé
// cuenta. Compartido entre la foto (handlePhoto) y el escaneo en vivo
// (decodeFrame, T33) — un cambio de formatos no debe hacerse en dos lugares.
const BARCODE_FORMATS = ["EAN13", "EAN8", "UPCA", "UPCE", "Code128", "Code39", "Codabar", "DataBar"] as const;

// T33, Fase 2: intervalo del loop de escaneo en vivo — no cada frame (WASM
// de más, batería de más), pero suficientemente seguido para sentirse
// instantáneo.
const DECODE_INTERVAL_MS = 250;

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
// "CÁMARA LISTA" y scanline animado, simulando una cámara en vivo — en su
// momento esta app NO tenía eso (se tomaba una foto y se decodificaba
// aparte). Eso cambió en T33: un spike confirmó que `getUserMedia` simple
// (sin enumerar dispositivos ni elegir deviceId a mano, a diferencia del
// intento fallido del punto 1) SÍ abre bien la cámara trasera en el iPhone
// real — lo que fallaba antes era el decoder de `html5-qrcode`, no la idea
// de escanear en vivo. `zxing-wasm` (mismo motor de arriba) también acepta
// `ImageData`, no solo `Blob`/`File`, así que ahora decodifica frames de
// video en vivo con el mismo motor fuerte que ya decodificaba fotos. El
// flujo de foto se mantiene igual (fallback, ver docs/T33_EscaneoEnVivo/
// analisis.md sección 7 — decisión de si se saca del todo, pendiente).
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
  // El loop de decodificación en vivo (más abajo) arranca un setInterval una
  // sola vez, cuando cameraOn pasa a true — su closure captura `modo` tal
  // como estaba en ese momento. Sin este ref, si el vendedor cambia
  // Vender/Recibir mientras la cámara sigue prendida, handleCode seguiría
  // usando el modo viejo hasta apagar y prender la cámara de nuevo.
  const modoRef = useRef(modo);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  // T33 — escaneo en vivo. `cameraOn` prende/apaga el stream; el loop de
  // decodificación corre mientras esté prendido (efecto de abajo).
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Evita solapar decodeFrame() si una llamada a readBarcodes tarda más que
  // DECODE_INTERVAL_MS (WASM, no siempre es instantáneo) — sin este guard,
  // el setInterval podría arrancar una segunda decodificación mientras la
  // primera sigue en curso.
  const decodeBusyRef = useRef(false);

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
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } },
        });
      } catch (err) {
        // Fallback SOLO para poder iterar en la PC (sin cámara trasera
        // declarada, ver plan.md Fase 2) — en el iPhone real "exact" siempre
        // resuelve (confirmado en T33/04), así que este catch no debería
        // dispararse nunca ahí. No es un cambio de comportamiento para
        // producción, es habilitar el desarrollo local.
        const name = err instanceof Error ? err.name : "";
        if (name !== "OverconstrainedError") throw err;
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      // No asignar acá: el <video> todavía no existe en el DOM (se monta
      // recién cuando cameraOn pase a true, más abajo, por el render
      // condicional) — el efecto de abajo lo conecta una vez montado.
      setCameraOn(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : String(err));
    }
  }

  async function decodeFrame() {
    if (decodeBusyRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // readyState < 2 (HAVE_CURRENT_DATA): todavía no hay un frame real para
    // capturar (justo después de play(), por ejemplo) — esperar al próximo tick.
    if (!video || !canvas || video.readyState < 2) return;

    decodeBusyRef.current = true;
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const results = await readBarcodes(imageData, { formats: [...BARCODE_FORMATS], tryHarder: true });
      if (results.length > 0) {
        stopCamera();
        await handleCode(results[0].text);
      }
    } catch {
      // Un frame fallido no es un error real (desenfoque de movimiento,
      // ángulo momentáneo) — se reintenta solo en el próximo tick, sin
      // mostrar nada al vendedor.
    } finally {
      decodeBusyRef.current = false;
    }
  }

  // Conecta el stream al <video> una vez que el elemento existe (recién
  // montado, cameraOn ya en true — ver comentario de toggleCamera sobre el
  // timing) y arranca el loop de decodificación. El cleanup (cuando
  // cameraOn vuelve a false, o al desmontar la pantalla) corta el interval
  // — junto con stopCamera() cortando el stream, no queda nada corriendo
  // en segundo plano.
  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    const timer = setInterval(() => void decodeFrame(), DECODE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [cameraOn]);

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
        if (modoRef.current === "venta") {
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
      const results = await readBarcodes(file, { formats: [...BARCODE_FORMATS], tryHarder: true });
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

      <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", margin: "16px 0 8px" }}>
        o escaneá en vivo
      </p>
      <button
        onClick={() => void toggleCamera()}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 12,
          border: `1px solid ${colors.navy}`,
          background: cameraOn ? colors.navy : colors.white,
          color: cameraOn ? colors.white : colors.navy,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        {cameraOn ? "Apagar cámara" : "Escanear con la cámara"}
      </button>

      {cameraError && (
        <p style={{ color: colors.danger, fontSize: 13, marginTop: 8, textAlign: "center" }}>
          No se pudo abrir la cámara: {cameraError}
        </p>
      )}

      {cameraOn && (
        <div style={{ position: "relative", marginTop: 10, borderRadius: 12, overflow: "hidden" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: "100%", display: "block", background: "#000" }}
          />
          {/* Viewfinder — puramente visual, no recorta el frame que se decodifica (siempre se procesa el video completo). */}
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: "10%",
              right: "10%",
              height: "30%",
              border: `2px solid ${colors.accent}`,
              borderRadius: 8,
              pointerEvents: "none",
            }}
          />
          <p
            style={{
              position: "absolute",
              bottom: 8,
              left: 0,
              right: 0,
              textAlign: "center",
              color: colors.white,
              fontSize: 12,
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              margin: 0,
            }}
          >
            Apuntá al código de barras
          </p>
          {/* Fuera de pantalla: acá se dibuja cada frame para decodificarlo (decodeFrame), nunca se muestra. */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}

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
