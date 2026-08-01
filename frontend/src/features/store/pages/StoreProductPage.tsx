import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { useCart } from "../../cart/CartContext";
import { ProductDetailView } from "../../catalog/ProductDetailView";
import type { PublicCategoryProducts, PublicProductDetail, StoreContext } from "../types";

type ShippingZone = { id: string; name: string; cost: number; freeShippingFrom: number | null };

type State =
  | { status: "loading" }
  | { status: "ok"; product: PublicProductDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function StoreProductPage() {
  const { slug, config } = useOutletContext<StoreContext>();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "loading" });
  const [related, setRelated] = useState<PublicCategoryProducts["products"]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[] | null>(null);
  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setRelated([]);
    publicJson<PublicProductDetail>(`/public/${slug}/products/${productId}`)
      .then((product) => {
        if (cancelled) return;
        setState({ status: "ok", product });
        // T20/06 — "también te puede gustar": otros productos de la misma
        // categoría, reusando el endpoint paginado de la tarea 05 (sin
        // endpoint nuevo), excluyendo el producto actual, máximo 4.
        publicJson<PublicCategoryProducts>(`/public/${slug}/categories/${product.categorySlug}/products?page=1`)
          .then((data) => {
            if (!cancelled) setRelated(data.products.filter((p) => p.id !== product.id).slice(0, 4));
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "not-found" });
        else setState({ status: "error", message: err?.message ?? String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, productId]);

  useEffect(() => {
    publicJson<ShippingZone[]>(`/public/${slug}/shipping-zones`)
      .then(setShippingZones)
      .catch(() => {});
  }, [slug]);

  if (state.status === "loading") return <p className="store-message">Cargando…</p>;
  if (state.status === "not-found") {
    return (
      <div className="store-message">
        <h1>Producto no encontrado</h1>
        <p>
          <Link to={`/store/${slug}`}>← Volver a la tienda</Link>
        </p>
      </div>
    );
  }
  if (state.status === "error") return <p className="store-message">{state.message}</p>;

  const { product } = state;
  const whatsappHref = config.whatsapp ? `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` : null;
  const cheapestZone = (shippingZones ?? []).slice().sort((a, b) => a.cost - b.cost)[0];
  const shippingSummary = cheapestZone
    ? cheapestZone.cost === 0
      ? `Envío gratis a ${cheapestZone.name}`
      : `Envío a ${cheapestZone.name} desde ${formatPrice(cheapestZone.cost)}`
    : null;

  function addToCart(variant: { id?: string; talle: string; color: string; priceOverride: number | null; stockOnline: number }, qty: number) {
    if (!variant.id) return;
    cart.add(
      {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        brand: product.brand,
        talle: variant.talle,
        color: variant.color,
        unitPrice: variant.priceOverride ?? product.price,
        imageUrl: product.images[0]?.url ?? null,
        stockOnline: variant.stockOnline,
      },
      qty
    );
  }

  return (
    <div className="pdv-page">
      <div className="breadcrumb-bar">
        <div className="breadcrumb">
          <Link to={`/store/${slug}`}>Inicio</Link>
          <span className="breadcrumb-sep">›</span>
          <Link to={`/store/${slug}/c/${product.categorySlug}`}>{product.categoryName}</Link>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{product.name}</span>
        </div>
      </div>

      <ProductDetailView
        name={product.name}
        description={product.description}
        price={product.price}
        compareAtPrice={product.compareAtPrice}
        brand={product.brand}
        images={product.images}
        variants={product.variants}
        onAddToCart={addToCart}
        onBuyNow={(variant, qty) => {
          addToCart(variant, qty);
          navigate(`/store/${slug}/checkout`);
        }}
        whatsappHref={whatsappHref}
        shippingSummary={shippingSummary}
        address={config.address}
        businessHours={config.businessHours}
        returnPolicy={config.returnPolicy}
        related={related}
        relatedCategoryName={product.categoryName}
        onRelatedClick={(id) => navigate(`/store/${slug}/p/${id}`)}
      />
    </div>
  );
}
