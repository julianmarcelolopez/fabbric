import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import type { PublicHomeSection, StoreContext } from "../types";

// T20/04 — página índice "Categorías" (no existía antes). Reusa
// GET /public/:slug/home (sin endpoint nuevo, ver docs/T20_UX-Store/
// tareas/04-pagina-categorias.md → Resultado para las limitaciones de datos
// aceptadas: categorías ocultas del home no aparecen acá, y colecciones solo
// se ven si un admin las agregó a esa pantalla — no hay forma de listar
// "todas" sin un endpoint nuevo).
//
// Tab "Ofertas" del mockup: omitido en V1 (decisión del usuario).

type Tab = "categories" | "collections";

export function CategoriesIndexPage() {
  const { slug, config } = useOutletContext<StoreContext>();
  const [sections, setSections] = useState<PublicHomeSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("categories");

  useEffect(() => {
    publicJson<PublicHomeSection[]>(`/public/${slug}/home`)
      .then(setSections)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [slug]);

  if (error) return <p className="store-message">{error}</p>;
  if (sections === null) return <p className="store-message">Cargando…</p>;

  const categories = sections.filter((s) => s.refType === "category" && s.refActive && s.refName && s.refSlug);
  const collections = sections.filter((s) => s.refType === "collection" && s.refActive && s.refName);
  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <div className="categories-index">
      <div className="page-hero">
        <div className="breadcrumb">
          <Link to={`/store/${slug}`}>Inicio</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{tab === "categories" ? "Categorías" : "Colecciones"}</span>
        </div>
        <h1 className="page-title">Explorá la tienda</h1>
        <p className="page-subtitle">Encontrá lo que buscás entre todas nuestras categorías y colecciones</p>
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
        </div>
      </div>

      <div className="content">
        {tab === "categories" ? (
          categories.length === 0 ? (
            <p className="category-page-empty">Todavía no hay categorías disponibles.</p>
          ) : (
            <>
              <div className="section-label">
                Categorías — {categories.length} disponible{categories.length === 1 ? "" : "s"}
              </div>
              <div className="categories-hero">
                {categories.map((c, i) => {
                  const count = c.totalCount ?? c.products.length;
                  return (
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
                        <div className="cat-hero-count">
                          {count} producto{count === 1 ? "" : "s"}
                        </div>
                        <span className="cat-hero-btn">Ver todo →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )
        ) : collections.length === 0 ? (
          // T20/04: decisión del usuario — estado vacío en vez de una lista
          // parcial (las colecciones sin curar en home_sections no aparecen
          // acá y podrían confundir si mostráramos "algunas sí, otras no").
          <p className="category-page-empty">Próximamente nuevas colecciones.</p>
        ) : (
          <>
            <div className="section-label">
              Colecciones — {collections.length} activa{collections.length === 1 ? "" : "s"}
            </div>
            <div className="collections-grid">
              {collections.map((c) => {
                const count = c.totalCount ?? c.products.length;
                return (
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
                    <div className="col-tag">Colección</div>
                    <div className="col-name">{c.refName}</div>
                    <div className="col-count">
                      {count} producto{count === 1 ? "" : "s"}
                    </div>
                    <span className="col-link">Ver colección →</span>
                  </Link>
                );
              })}
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
