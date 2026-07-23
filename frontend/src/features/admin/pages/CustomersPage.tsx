import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import type { AdminCustomerRow } from "../types";

export function CustomersPage() {
  const [rows, setRows] = useState<AdminCustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Búsqueda con debounce: la API filtra por nombre o email
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setError(null);
      const query = search.trim();
      try {
        const data = await apiJson<AdminCustomerRow[]>(
          `/admin/customers${query ? `?search=${encodeURIComponent(query)}` : ""}`
        );
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <>
      <h1>Clientes</h1>

      <div className="card">
        <label className="field">
          Buscar
          <input
            type="search"
            placeholder="Nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {rows === null ? (
        <p className="muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="muted">
          {search.trim() ? "Sin resultados para la búsqueda." : "Todavía no hay clientes (se crean al comprar en la tienda o desde un pedido manual)."}
        </p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Pedidos</th>
              <th>Total gastado</th>
              <th>Última compra</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((customer) => (
              <tr
                key={customer.id}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/admin/customers/${customer.id}`)}
              >
                <td>
                  <Link to={`/admin/customers/${customer.id}`} onClick={(e) => e.stopPropagation()}>
                    <strong>{customer.name}</strong>
                  </Link>
                </td>
                <td className="muted">{customer.email}</td>
                <td className="muted">{customer.phone ?? "—"}</td>
                <td>{customer.orderCount}</td>
                <td>{formatPrice(customer.totalSpent)}</td>
                <td className="muted">
                  {customer.lastOrderAt
                    ? new Date(customer.lastOrderAt).toLocaleDateString("es-AR")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
