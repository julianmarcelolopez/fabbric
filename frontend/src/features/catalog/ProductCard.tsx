import { formatPrice } from "../../lib/money";
import "./catalog.css";

// Card presentacional para grillas — preview del home (T3) y tienda pública (T5).

type Props = {
  name: string;
  /** centavos */
  price: number;
  /** precio anterior en centavos, tachado si es mayor que price */
  compareAtPrice?: number | null;
  brand?: string | null;
  imageUrl: string | null;
  onClick?: () => void;
};

export function ProductCard({ name, price, compareAtPrice, brand, imageUrl, onClick }: Props) {
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;
  const discountPct = hasDiscount ? Math.round((1 - price / (compareAtPrice as number)) * 100) : null;

  return (
    <div className="pcard" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="pcard-img-wrap">
        {imageUrl ? <img src={imageUrl} alt={name} loading="lazy" /> : <div className="pcard-ph">sin imagen</div>}
        {hasDiscount && <span className="pcard-badge">−{discountPct}%</span>}
        {onClick && (
          // T20/03: "quick add" lleva a la ficha del producto, no agrega al
          // carrito directo — en indumentaria siempre hay que elegir talle y
          // color primero (decisión del usuario).
          <button
            type="button"
            className="pcard-quick-add"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Ver producto
          </button>
        )}
      </div>
      {brand && <p className="pcard-brand">{brand}</p>}
      <p className="pcard-name">{name}</p>
      <p className="pcard-price">
        {hasDiscount && <span className="pcard-price-original">{formatPrice(compareAtPrice)}</span>}
        {formatPrice(price)}
      </p>
    </div>
  );
}
