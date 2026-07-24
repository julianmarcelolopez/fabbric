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
  return (
    <div className="pcard" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      {imageUrl ? <img src={imageUrl} alt={name} /> : <div className="pcard-ph">sin imagen</div>}
      {brand && <p className="pcard-brand">{brand}</p>}
      <p className="pcard-name">{name}</p>
      <p className="pcard-price">
        {hasDiscount && <span className="pcard-price-original">{formatPrice(compareAtPrice)}</span>}
        {formatPrice(price)}
      </p>
    </div>
  );
}
