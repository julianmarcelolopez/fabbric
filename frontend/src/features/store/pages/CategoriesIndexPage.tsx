import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { Loading } from "../components/Loading";
import type { PublicBrandSummary, StoreContext } from "../types";
import { normalizeHomeSections, type PublicHomeSectionRaw } from "./CatalogHomePage";

// T20/04 — página índice "Categorías" (no existía antes). Reusa
// GET /public/:slug/home (sin endpoint nuevo, ver docs/T20_UX-Store/
// tareas/04-pagina-categorias.md → Resultado para las limitaciones de datos
// aceptadas: categorías ocultas del home no aparecen acá, y colecciones solo
// se ven si un admin las agregó a esa pantalla — no hay forma de listar
// "todas" sin un endpoint nuevo).
//
// Tab "Ofertas" del mockup: omitido en V1 (decisión del usuario).
//
// T29/06 — tab "Marcas": a diferencia de Categorías/Colecciones, NO viene de
// home_sections (sin curación manual, ver analisis.md sección 5) — usa un
// endpoint propio (GET /public/:slug/brands) que ya devuelve todas las
// marcas activas con stock, con conteo.

type Tab = "categories" | "collections" | "brands";

export function CategoriesIndexPage() {
  const { slug, config } = useOutletContext<StoreContext>();
  const [searchParams] = useSearchParams();
  const [sections, setSections] = useState<ReturnType<typeof normalizeHomeSections> | null>(null);
  const [brands, setBrands] = useState<PublicBrandSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(initialTab === "marcas" ? "brands" : "categories");

  useEffect(() => {
    publicJson<PublicHomeSectionRaw[]>(`/public/${slug}/home`)
      .then((raw) => setSections(normalizeHomeSections(raw)))
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
    publicJson<PublicBrandSummary[]>(`/public/${slug}/brands`)
      .then(setBrands)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug]);

  if (error) return <p className="store-message">{error}</p>;
  if (sections === null || brands === null) return <div className="store-message"><Loading /></div>;

  const categories = sections.filter((s) => s.refType === "category" && s.refActive && s.refName && s.refSlug);
  const collections = sections.filter((s) => s.refType === "collection" && s.refActive && s.refName);
  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <div className="categories-index">
      {/* T21/08: reusa .cat-banner tal cual (mismo navy/alineado a la izquierda que
          la categoría individual) — antes tenía su propio estilo claro/centrado
          (.page-hero), inconsistente con el resto de los headers de página. */}
      <div className="cat-banner">
        <div className="cat-banner-content">
          <div className="breadcrumb">
            <Link to={`/store/${slug}`}>Inicio</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">
              {tab === "categories" ? "Categorías" : tab === "collections" ? "Colecciones" : "Marcas"}
            </span>
          </div>
          <h1 className="cat-banner-title">Explorá la tienda</h1>
          <p className="cat-banner-sub">Encontrá lo que buscás entre todas nuestras categorías, colecciones y marcas</p>
        </div>
      </div>

      <div className="tabs-bar">
        <div className="tabs-inner">
          <button
            type="button"
            className={tab === "categories" ? "tab active" : "tab"}
            onClick={() => setTab("categories")}
          >
            Categorías
          </button>
          <button
            type="button"
            className={tab === "collections" ? "tab active" : "tab"}
            onClick={() => setTab("collections")}
          >
            Colecciones
          </button>
          <button
            type="button"
            className={tab === "brands" ? "tab active" : "tab"}
            onClick={() => setTab("brands")}
          >
            Marcas
          </button>
        </div>
      </div>

      <div className="content">
        {tab === "categories" ? (
          categories.length === 0 ? (
            <p className="category-page-empty">Todavía no hay categorías disponibles.</p>
          ) : (
            <>
              <div className="section-label">Categorías</div>
              <div className="categories-hero">
                {categories.map((c, i) => (
                  <Link
                    key={c.id}
                    to={`/store/${slug}/c/${c.refSlug}`}
                    className={
                      (i === 0 && categories.length > 1 ? "cat-hero-card wide" : "cat-hero-card") +
                      (c.refImageUrl ? " has-photo" : "")
                    }
                  >
                    {/* T21/01: con imagen real, la tarjeta pasa del tinte de
                       color plano (T20/04) a la foto + scrim con degradé
                       oscuro para que el texto siga siendo legible. */}
                    {c.refImageUrl && (
                      <>
                        <img className="cat-hero-img" src={c.refImageUrl} alt="" />
                        <div className="cat-hero-scrim" />
                      </>
                    )}
                    <div className="cat-hero-content">
                      <div className="cat-hero-name">{c.refName}</div>
                      <span className="cat-hero-btn">Ver todo →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )
        ) : tab === "collections" ? (
          collections.length === 0 ? (
            // T20/04: decisión del usuario — estado vacío en vez de una lista
            // parcial (las colecciones sin curar en home_sections no aparecen
            // acá y podrían confundir si mostráramos "algunas sí, otras no").
            <p className="category-page-empty">Próximamente nuevas colecciones.</p>
          ) : (
          <>
            <div className="section-label">Colecciones</div>
            <div className="collections-grid">
              {collections.map((c) => (
                // T21/02: ahora sí clickeable — existe /store/:slug/col/:slug.
                <Link
                  key={c.id}
                  to={`/store/${slug}/col/${c.refSlug}`}
                  className={c.refImageUrl ? "col-card has-photo" : "col-card"}
                >
                  {c.refImageUrl && (
                    <>
                      <img className="cat-hero-img" src={c.refImageUrl} alt="" />
                      <div className="cat-hero-scrim" />
                    </>
                  )}
                  <div className="col-name">{c.refName}</div>
                  <span className="col-link">Ver →</span>
                </Link>
              ))}
            </div>
          </>
          )
        ) : brands.length === 0 ? (
          <p className="category-page-empty">Todavía no hay marcas disponibles.</p>
        ) : (
          <>
            <div className="section-label">Marcas</div>
            <div className="collections-grid">
              {/* T32/xx — un logo de marca ya ES la identidad (suele traer el
                  nombre escrito) — a diferencia de una foto de colección
                  genérica, no necesita el mismo tratamiento de foto+scrim+texto
                  superpuesto: repetía el nombre y recortaba el logo en cuadrado.
                  Con logo: tarjeta clara, logo entero sin recortar, sin texto.
                  Sin logo: se mantiene el estilo de tinte + texto de antes. */}
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/store/${slug}/m/${b.slug}`}
                  className={b.imageUrl ? "col-card brand-card brand-logo-card" : "col-card brand-card"}
                >
                  {b.imageUrl ? (
                    <img className="brand-logo-img" src={b.imageUrl} alt={b.name} />
                  ) : (
                    <>
                      <div className="col-name">{b.name}</div>
                      <span className="col-link">Ver →</span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        {whatsappHref && (
          <div className="bottom-banner">
            <div className="bottom-banner-text">
              <h3>¿No encontrás lo que buscás?</h3>
              <p>Escribinos por WhatsApp y te ayudamos a encontrar tu talle y modelo ideal.</p>
            </div>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="bottom-banner-btn">
              Escribinos →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
