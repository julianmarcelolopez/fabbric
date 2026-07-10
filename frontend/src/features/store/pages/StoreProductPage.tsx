import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { useCart } from "../../cart/CartContext";
import { ProductDetailView } from "../../catalog/ProductDetailView";
import type { PublicProductDetail, StoreContext } from "../types";

type State =
  | { status: "loading" }
  | { status: "ok"; product: PublicProductDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function StoreProductPage() {
  const { slug } = useOutletContext<StoreContext>();
  const { productId } = useParams<{ productId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });
  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    publicJson<PublicProductDetail>(`/public/${slug}/products/${productId}`)
      .then((product) => {
        if (!cancelled) setState({ status: "ok", product });
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
  return (
    <>
      <p className="store-back">
        <Link to={`/store/${slug}`}>← Volver</Link>
      </p>
      <ProductDetailView
        name={product.name}
        description={product.description}
        price={product.price}
        images={product.images}
        variants={product.variants}
        onAddToCart={(variant) => {
          if (!variant.id) return;
          cart.add({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            talle: variant.talle,
            color: variant.color,
            unitPrice: variant.priceOverride ?? product.price,
            imageUrl: product.images[0]?.url ?? null,
            stockOnline: variant.stockOnline,
          });
        }}
      />
    </>
  );
}
