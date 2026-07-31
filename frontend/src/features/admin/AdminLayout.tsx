import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ApiError, apiJson } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import "./admin.css";
import type { CatalogConfig, Me } from "./types";

type State =
  | { status: "loading" }
  | { status: "ok"; me: Me }
  | { status: "no-access" }
  | { status: "error"; message: string };

type NavGroup = {
  label: string;
  items: { to: string; label: string; end?: boolean }[];
};

// T19/01: agrupado por sección — reemplaza la lista plana de 12 links.
// Categorías/Colecciones/Stock ya viven como tabs de Productos (T19/02);
// Home + Config de tienda ya se unificaron en Mi tienda (T19/07).
const NAV_GROUPS: NavGroup[] = [
  { label: "Panel", items: [{ to: "/admin", label: "Dashboard", end: true }] },
  { label: "Catálogo", items: [{ to: "/admin/products", label: "Productos" }] },
  { label: "Mi tienda", items: [{ to: "/admin/store", label: "Configurar tienda" }] },
  {
    label: "Ventas",
    items: [
      { to: "/admin/orders", label: "Pedidos" },
      { to: "/admin/customers", label: "Clientes" },
      { to: "/admin/finance", label: "Finanzas" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { to: "/admin/shipping", label: "Envíos" },
      { to: "/admin/settings", label: "Ajustes" },
    ],
  },
];

export function AdminLayout() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    apiJson<Me>("/admin/me")
      .then((me) => {
        if (!cancelled) setState({ status: "ok", me });
      })
      .catch(async (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setState({ status: "no-access" });
        } else if (err instanceof ApiError && err.status === 401) {
          // Sesión inválida/vencida: cerrar y volver al login (sin loop)
          await supabase.auth.signOut();
          navigate("/admin/login", { replace: true });
        } else {
          setState({ status: "error", message: err?.message ?? String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    // Super admin no tiene orgId → no hay tienda que mostrar en el widget de estado.
    if (state.status !== "ok" || !state.me.orgId) return;
    let cancelled = false;
    apiJson<CatalogConfig>("/admin/catalog-config")
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      // Widget no crítico: si falla, simplemente no se muestra.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state]);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  if (state.status === "loading") return <div className="content">Cargando…</div>;

  if (state.status === "no-access") {
    return (
      <main className="content">
        <h1>Sin acceso</h1>
        <p>Tu cuenta no tiene permisos de administrador en ninguna tienda.</p>
        <button className="btn" onClick={logout}>Cerrar sesión</button>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="content">
        <h1>Error</h1>
        <p>{state.message}</p>
        <button className="btn" onClick={logout}>Cerrar sesión</button>
      </main>
    );
  }

  const { me } = state;
  return (
    <div className="admin">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Abrir menú"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <h2>{me.orgName ?? "fabbric"}</h2>
          {config && (
            <div className={`store-status${config.active ? "" : " inactive"}`}>
              <span className="status-dot" />
              <span className="status-text">{config.active ? "Tienda activa" : "Tienda inactiva"}</span>
              <a className="status-link" href={`/store/${config.slug}`} target="_blank" rel="noreferrer">
                Ver →
              </a>
            </div>
          )}
        </div>

        <nav>
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="spacer" />
        <div className="who">
          {me.email}
          <br />({me.role})
        </div>
        <button className="btn" onClick={logout}>Cerrar sesión</button>
      </aside>
      <main className="content">
        <Outlet context={me} />
      </main>
    </div>
  );
}
