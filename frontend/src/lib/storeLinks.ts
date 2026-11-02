// T38 — dominios propios por tienda. Dos modos posibles para la tienda
// pública: "dominio principal" (fabbric.aivance.cloud, o localhost en dev),
// donde cada tienda vive bajo /store/<slug>; o "dominio propio"
// (eliathimodas.com), donde la MISMA tienda vive en "/", sin el prefijo.
// Este helper es el único lugar que decide el modo y arma cada link acorde
// — reemplaza los ~52 call sites que antes armaban `/store/${slug}/...` a
// mano (ver docs/T38_DominiosPropios/analisis.md).
const PLATFORM_HOST = import.meta.env.VITE_PLATFORM_HOST || "fabbric.aivance.cloud";

export function isCustomDomainMode(): boolean {
  const host = window.location.hostname;
  return host !== PLATFORM_HOST && host !== "localhost" && host !== "127.0.0.1";
}

/**
 * Arma un link interno de la tienda. `path` es relativo a la raíz de la
 * tienda, con o sin "/" inicial (ej. "categorias", "/c/remeras", "" para el
 * home). En dominio propio no lleva prefijo; en el dominio principal lleva
 * `/store/<slug>` — mismas rutas relativas en los dos casos (ver
 * router.tsx), solo cambia el prefijo.
 */
export function storePath(slug: string, path = ""): string {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return isCustomDomainMode() ? clean || "/" : `/store/${slug}${clean}`;
}
