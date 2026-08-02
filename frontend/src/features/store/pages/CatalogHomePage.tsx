import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { HomeSectionsRenderer } from "../../catalog/HomeSectionsRenderer";
import type { PublicHomeSection, StoreContext } from "../types";

// T20/03 — home nuevo: hero + grilla de categorías + secciones de productos
// (home_sections, sin cambios de datos) + mid-banner. Instagram strip y
// wishlist quedan omitidos en V1 (decisión del usuario, sin backend real
// detrás — ver docs/T20_UX-Store/tareas/03-home.md).
//
// El mockup ubica el mid-banner ENTRE dos secciones de productos fijas
// ("Lo más vendido" / "Verano 2027"). Acá la cantidad de secciones es
// dinámica (home_sections real), así que se simplificó a un orden fijo:
// Hero → Categorías → todas las secciones de productos → Mid-banner —
// más robusto que intentar partir la lista en dos, a costa de no calcar
// la posición exacta del mockup.

function Hero({
  storeName,
  businessDescription,
  heroImageUrl,
  slug,
}: {
  storeName: string;
  businessDescription: string | null;
  heroImageUrl: string | null;
  slug: string;
}) {
  // T20/03: el hero del mockup usa una foto de fondo genérica; la imagen real
  // de la org (bannerUrl) es un banner promocional con su propio texto
  // superpuesto ("10% OFF" + gráfica), no una foto ambiente — se probó y
  // quedaba ilegible/duplicado con el título. Se decidió dejar el hero en
  // fondo sólido (sin imagen) y reservar bannerUrl solo para el mid-banner,
  // donde se muestra tal cual, sin texto propio encima.
  //
  // T21/08: heroImageUrl es un campo dedicado y distinto de bannerUrl —
  // pensado como una foto/textura ambiente, no promocional, con overlay
  // (.has-image) para mantener el título legible encima.
  return (
    <section
      className={heroImageUrl ? "home-hero has-image" : "home-hero"}
      style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
    >
      <div className="home-hero-content">
        <h1 className="home-hero-title">{storeName}</h1>
        {businessDescription && <p className="home-hero-sub">{businessDescription}</p>}
        <Link className="home-hero-cta" to={`/store/${slug}/categorias`}>
          Ver catálogo <span className="home-hero-cta-arrow">→</span>
        </Link>
      </div>
    </section>
  );
}

function CategoriesGrid({ sections, slug }: { sections: PublicHomeSection[]; slug: string }) {
  const categories = sections.filter(
    (s) => s.refType === "category" && s.refActive && s.refName && s.refSlug
  );
  if (categories.length === 0) return null;

  return (
    <div className="home-section">
      <div className="hsr-section-head">
        <h2 className="hsr-title">Explorá por categoría</h2>
      </div>
      <div className="home-categories-grid">
        {categories.map((c) => (
          <Link key={c.id} to={`/store/${slug}/c/${c.refSlug}`} className="home-cat-card">
            {/* T21/01: si la categoría tiene imagen real, se usa; si no, el
               placeholder de color de T20/03 sigue funcionando igual. */}
            {c.refImageUrl ? (
              <img className="home-cat-card-img" src={c.refImageUrl} alt="" />
            ) : (
              <div className="home-cat-card-ph" />
            )}
            <div className="home-cat-overlay">
              <div className="home-cat-name">{c.refName}</div>
              <div className="home-cat-count">
                {c.totalCount ?? c.products.length} producto{(c.totalCount ?? c.products.length) === 1 ? "" : "s"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MidBanner({
  bannerUrl,
  title,
  subtitle,
  slug,
}: {
  bannerUrl: string | null;
  title: string | null;
  subtitle: string | null;
  slug: string;
}) {
  // T21/04: título propio del admin tiene prioridad — se superpone al banner
  // real (con overlay para legibilidad) o, si no hay bannerUrl, sobre el
  // fondo navy liso. El subtítulo solo se muestra si también hay título.
  if (title) {
    return (
      <Link
        to={`/store/${slug}/categorias`}
        className="home-mid-banner has-text"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        <div className="home-mid-banner-inner">
          <h2 className="home-mid-banner-title">{title}</h2>
          {subtitle && <p className="home-mid-banner-sub">{subtitle}</p>}
        </div>
      </Link>
    );
  }

  if (bannerUrl) {
    // T20/03: sin título propio, el banner real de la org se muestra tal
    // cual, sin overlay ni texto — ver Resultado de la tarea 04 (T21).
    return (
      <Link
        to={`/store/${slug}/categorias`}
        className="home-mid-banner"
        style={{ backgroundImage: `url(${bannerUrl})` }}
        aria-label="Ver catálogo completo"
      />
    );
  }

  return (
    <section className="home-mid-banner">
      <div className="home-mid-banner-inner">
        <h2 className="home-mid-banner-title">Descubrí la colección completa</h2>
        <Link className="home-mid-banner-btn" to={`/store/${slug}/categorias`}>
          Ver catálogo →
        </Link>
      </div>
    </section>
  );
}

export function CatalogHomePage() {
  const { slug, config } = useOutletContext<StoreContext>();
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
    // T20/03: .store-main usa flex:1 (sticky footer, ya existía antes de T20)
    // — en tiendas con pocos productos el contenido no llega a llenar el
    // viewport y queda un hueco color .store-main entre el contenido y el
    // footer. .home-page hace que ese sobrante lo absorba el mid-banner en
    // vez de quedar como un espacio vacío desprolijo.
    <div className="home-page">
      <Hero
        storeName={config.storeName}
        businessDescription={config.businessDescription}
        heroImageUrl={config.heroImageUrl}
        slug={slug}
      />
      <CategoriesGrid sections={sections} slug={slug} />
      <div className="home-section">
        <HomeSectionsRenderer
          sections={sections}
          onProductClick={(productId) => navigate(`/store/${slug}/p/${productId}`)}
          storeSlug={slug}
        />
      </div>
      <MidBanner
        bannerUrl={config.bannerUrl}
        title={config.midBannerTitle}
        subtitle={config.midBannerSubtitle}
        slug={slug}
      />
    </div>
  );
}
