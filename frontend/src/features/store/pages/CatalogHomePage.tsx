import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { HomeSectionsRenderer } from "../../catalog/HomeSectionsRenderer";
import type { PublicHomeSection, StoreContext } from "../types";

export function CatalogHomePage() {
  const { slug } = useOutletContext<StoreContext>();
  const navigate = useNavigate();
  const [sections, setSections] = useState<PublicHomeSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicJson<PublicHomeSection[]>(`/public/${slug}/home`)
      .then(setSections)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug]);

  if (error) return <p className="store-message">{error}</p>;
  if (sections === null) return <p className="store-message">Cargando…</p>;

  return (
    <HomeSectionsRenderer
      sections={sections}
      onProductClick={(productId) => navigate(`/store/${slug}/p/${productId}`)}
    />
  );
}
