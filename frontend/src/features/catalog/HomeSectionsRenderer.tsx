import { ProductCard } from "./ProductCard";
import "./catalog.css";

// Componente PRESENTACIONAL PURO: recibe la lista ordenada de secciones por props,
// no hace ningún fetch. Lo usan el preview en vivo del admin (T3) y la portada
// real de la tienda pública (T5) — mismo componente, misma portada.
//
// Reglas de render (documentadas en docs/T3_HomeSections/README.md):
// - Solo secciones visible=true Y refActive=true (toggles independientes)
// - Refs borrados (refName null) se saltean defensivamente
// - Secciones sin productos no se muestran

export type HsrSection = {
  id: string;
  refName: string | null;
  visible: boolean;
  refActive: boolean;
  products: { id: string; name: string; price: number; imageUrl: string | null }[];
};

type Props = {
  sections: HsrSection[];
  onProductClick?: (productId: string) => void;
};

export function HomeSectionsRenderer({ sections, onProductClick }: Props) {
  const renderable = sections.filter(
    (s) => s.visible && s.refActive && s.refName !== null && s.products.length > 0
  );

  if (renderable.length === 0) {
    return <p className="hsr-empty">No hay secciones para mostrar todavía.</p>;
  }

  return (
    <div className="hsr">
      {renderable.map((section) => (
        <section key={section.id} className="hsr-section">
          <h2 className="hsr-title">{section.refName}</h2>
          <div className="hsr-grid">
            {section.products.map((p) => (
              <ProductCard
                key={p.id}
                name={p.name}
                price={p.price}
                imageUrl={p.imageUrl}
                onClick={onProductClick ? () => onProductClick(p.id) : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
