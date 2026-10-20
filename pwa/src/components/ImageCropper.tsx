import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { colors, radius } from "../lib/theme";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el recorte");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen recortada"))), "image/jpeg", 0.9);
  });
}

// T37 — paso de recorte entre elegir/sacar la foto y subirla: el usuario
// puede encuadrar la prenda (arrastrar + zoom) antes de que se suba la
// imagen final. Cuadrado fijo (aspect=1) — coincide con las tarjetas de
// producto del catálogo (.pcard-img-wrap, aspect-ratio:1), que son donde
// más se ve la foto en miniatura.
export function ImageCropper({ imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setArea(croppedAreaPixels);
  }, []);

  async function confirm() {
    if (!area) return;
    setError(null);
    setProcessing(true);
    try {
      const blob = await cropToBlob(imageSrc, area);
      onConfirm(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recortar la imagen");
      setProcessing(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ padding: 16, background: colors.white }}>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: "100%", marginBottom: 12 }}
        />
        {error && (
          <p style={{ color: colors.danger, fontSize: 13, margin: "0 0 8px" }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius,
              border: `1px solid ${colors.gray}`,
              background: colors.white,
              color: colors.text,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Elegir otra
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={processing || !area}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius,
              border: "none",
              background: colors.accent,
              color: colors.white,
              fontSize: 14,
              cursor: processing ? "default" : "pointer",
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? "Procesando..." : "Usar foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
