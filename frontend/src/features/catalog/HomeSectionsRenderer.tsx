import { Link } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import "./catalog.css";

// Componente PRESENTACIONAL PURO: recibe la lista ordenada de secciones por props,
// no hace ningún fetch. Lo usan el preview en vivo del admin (T3/T19-07) y la
// portada real de la tienda pública (T5) — mismo componente, misma portada.
//
// Reglas de render (documentadas en docs/T3_HomeSections/README.md):
// - Solo secciones visible=true Y refActive=true (toggles independientes)
// - Refs borrados (refName null) se saltean defensivamente
// - Secciones sin productos no se muestran

export type HsrSection = {
  id: string;
  refName: string | null;
  refSlug?: string | null;
  /** T21/01 — imagen real de categoría/colección; null = placeholder de color (T20/04-05) */
  refImageUrl?: string | null;
  refType?: "category" | "collection";
  visible: boolean;
  refActive: boolean;
  /** Cantidad real detrás de esta sección — si es mayor a products.length, hay más de 8 (T19/10) */
  totalCount?: number;
  products: {
    id: string;
    name: string;
    price: number;
    compareAtPrice?: number | null;
    brand?: string | null;
    imageUrl: string | null;
  }[];
};

type Props = {
  sections: HsrSection[];
  onProductClick?: (productId: string) => void;
  /** slug de la tienda — si se pasa, habilita el link "Ver todos" en secciones de categoría con más de 8 productos (T19/10) */
  storeSlug?: string;
};

export function HomeSectionsRenderer({ sections, onProductClick, storeSlug }: Props) {
  const renderable = sections.filter(
    (s) => s.visible && s.refActive && s.refName !== null && s.products.length > 0
  );

  if (renderable.length === 0) {
    return <p className="hsr-empty">No hay secciones para mostrar todavía.</p>;
  }

  return (
    <div className="hsr">
      {renderable.map((section) => {
        const showViewAll =
          !!storeSlug &&
          section.refType === "category" &&
          !!section.refSlug &&
          (section.totalCount ?? section.products.length) > section.products.length;
        return (
          <section key={section.id} className="hsr-section">
            <div className="hsr-section-head">
              <h2 className="hsr-title">{section.refName}</h2>
              {showViewAll && (
                <Link className="hsr-viewall" to={`/store/${storeSlug}/c/${section.refSlug}`}>
                  Ver todos →
                </Link>
              )}
            </div>
            <div className="hsr-grid">
              {section.products.map((p) => (
                <ProductCard
                  key={p.id}
                  name={p.name}
                  price={p.price}
                  compareAtPrice={p.compareAtPrice}
                  brand={p.brand}
                  imageUrl={p.imageUrl}
                  onClick={onProductClick ? () => onProductClick(p.id) : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
