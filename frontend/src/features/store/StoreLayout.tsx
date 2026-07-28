import { useEffect, useState, type CSSProperties } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { ApiError, publicJson } from "../../lib/api";
import { CartDrawer } from "../cart/CartDrawer";
import { CartProvider, useCart } from "../cart/CartContext";
import "../catalog/catalog.css";
import { CustomerAuthProvider, useCustomerAuth } from "./CustomerAuthContext";
import type { PublicStoreConfig, StoreContext } from "./types";

function CartButton() {
  const cart = useCart();
  return (
    <button className="store-auth-btn" onClick={cart.open}>
      🛒 Carrito{cart.count > 0 ? ` (${cart.count})` : ""}
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
    <button className="store-auth-btn" onClick={() => void share()}>
      {copied ? "¡Copiado!" : "🔗 Compartir"}
    </button>
  );
}

function CustomerMenu({ slug }: { slug: string }) {
  const { me, loading, signInWithGoogle, signOut } = useCustomerAuth();
  if (loading) return null;
  if (!me) {
    return (
      <button className="store-auth-btn" onClick={() => void signInWithGoogle()}>
        Ingresar con Google
      </button>
    );
  }
  return (
    <span className="store-user">
      Hola, <strong>{me.name.split(" ")[0]}</strong>
      <Link className="store-auth-btn" to={`/store/${slug}/portal/orders`} style={{ textDecoration: "none", color: "inherit" }}>
        Mis pedidos
      </Link>
      <button className="store-auth-btn" onClick={() => void signOut()}>Salir</button>
    </span>
  );
}

type State =
  | { status: "loading" }
  | { status: "ok"; config: PublicStoreConfig }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function StoreLayout() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

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

  if (state.status === "loading") {
    return <div className="store-message">Cargando tienda…</div>;
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

  return (
    <CustomerAuthProvider slug={slug!}>
      <CartProvider slug={slug!}>
        <div className="store" style={{ "--accent": config.accentColor } as CSSProperties}>
          {config.bannerUrl && <img className="store-banner" src={config.bannerUrl} alt="" />}
          <header className="store-topbar">
            <Link to={`/store/${slug}`} className="store-brand">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="" />
              ) : (
                <span className="store-brand-badge" aria-hidden="true">
                  {config.storeName.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span>{config.storeName}</span>
            </Link>
            <span className="store-topbar-spacer" />
            <ShareButton storeName={config.storeName} />
            <CartButton />
            <CustomerMenu slug={slug!} />
          </header>
          <main className="store-main">
            <Outlet context={ctx} />
          </main>
          <footer className="store-footer">
            {config.businessDescription && <p>{config.businessDescription}</p>}
            {(config.whatsapp || config.instagram || config.email || config.address || config.businessHours) && (
              <div className="store-footer-links">
                {config.whatsapp && (
                  <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                {config.instagram && (
                  <a href={config.instagram} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                )}
                {config.email && <a href={`mailto:${config.email}`}>{config.email}</a>}
                {config.address && <span>{config.address}</span>}
                {config.businessHours && <span>{config.businessHours}</span>}
              </div>
            )}
            <p className="store-powered">tienda creada con fabbric</p>
          </footer>
          <CartDrawer slug={slug!} />
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
