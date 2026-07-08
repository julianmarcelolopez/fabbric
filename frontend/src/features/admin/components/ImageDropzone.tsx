import { useRef, useState, type DragEvent } from "react";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import type { ProductImage } from "../types";

type Props = {
  productId: string;
  images: ProductImage[];
  onChange: () => void;
};

export function ImageDropzone({ productId, images, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await apiUpload(`/admin/products/${productId}/images`, file);
      }
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError(null);
    try {
      await apiJson(`/admin/products/${productId}/images/order`, {
        method: "PUT",
        body: JSON.stringify({ imageIds: ids }),
      });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function remove(image: ProductImage) {
    if (!confirm("¿Borrar esta imagen?")) return;
    setError(null);
    try {
      await apiJson(`/admin/images/${image.id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <div className="card">
      <h2>Imágenes</h2>
      {error && <p className="error">{error}</p>}

      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {uploading ? "Subiendo…" : "Arrastrá imágenes acá o hacé click (JPEG/PNG/WebP, máx 10 MB)"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {images.map((img, i) => (
            <div key={img.id} className="imgrow">
              <img src={img.url} alt="" />
              <span className="muted" style={{ flex: 1 }}>#{i + 1}</span>
              <button className="btn small" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button className="btn small" disabled={i === images.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button className="btn small danger" onClick={() => remove(img)}>Borrar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
