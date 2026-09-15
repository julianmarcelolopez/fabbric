import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, publicJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { SearchIcon } from "../icons";
import type { PublicSearchResults } from "../types";

// T31/03 — el ícono de lupa deja de ser decorativo (T20/02). Clic lo
// expande a un campo de texto en el lugar del nav (StoreLayout.tsx oculta
// <nav> mientras `open` es true) — mismo patrón que muestra
// docs/T31_Buscador/mockups/buscador.html estado 02, calcando el lenguaje
// visual de .account-dropdown (StoreLayout.tsx) para el panel de resultados
// en vez de inventar uno nuevo.
//
// Debounce con guard `cancelled` — mismo patrón que
// frontend/src/features/admin/pages/CustomersPage.tsx:14-32 (búsqueda con
// debounce ya usada en el admin), no uno nuevo.

const MIN_CHARS = 2;
const MAX_RESULTS = 5;

type SuggestedCategory = { refName: string; refSlug: string };

type Props = {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** T31/03 — reusa navCategories que StoreLayout.tsx ya carga para el
   * footer, en vez de un fetch nuevo solo para las sugerencias del estado
   * "sin resultados" (propuesta-buscador.md, sección "Diseño", punto 4). */
  suggestedCategories: SuggestedCategory[];
};

export function SearchBar({ slug, open, onOpenChange, suggestedCategories }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    onOpenChange(false);
    setQ("");
    setResults(null);
  }

  // Foco automático al expandirse.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Cerrar con click afuera o Escape.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounce 300ms — mismo patrón que CustomersPage.tsx (cancelled guard,
  // no el patrón de CategoryPage.tsx que reconstruye la URL, acá no hay URL
  // que tocar todavía, la búsqueda en vivo no navega).
  useEffect(() => {
    if (q.trim().length < MIN_CHARS) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      publicJson<PublicSearchResults>(`/public/${slug}/search?q=${encodeURIComponent(q.trim())}`)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch((err) => {
          if (!cancelled && !(err instanceof ApiError && err.status === 400)) {
            // Error real (red, 5xx): se trata igual que "sin resultados" en
            // vez de romper el dropdown — no hay un estado de error propio
            // en la propuesta original.
            setResults({ query: q, products: [], page: 1, pageSize: 24, totalCount: 0, totalPages: 1, availableFilters: { talles: [], colores: [] } });
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, slug]);

  if (!open) {
    return (
      <button className="header-action-btn" title="Buscar" onClick={() => onOpenChange(true)}>
        <SearchIcon />
      </button>
    );
  }

  const showDropdown = q.trim().length >= MIN_CHARS;
  const items = results?.products.slice(0, MAX_RESULTS) ?? [];

  return (
    <div className="search-field-wrap" ref={wrapRef}>
      <div className="search-field">
        <SearchIcon size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar productos..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <button className="search-field-close" aria-label="Cerrar" onClick={close}>
          ✕
        </button>
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {loading && results === null ? (
            <p className="search-dropdown-loading">Buscando…</p>
          ) : items.length === 0 ? (
            <>
              <p className="search-dropdown-empty">No encontramos productos con ese nombre.</p>
              {suggestedCategories.length > 0 && (
                <div className="search-dropdown-suggested">
                  {suggestedCategories.slice(0, 3).map((c) => (
                    <Link key={c.refSlug} to={`/store/${slug}/c/${c.refSlug}`} onClick={close}>
                      {c.refName}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {items.map((p) => (
                <Link key={p.id} to={`/store/${slug}/p/${p.id}`} className="search-result-item" onClick={close}>
                  {p.imageUrl ? (
                    <img className="search-result-img" src={p.imageUrl} alt="" />
                  ) : (
                    <span className="search-result-img" />
                  )}
                  <span className="search-result-info">
                    <p className="search-result-name">{p.name}</p>
                  </span>
                  <span className="search-result-price">{formatPrice(p.price)}</span>
                </Link>
              ))}
              <Link to={`/store/${slug}/buscar?q=${encodeURIComponent(q.trim())}`} className="search-viewall" onClick={close}>
                Ver todos los resultados para «{q.trim()}»
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
