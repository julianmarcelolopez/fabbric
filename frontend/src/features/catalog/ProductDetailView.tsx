import { useState } from "react";
import { formatPrice } from "../../lib/money";
import { ProductCard } from "./ProductCard";
import "./catalog.css";

// Componente PRESENTACIONAL PURO: recibe todo por props, no hace ningún fetch.
// Lo usan el preview en vivo del admin (T2) y la tienda pública (T5) — lo que
// se ve acá es exactamente lo que verá el comprador.
// (Único estado interno: selección efímera de imagen/talle/color/cantidad.)
//
// T20/06: props nuevas (whatsappHref/shippingSummary/address/businessHours/
// related) son todas opcionales — el preview del admin no las pasa, así que
// esas secciones (benefits de envío/WhatsApp, accordion de envíos, relacionados)
// simplemente no aparecen ahí, sin romper nada.

export type PdvVariant = {
  /** presente cuando el consumidor necesita identificar la variante (ej. carrito) */
  id?: string;
  talle: string;
  color: string;
  stockOnline: number;
  priceOverride: number | null;
};

type RelatedProduct = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  imageUrl: string | null;
};

type Props = {
  name: string;
  description: string;
  /** precio base en centavos */
  price: number;
  /** precio anterior en centavos, tachado si es mayor que price — no aplica si hay priceOverride de variante */
  compareAtPrice?: number | null;
  brand?: string | null;
  images: { url: string }[];
  variants: PdvVariant[];
  /** la tienda real (T5) pasa los handlers; el preview los deja deshabilitados */
  onAddToCart?: (variant: PdvVariant, qty: number) => void;
  onBuyNow?: (variant: PdvVariant, qty: number) => void;
  /** WhatsApp real de la org (config.whatsapp ya formateado como href wa.me/…) */
  whatsappHref?: string | null;
  /** resumen de envío armado con zonas reales (ej. "Envío a Quilmes desde $5.000") */
  shippingSummary?: string | null;
  address?: string | null;
  businessHours?: string | null;
  /** otros productos de la misma categoría, ya resueltos por la página pública */
  related?: RelatedProduct[];
  relatedCategoryName?: string | null;
  onRelatedClick?: (productId: string) => void;
};

// T20/06: aproximación visual — el swatch es solo una ayuda de lectura rápida,
// el nombre de color (dato real) siempre se muestra al lado y es la fuente de
// verdad. Nombres no reconocidos caen a un swatch neutro con borde punteado
// en vez de adivinar mal un color.
const COLOR_HEX: Record<string, string> = {
  rojo: "#E53E3E",
  negro: "#2C2C2C",
  blanco: "#F7F7F7",
  azul: "#2B4C7E",
  "azul marino": "#1E2A4A",
  celeste: "#7FB3D5",
  verde: "#4A7C59",
  oliva: "#6B7A4A",
  amarillo: "#E8C547",
  gris: "#8A8278",
  beige: "#D8CBB8",
  crema: "#EFE6D8",
  marron: "#6F4E37",
  marrón: "#6F4E37",
  camel: "#C19A6B",
  rosa: "#E8A0BF",
  violeta: "#7D5BA6",
  morado: "#7D5BA6",
  naranja: "#E07A3E",
  coral: "#F07058",
  bordo: "#7B2D3E",
  bordó: "#7B2D3E",
  dorado: "#C9A227",
  plateado: "#B8B8B8",
  turquesa: "#3FA6A6",
  nude: "#D9B99B",
};

function colorSwatchStyle(color: string): React.CSSProperties {
  const hex = COLOR_HEX[color.trim().toLowerCase()];
  return hex
    ? { background: hex }
    : { background: "var(--gray)", border: "1px dashed var(--muted)" };
}

function Gallery({ name, images }: { name: string; images: { url: string }[] }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, Math.max(images.length - 1, 0))];
  const showNav = images.length > 1;

  return (
    <div className="pdv-gallery">
      <div className="pdv-gallery-main">
        {current ? (
          <img src={current.url} alt={name} />
        ) : (
          <div className="pdv-main placeholder">sin imágenes</div>
        )}
        {showNav && (
          <>
            <div className="pdv-gallery-nav">
              <button
                type="button"
                className="pdv-gallery-btn"
                onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className="pdv-gallery-btn"
                onClick={() => setIndex((i) => (i + 1) % images.length)}
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </div>
            <div className="pdv-gallery-dots">
              {images.map((img, i) => (
                <div
                  key={img.url}
                  className={i === index ? "pdv-gallery-dot active" : "pdv-gallery-dot"}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {showNav && (
        <div className="pdv-thumbs">
          {images.map((img, i) => (
            <div
              key={img.url}
              className={i === index ? "pdv-thumb active" : "pdv-thumb"}
              onClick={() => setIndex(i)}
            >
              <img src={img.url} alt="" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductDetailView({
  name,
  description,
  price,
  compareAtPrice,
  brand,
  images,
  variants,
  onAddToCart,
  onBuyNow,
  whatsappHref,
  shippingSummary,
  address,
  businessHours,
  related,
  relatedCategoryName,
  onRelatedClick,
}: Props) {
  const [talle, setTalle] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const talles = [...new Set(variants.map((v) => v.talle))];
  const talleHasStock = (t: string) => variants.some((v) => v.talle === t && v.stockOnline > 0);
  const colores = [...new Set(variants.filter((v) => talle === null || v.talle === talle).map((v) => v.color))];
  const selected = variants.find((v) => v.talle === talle && v.color === color) ?? null;

  const effectivePrice = selected?.priceOverride ?? price;
  // El tachado es sobre el precio base — si la variante pisa el precio, no se combinan
  const hasDiscount = !selected?.priceOverride && compareAtPrice != null && compareAtPrice > price;
  const installment = Math.round(effectivePrice / 3);

  const canBuy = !!onAddToCart && !!selected && selected.stockOnline > 0;

  return (
    <>
      <div className="pdv">
        <Gallery name={name} images={images} />

      <div className="pdv-info">
        <div className="pdv-meta">
          {brand && <p className="pdv-brand">{brand}</p>}
        </div>
        <h1 className="pdv-name">{name || "Producto sin nombre"}</h1>

        <div className="pdv-prices">
          {hasDiscount && <span className="pdv-price-original">{formatPrice(compareAtPrice!)}</span>}
          <span className="pdv-price-current">{formatPrice(effectivePrice)}</span>
          {hasDiscount && (
            <span className="pdv-price-save">Ahorrás {formatPrice(compareAtPrice! - effectivePrice)}</span>
          )}
        </div>
        <p className="pdv-installments">
          o <strong>3 cuotas sin interés de {formatPrice(installment)}</strong> con todas las tarjetas
        </p>

        <div className="pdv-divider" />

        {talles.length > 0 && (
          <>
            <div className="pdv-selector-label">
              <span className="pdv-selector-title">Talle</span>
              {talle && <span className="pdv-selector-selected">{talle} seleccionado</span>}
            </div>
            <div className="pdv-talles">
              {talles.map((t) => {
                const hasStock = talleHasStock(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!hasStock}
                    className={`pdv-talle-chip${talle === t ? " active" : ""}${hasStock ? "" : " no-stock"}`}
                    onClick={() => {
                      setTalle(t);
                      setColor(null);
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {talle !== null && colores.length > 0 && (
          <>
            <div className="pdv-selector-label">
              <span className="pdv-selector-title">Color</span>
              {color && <span className="pdv-selector-selected">{color} seleccionado</span>}
            </div>
            <div className="pdv-colors">
              {colores.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={color === c ? "pdv-color-option active" : "pdv-color-option"}
                  onClick={() => setColor(c)}
                >
                  <span className="pdv-color-swatch" style={colorSwatchStyle(c)} />
                  <span className="pdv-color-name">{c}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {selected && (
          <p
            className={`pdv-stock-indicator${
              selected.stockOnline === 0 ? " out" : selected.stockOnline <= 3 ? " low" : ""
            }`}
          >
            <span className="pdv-stock-dot" />
            {selected.stockOnline === 0
              ? "Sin stock online"
              : selected.stockOnline <= 3
                ? `Quedan solo ${selected.stockOnline} unidades en talle ${talle} · ${color}`
                : `Stock disponible (${selected.stockOnline})`}
          </p>
        )}

        <div className="pdv-cta-group">
          <div className="pdv-qty-row">
            <div className="pdv-qty-selector">
              <button type="button" className="pdv-qty-btn" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="pdv-qty-value">{qty}</span>
              <button
                type="button"
                className="pdv-qty-btn"
                disabled={!selected || qty >= selected.stockOnline}
                onClick={() => setQty((q) => (selected ? Math.min(selected.stockOnline, q + 1) : q))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pdv-btn-cart"
              disabled={!canBuy}
              onClick={() => selected && onAddToCart?.(selected, qty)}
            >
              🛒{" "}
              {variants.length === 0
                ? "Sin variantes disponibles"
                : !selected
                  ? "Elegí talle y color"
                  : selected.stockOnline === 0
                    ? "Sin stock"
                    : "Agregar al carrito"}
            </button>
          </div>
          {onBuyNow && (
            <button
              type="button"
              className="pdv-btn-buynow"
              disabled={!canBuy}
              onClick={() => selected && onBuyNow(selected, qty)}
            >
              ⚡ Comprar ahora
            </button>
          )}
        </div>

        <div className="pdv-benefits">
          {shippingSummary && (
            <div className="pdv-benefit">
              <span className="pdv-benefit-icon">🚚</span>
              <span className="pdv-benefit-text">{shippingSummary}</span>
            </div>
          )}
          <div className="pdv-benefit">
            <span className="pdv-benefit-icon">🔒</span>
            <span className="pdv-benefit-text">Pago seguro · Mercado Pago</span>
          </div>
          {whatsappHref && (
            <a className="pdv-benefit" href={whatsappHref} target="_blank" rel="noreferrer">
              <span className="pdv-benefit-icon">💬</span>
              <span className="pdv-benefit-text">Consultas por WhatsApp</span>
            </a>
          )}
        </div>

        <div className="pdv-accordion">
          <details className="pdv-accordion-item" open>
            <summary className="pdv-accordion-header">
              Descripción <span className="pdv-accordion-icon">+</span>
            </summary>
            <div className="pdv-accordion-body">{description || "Sin descripción."}</div>
          </details>
          {(address || businessHours || shippingSummary || whatsappHref) && (
            <details className="pdv-accordion-item">
              <summary className="pdv-accordion-header">
                Envíos y cambios <span className="pdv-accordion-icon">+</span>
              </summary>
              <div className="pdv-accordion-body">
                {shippingSummary && <p>{shippingSummary}.</p>}
                {address && <p>Retiro en {address}.</p>}
                {businessHours && <p>Horario de atención: {businessHours}.</p>}
                {whatsappHref && <p>Para cambios o consultas, escribinos por WhatsApp.</p>}
              </div>
            </details>
          )}
        </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <div className="pdv-related">
          <h2 className="pdv-related-title">
            {relatedCategoryName ? `Más de ${relatedCategoryName}` : "También te puede gustar"}
          </h2>
          <div className="pdv-related-grid">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                name={p.name}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                brand={p.brand}
                imageUrl={p.imageUrl}
                onClick={onRelatedClick ? () => onRelatedClick(p.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
