import { useOutletContext } from "react-router-dom";
import type { Me } from "../types";

export function AdminHomePage() {
  const me = useOutletContext<Me>();
  return (
    <>
      <h1>{me.orgName ?? "fabbric (super admin)"}</h1>
      <p>
        Sesión: <strong>{me.email}</strong> — rol <strong>{me.role}</strong>
      </p>
      <p className="muted">
        Portal Admin. Gestioná el catálogo desde el menú (Categorías, Colecciones, Productos).
        Stock, pedidos, clientes y finanzas llegan en las próximas fases.
      </p>
    </>
  );
}
