import { formatPrice } from "../../lib/money";
import "./catalog.css";

// Card presentacional para grillas — preview del home (T3) y tienda pública (T5).

type Props = {
  name: string;
  /** centavos */
  price: number;
  imageUrl: string | null;
  onClick?: () => void;
};

export function ProductCard({ name, price, imageUrl, onClick }: Props) {
  return (
    <div className="pcard" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      {imageUrl ? <img src={imageUrl} alt={name} /> : <div className="pcard-ph">sin imagen</div>}
      <p className="pcard-name">{name}</p>
      <p className="pcard-price">{formatPrice(price)}</p>
    </div>
  );
}
