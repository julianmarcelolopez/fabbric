import { useEffect, useState, type CSSProperties } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { ApiError, publicJson } from "../../lib/api";
import { formatPrice } from "../../lib/money";
import { CartDrawer } from "../cart/CartDrawer";
import { CartProvider, useCart } from "../cart/CartContext";
import "../catalog/catalog.css";
import { CustomerAuthProvider, useCustomerAuth } from "./CustomerAuthContext";
import { Loading } from "./components/Loading";
import { SearchBar } from "./components/SearchBar";
import { BagIcon, CheckIcon, CloseIcon, FacebookIcon, InstagramIcon, MenuIcon, ShareIcon, UserIcon, WhatsAppIcon } from "./icons";
import type { PublicHomeSection, PublicStoreConfig, StoreContext } from "./types";

// T20/02 — header/footer nuevos (docs/T20_UX-Store/mockups/*). Estructura y
// clases tomadas directo del mockup; ver docs/T20_UX-Store/tareas/02-header-footer.md
// para las decisiones que el mockup no cubre (nav, announcement, buscador, etc).

type ShippingZone = { id: string; name: string; cost: number; freeShippingFrom: number | null };

// T21/08: con 1 solo mensaje se muestra fijo, sin flechas (un carrusel de un
// ítem no tiene sentido). Con 2+, rota sola cada 5s (decisión del usuario) y
// las flechas permiten saltar manualmente sin esperar — el timer se reinicia
// desde el mensaje actual en cada click, no desde cero. Exportado para que
// MyStorePage.tsx lo reuse tal cual en la vista previa del admin.
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(id);
  }, [messages.length]);

  useEffect(() => {
    if (index >= messages.length) setIndex(0);
  }, [messages, index]);

  if (messages.length === 1) {
    return <div className="announcement">{messages[0]}</div>;
  }

  // .announcement-carousel es un wrapper INTERNO — .announcement (el fondo
  // navy) tiene que quedar sin max-width para ocupar el ancho completo.
  return (
    <div className="announcement">
      <div className="announcement-carousel">
        <button
          type="button"
          className="announcement-arrow"
          onClick={() => setIndex((i) => (i - 1 + messages.length) % messages.length)}
          aria-label="Mensaje anterior"
        >
          ‹
        </button>
        <span className="announcement-text">{messages[index]}</span>
        <button
          type="button"
          className="announcement-arrow"
          onClick={() => setIndex((i) => (i + 1) % messages.length)}
          aria-label="Mensaje siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function CartButton() {
  const cart = useCart();
  return (
    <button className="header-action-btn" onClick={cart.open} title="Carrito">
      <BagIcon />
      {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
    </button>
  );
}

function ShareButton({ storeName }: { storeName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, url });
      } catch {
        // usuario canceló el share nativo — no es un error
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="header-action-btn" onClick={() => void share()} title="Compartir">
      {copied ? <CheckIcon /> : <ShareIcon />}
    </button>
  );
}

function AccountButton({ slug }: { slug: string }) {
  const { me, loading, signInWithGoogle, signOut } = useCustomerAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return null;

  if (!me) {
    return (
      <button className="header-action-btn" onClick={() => void signInWithGoogle()} title="Ingresar con Google">
        <UserIcon />
      </button>
    );
  }

  return (
    <div className="account-menu">
      <button
        className="header-action-btn account-avatar"
        onClick={() => setMenuOpen((v) => !v)}
        title={me.name}
      >
        {me.name.trim().charAt(0).toUpperCase() || "?"}
      </button>
      {menuOpen && (
        <div className="account-dropdown" onMouseLeave={() => setMenuOpen(false)}>
          <span className="account-dropdown-name">Hola, {me.name.split(" ")[0]}</span>
          <Link to={`/store/${slug}/portal/orders`} onClick={() => setMenuOpen(false)}>
            Mis pedidos
          </Link>
          <button onClick={() => void signOut()}>Salir</button>
        </div>
      )}
    </div>
  );
}

// T20/07 — header simplificado del checkout. StoreLayout es la ruta padre
// (no recibe props de sus rutas hijas), así que el modo "simplified" del
// mockup se resuelve detectando el path actual en vez de un prop literal —
// mismo efecto (header distinto en /checkout y /checkout/result), pero es
// la única forma real de hacerlo con layout routes de react-router.
function CheckoutSteps({ done }: { done: boolean }) {
  return (
    <div className="checkout-steps">
      <div className="step-item done">
        <span className="step-num">✓</span>
        <span className="step-label">Carrito</span>
      </div>
      <div className="step-divider" />
      <div className={done ? "step-item done" : "step-item active"}>
        <span className="step-num">{done ? "✓" : "2"}</span>
        <span className="step-label">Datos y envío</span>
      </div>
      <div className="step-divider" />
      <div className={done ? "step-item done" : "step-item"}>
        <span className="step-num">{done ? "✓" : "3"}</span>
        <span className="step-label">Pago</span>
      </div>
    </div>
  );
}

type State =
  | { status: "loading" }
  | { status: "ok"; config: PublicStoreConfig }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function StoreLayout() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const isCheckout = location.pathname.includes("/checkout");
  const checkoutDone = location.pathname.includes("/checkout/result");
  // T21/08: el home (única página con mid-banner full-bleed) ya cancela el
  // padding-bottom de .store-main con un margin-bottom negativo (catalog.css)
  // para quedar pegado al borde real de <main> — el margin-top de 40px del
  // footer (pensado como aire para el resto de las páginas, con contenido
  // normal antes) rompe ese efecto acá, dejando una franja del fondo de
  // .store visible entre el banner y el footer. Se cancela solo en el home.
  const isHome = location.pathname === `/store/${slug}` || location.pathname === `/store/${slug}/`;
  const [state, setState] = useState<State>({ status: "loading" });
  const [shippingZones, setShippingZones] = useState<ShippingZone[] | null>(null);
  const [navCategories, setNavCategories] = useState<{ refName: string; refSlug: string }[] | null>(null);
  // T31/03 — el buscador reemplaza el nav mientras está expandido (StoreLayout
  // decide qué se ve, SearchBar decide su propio contenido interno).
  const [searchOpen, setSearchOpen] = useState(false);
  // T32/xx — el nav inline (Inicio/Explorar/Novedades/Ofertas) no tenía
  // breakpoint mobile: con flex-wrap se apilaba dentro de una fila de alto
  // fijo y se recortaba. Abajo de 768px pasa a un drawer con botón ☰
  // (mismo patrón que .search-dropdown/.account-dropdown, ver catalog.css).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    publicJson<PublicStoreConfig>(`/public/${slug}/config`)
      .then((config) => {
        if (!cancelled) setState({ status: "ok", config });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "not-found" });
        else setState({ status: "error", message: err?.message ?? String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    // Announcement bar: sin campo de texto libre en catalog_configs (T20/analisis
    // sección 6), se arma solo con la zona real de envío gratis más accesible.
    publicJson<ShippingZone[]>(`/public/${slug}/shipping-zones`)
      .then(setShippingZones)
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    // Nav del header: categorías reales que ya están en el home (home_sections),
    // no un campo dedicado de "featured en header" — ver T20/02, decisión tomada.
    publicJson<PublicHomeSection[]>(`/public/${slug}/home`)
      .then((sections) => {
        const cats = sections
          .filter((s) => s.refType === "category" && s.refActive && s.refName && s.refSlug)
          .map((s) => ({ refName: s.refName as string, refSlug: s.refSlug as string }))
          .slice(0, 6);
        setNavCategories(cats);
      })
      .catch(() => {});
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="store-message">
        <Loading label="Cargando tienda…" />
      </div>
    );
  }
  if (state.status === "not-found") {
    return (
      <div className="store-message">
        <h1>Tienda no encontrada</h1>
        <p>La tienda que buscás no existe o no está disponible.</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="store-message">
        <h1>Algo salió mal</h1>
        <p>{state.message}</p>
      </div>
    );
  }

  const { config } = state;
  const ctx: StoreContext = { slug: slug!, config };

  const cheapestFreeShipping = (shippingZones ?? [])
    .filter((z) => z.freeShippingFrom !== null)
    .sort((a, b) => (a.freeShippingFrom as number) - (b.freeShippingFrom as number))[0];

  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;

  // T21/08 — mensajes propios del admin tienen prioridad; si no hay ninguno,
  // el autogenerado de T20/02 sigue funcionando como fallback; si no hay
  // nada de nada, la barra no se muestra (mismo comportamiento de hoy).
  const announcementTexts = config.announcementTexts.map((t) => t.trim()).filter(Boolean);

  return (
    <CustomerAuthProvider slug={slug!}>
      <CartProvider slug={slug!}>
        <div className="store" style={{ "--accent": config.accentColor } as CSSProperties}>
          {!isCheckout && announcementTexts.length > 0 && <AnnouncementBar messages={announcementTexts} />}
          {!isCheckout && announcementTexts.length === 0 && cheapestFreeShipping && (
            <div className="announcement">
              Envío gratis en {cheapestFreeShipping.name} en compras mayores a{" "}
              <strong>{formatPrice(cheapestFreeShipping.freeShippingFrom as number)}</strong>
              &nbsp;·&nbsp; 3 cuotas sin interés
            </div>
          )}

          <header className={isCheckout ? "store-header checkout-header" : "store-header"}>
            {isCheckout ? (
              <div className="checkout-header-inner">
                <Link to={`/store/${slug}`} className="store-logo-wrap">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt={config.storeName} />
                  ) : (
                    <span className="store-logo-text">{config.storeName}</span>
                  )}
                </Link>
                <CheckoutSteps done={checkoutDone} />
                <Link to={`/store/${slug}`} className="back-link">
                  ← Volver a la tienda
                </Link>
              </div>
            ) : (
              <div className="store-header-inner">
                {/* T32/xx — solo visible <=768px (ver catalog.css); abre/cierra
                    el drawer de abajo. Oculto mientras el buscador está
                    expandido, mismo criterio que el resto de los íconos. */}
                {!searchOpen && (
                  <button
                    type="button"
                    className="mobile-nav-toggle"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    aria-label={mobileNavOpen ? "Cerrar menú" : "Abrir menú"}
                    aria-expanded={mobileNavOpen}
                  >
                    {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
                  </button>
                )}
                <Link to={`/store/${slug}`} className="store-logo-wrap">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt={config.storeName} />
                  ) : (
                    <span className="store-logo-text">{config.storeName}</span>
                  )}
                </Link>

                {/* T30/03 — antes: categorías reales del tenant + "Ver todo" (dinámico,
                    variaba según cuántas categorías tuviera cada org). Ahora: 4 links
                    fijos, iguales para cualquier tenant. `end` en "Inicio" — sin él,
                    NavLink matchea por prefijo y quedaría marcado activo en /categorias,
                    /novedades y /ofertas también (todas empiezan con /store/:slug). El
                    footer (más abajo) sigue mostrando las categorías reales — decisión
                    a propósito, no un olvido (ver analisis.md sección 5, decisión 4). */}
                {/* T31/03 — el buscador expandido ocupa el lugar del nav (se
                    ocultan mutuamente); StoreLayout decide cuál de los dos se ve,
                    SearchBar decide su propio contenido interno (icono vs. campo). */}
                {/* store-nav--public: modificador propio (no lo usa el preview
                    estático de MyStorePage.tsx, que reusa .store-nav a propósito
                    sin querer heredar este @media) para poder ocultar el nav
                    inline en mobile sin afectar ese preview de admin. */}
                {!searchOpen && (
                  <nav className="store-nav store-nav--public">
                    <NavLink to={`/store/${slug}`} end>
                      Inicio
                    </NavLink>
                    <NavLink to={`/store/${slug}/categorias`}>Explorar</NavLink>
                    <NavLink to={`/store/${slug}/novedades`}>Novedades</NavLink>
                    <NavLink to={`/store/${slug}/ofertas`}>Ofertas</NavLink>
                  </nav>
                )}
                <SearchBar
                  slug={slug!}
                  open={searchOpen}
                  onOpenChange={setSearchOpen}
                  suggestedCategories={navCategories ?? []}
                />

                <div className="store-header-actions">
                  {/* T31/03 — mismo criterio que el mockup (buscador.html estado 02):
                      con el buscador expandido, solo queda visible el carrito. */}
                  {!searchOpen && (
                    <>
                      <ShareButton storeName={config.storeName} />
                      <AccountButton slug={slug!} />
                    </>
                  )}
                  <CartButton />
                </div>
              </div>
            )}

            {/* T32/xx — drawer mobile del nav, ver .mobile-nav-drawer en
                catalog.css (oculto por defecto, display:flex solo <=768px). */}
            {!isCheckout && mobileNavOpen && !searchOpen && (
              <nav className="mobile-nav-drawer">
                <NavLink to={`/store/${slug}`} end>
                  Inicio
                </NavLink>
                <NavLink to={`/store/${slug}/categorias`}>Explorar</NavLink>
                <NavLink to={`/store/${slug}/novedades`}>Novedades</NavLink>
                <NavLink to={`/store/${slug}/ofertas`}>Ofertas</NavLink>
              </nav>
            )}
          </header>

          {/* T20/04: bannerUrl ya no se muestra a nivel de layout (en todas las
              páginas) — desde T20/03 solo aparece en el mid-banner del home,
              coherente con esa decisión (bannerUrl es contenido promocional
              puntual, no un elemento fijo de cada pantalla). */}

          <main className="store-main">
            <Outlet context={ctx} />
          </main>

          {/* T20/07: el mockup de checkout no tiene footer — flujo de conversión
              enfocado, sin links de salida antes de pagar (patrón estándar de
              e-commerce). Se aplica el mismo criterio al whatsapp-float. */}
          {!isCheckout && (
          <footer className={isHome ? "store-footer-v2 flush-top" : "store-footer-v2"}>
            <div className="footer-inner">
              <div className="footer-top">
                <div className="footer-brand">
                  <Link to={`/store/${slug}`} className="footer-logo-link">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt={config.storeName} className="footer-logo-img" />
                    ) : (
                      <span className="footer-logo-text">{config.storeName}</span>
                    )}
                  </Link>
                  {config.businessDescription && <p>{config.businessDescription}</p>}
                  <div className="footer-social">
                    {config.instagram && (
                      <a href={config.instagram} target="_blank" rel="noreferrer" className="social-btn" title="Instagram">
                        <InstagramIcon />
                      </a>
                    )}
                    {config.facebook && (
                      <a href={config.facebook} target="_blank" rel="noreferrer" className="social-btn" title="Facebook">
                        <FacebookIcon />
                      </a>
                    )}
                    {whatsappHref && (
                      <a href={whatsappHref} target="_blank" rel="noreferrer" className="social-btn" title="WhatsApp">
                        <WhatsAppIcon />
                      </a>
                    )}
                  </div>
                </div>

                {navCategories && navCategories.length > 0 && (
                  <div className="footer-col">
                    <h4>Tienda</h4>
                    <ul>
                      {navCategories.map((c) => (
                        <li key={c.refSlug}>
                          <Link to={`/store/${slug}/c/${c.refSlug}`}>{c.refName}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(config.address || config.businessHours || whatsappHref || config.email || config.facebook) && (
                  <div className="footer-col">
                    <h4>Contacto</h4>
                    <ul>
                      {whatsappHref && (
                        <li>
                          <a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>
                        </li>
                      )}
                      {config.instagram && (
                        <li>
                          <a href={config.instagram} target="_blank" rel="noreferrer">Instagram</a>
                        </li>
                      )}
                      {config.facebook && (
                        <li>
                          <a href={config.facebook} target="_blank" rel="noreferrer">Facebook</a>
                        </li>
                      )}
                      {config.email && (
                        <li>
                          <a href={`mailto:${config.email}`}>{config.email}</a>
                        </li>
                      )}
                      {config.address && <li><span>{config.address}</span></li>}
                      {config.businessHours && <li><span>{config.businessHours}</span></li>}
                    </ul>
                  </div>
                )}
              </div>
              <div className="footer-bottom">
                <span>© {new Date().getFullYear()} {config.storeName}. Todos los derechos reservados.</span>
                <div className="footer-payments">
                  <span className="payment-badge">Mercado Pago</span>
                </div>
              </div>
            </div>
          </footer>
          )}

          {!isCheckout && whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="whatsapp-float" title="Escribinos por WhatsApp">
              💬
            </a>
          )}

          <CartDrawer slug={slug!} />
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
