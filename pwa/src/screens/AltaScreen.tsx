import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiJson, apiUpload, ApiError } from "../lib/api";
import { pesosToCents } from "../lib/money";
import { colors, fonts, radius } from "../lib/theme";

type Props = {
  barcode: string;
  onDone: () => void;
};

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

// Alta atómica (producto + variante en una transacción, POST
// /admin/products/alta-rapida — Tarea 1 de esta fase). La foto va DESPUÉS,
// como paso aparte: no puede ser atómica con lo anterior (multipart, y
// necesita el id del producto ya creado) — pero como el producto ya queda
// completo y vendible sin ella, un fallo acá no es grave, se puede
// reintentar sin perder los datos del formulario (ver overview.md).
type AltaRapidaResult = {
  product: { id: string };
};

export function AltaScreen({ barcode, onDone }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [talle, setTalle] = useState("");
  const [color, setColor] = useState("");
  const [precio, setPrecio] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Una vez creado el producto (paso 1 ok), pasamos al paso de la foto.
  const [productId, setProductId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiJson<Category[]>("/admin/categories")
      .then(setCategories)
      .catch(() => setFormError("No se pudieron cargar las categorías."));
    // T29 — catálogo real de marcas en vez de texto libre. No es obligatorio
    // que cargue para poder tipear (el datalist es solo sugerencia, ver el
    // input de más abajo) — sin catch propio, un fallo acá no bloquea el alta.
    apiJson<Brand[]>("/admin/brands").then(setBrands).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const priceCents = pesosToCents(precio);
    if (!categoryId) return setFormError("Elegí una categoría.");
    if (!marca.trim() || !modelo.trim() || !talle.trim() || !color.trim()) {
      return setFormError("Completá marca, modelo, talle y color.");
    }
    if (priceCents === null) return setFormError("Precio inválido.");

    setSubmitting(true);
    try {
      const result = await apiJson<AltaRapidaResult>("/admin/products/alta-rapida", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          name: modelo.trim(),
          // T29 — siempre newBrandName (nunca brandId resuelto en el
          // cliente): resolveBrandId en el backend decide por slug si reusa
          // una marca existente o la crea al vuelo, igual que en el admin.
          newBrandName: marca.trim(),
          price: priceCents,
          talle: talle.trim(),
          color: color.trim(),
          barcode,
        }),
      });
      setProductId(result.product.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError(`Ya existe un producto con el código ${barcode}.`);
      } else {
        setFormError(err instanceof Error ? err.message : "Error al guardar el producto");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhoto(file: File) {
    if (!productId) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      await apiUpload(`/admin/products/${productId}/images`, file);
      onDone();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ── Paso 2: foto (el producto ya existe y es completo, esto es opcional) ──
  if (productId) {
    return (
      <div style={{ padding: 14 }}>
        <p style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.navy, marginBottom: 12 }}>
          Foto del producto
        </p>
        <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
          El producto ya se guardó. Sacale una foto (opcional, se puede agregar después).
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handlePhoto(file);
          }}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          style={{
            width: "100%",
            minHeight: 44,
            padding: "12px",
            borderRadius: radius,
            border: "none",
            background: colors.accent,
            color: colors.white,
            fontSize: 14,
            cursor: uploadingPhoto ? "default" : "pointer",
            opacity: uploadingPhoto ? 0.7 : 1,
          }}
        >
          {uploadingPhoto ? "Subiendo foto..." : "Sacar foto"}
        </button>

        {photoError && (
          <p style={{ color: colors.danger, fontSize: 13, marginTop: 12, textAlign: "center" }}>
            {photoError}
          </p>
        )}

        <button
          onClick={onDone}
          style={{
            display: "block",
            margin: "14px auto 0",
            border: "none",
            background: "none",
            color: colors.muted,
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Continuar sin foto por ahora
        </button>
      </div>
    );
  }

  // ── Paso 1: formulario ──────────────────────────────────────────────────
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={onDone} style={{ border: "none", background: "none", cursor: "pointer" }}>
          ←
        </button>
        <p style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600, color: colors.navy }}>
          Producto nuevo
        </p>
      </div>
      <p style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>Código {barcode}</p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="text"
          placeholder="Marca"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          list="alta-marcas"
          style={inputStyle}
        />
        {/* T29 — elegir una marca existente o escribir una nueva (alta
            inline al guardar) — mismo patrón simple que el combo del admin,
            sin agregar ninguna librería de combobox a la PWA. */}
        <datalist id="alta-marcas">
          {brands.map((b) => (
            <option key={b.id} value={b.name} />
          ))}
        </datalist>
        <input
          type="text"
          placeholder="Modelo"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
          style={inputStyle}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
          <option value="">Categoría...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Talle"
            value={talle}
            onChange={(e) => setTalle(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="text"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          style={inputStyle}
        />

        {formError && (
          <p style={{ color: colors.danger, fontSize: 13, margin: 0 }}>{formError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            minHeight: 44,
            padding: "10px",
            borderRadius: radius,
            border: "none",
            background: colors.accent,
            color: colors.white,
            fontSize: 14,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {submitting ? "Guardando..." : "Guardar producto"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: radius,
  border: `1px solid ${colors.gray}`,
  fontSize: 14,
};
