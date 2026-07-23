import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ApiError, apiJson } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import "./admin.css";
import type { Me } from "./types";

type State =
  | { status: "loading" }
  | { status: "ok"; me: Me }
  | { status: "no-access" }
  | { status: "error"; message: string };

export function AdminLayout() {
  const [state, setState] = useState<State>({ status: "loading" });
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
      <aside className="sidebar">
        <h2>{me.orgName ?? "fabbric"}</h2>
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/categories">Categorías</NavLink>
        <NavLink to="/admin/collections">Colecciones</NavLink>
        <NavLink to="/admin/products">Productos</NavLink>
        <NavLink to="/admin/stock">Stock</NavLink>
        <NavLink to="/admin/orders">Pedidos</NavLink>
        <NavLink to="/admin/customers">Clientes</NavLink>
        <NavLink to="/admin/finance">Finanzas</NavLink>
        <NavLink to="/admin/home">Home</NavLink>
        <NavLink to="/admin/shipping">Envíos</NavLink>
        <NavLink to="/admin/config">Tienda</NavLink>
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
