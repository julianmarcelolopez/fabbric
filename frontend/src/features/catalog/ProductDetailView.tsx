import { useState } from "react";
import { formatPrice } from "../../lib/money";
import "./catalog.css";

// Componente PRESENTACIONAL PURO: recibe todo por props, no hace ningún fetch.
// Lo usan el preview en vivo del admin (T2) y la tienda pública (T5) — lo que
// se ve acá es exactamente lo que verá el comprador.
// (Único estado interno: selección efímera de imagen/talle/color del visitante.)

export type PdvVariant = {
  /** presente cuando el consumidor necesita identificar la variante (ej. carrito) */
  id?: string;
  talle: string;
  color: string;
  stockOnline: number;
  priceOverride: number | null;
};

type Props = {
  name: string;
  description: string;
  /** precio base en centavos */
  price: number;
  images: { url: string }[];
  variants: PdvVariant[];
  /** la tienda real (T5) pasa el handler; el preview lo deja deshabilitado */
  onAddToCart?: (variant: PdvVariant) => void;
};

export function ProductDetailView({ name, description, price, images, variants, onAddToCart }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [talle, setTalle] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const talles = [...new Set(variants.map((v) => v.talle))];
  const colores = [...new Set(variants.filter((v) => talle === null || v.talle === talle).map((v) => v.color))];
  const selected = variants.find((v) => v.talle === talle && v.color === color) ?? null;

  const effectivePrice = selected?.priceOverride ?? price;
  const mainImage = images[Math.min(imgIndex, Math.max(images.length - 1, 0))];

  return (
    <div className="pdv">
      <div className="pdv-gallery">
        {mainImage ? (
          <img className="pdv-main" src={mainImage.url} alt={name} />
        ) : (
          <div className="pdv-main placeholder">sin imágenes</div>
        )}
        {images.length > 1 && (
          <div className="pdv-thumbs">
            {images.map((img, i) => (
              <img
                key={img.url}
                src={img.url}
                alt=""
                className={i === imgIndex ? "sel" : ""}
                onClick={() => setImgIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pdv-info">
        <h3>{name || "Producto sin nombre"}</h3>
        <p className="pdv-price">{formatPrice(effectivePrice)}</p>

        {talles.length > 0 && (
          <>
            <p className="pdv-label">Talle</p>
            <div className="pdv-chips">
              {talles.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pdv-chip${talle === t ? " sel" : ""}`}
                  onClick={() => {
                    setTalle(t);
                    setColor(null);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {talle !== null && colores.length > 0 && (
          <>
            <p className="pdv-label">Color</p>
            <div className="pdv-chips">
              {colores.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pdv-chip${color === c ? " sel" : ""}`}
                  onClick={() => setColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {selected && (
          <p className={`pdv-stock${selected.stockOnline === 0 ? " out" : ""}`}>
            {selected.stockOnline === 0
              ? "Sin stock online"
              : selected.stockOnline <= 3
                ? `¡Últimas ${selected.stockOnline} unidades!`
                : `Stock disponible (${selected.stockOnline})`}
          </p>
        )}

        {description && <p className="pdv-desc">{description}</p>}

        <button
          type="button"
          className="pdv-buy"
          disabled={!onAddToCart || !selected || selected.stockOnline === 0}
          onClick={() => selected && onAddToCart?.(selected)}
        >
          {variants.length === 0
            ? "Sin variantes disponibles"
            : !selected
              ? "Elegí talle y color"
              : selected.stockOnline === 0
                ? "Sin stock"
                : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
