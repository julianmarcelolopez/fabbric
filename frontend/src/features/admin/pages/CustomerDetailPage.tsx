import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import {
  ADMIN_ORDER_STATUS,
  ADMIN_ORDER_TYPE_LABELS,
  type AdminCustomerDetail,
} from "../types";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiJson<AdminCustomerDetail>(`/admin/customers/${id}`)
      .then((data) => {
        if (!cancelled) setCustomer(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <>
        <h1>Cliente</h1>
        <p className="error">{error}</p>
        <Link to="/admin/customers">← Volver a clientes</Link>
      </>
    );
  }
  if (!customer) return <p className="muted">Cargando…</p>;

  return (
    <>
      <p><Link to="/admin/customers">← Clientes</Link></p>
      <h1>{customer.name}</h1>
      <p className="muted">Cliente desde {new Date(customer.createdAt).toLocaleDateString("es-AR")}</p>

      <div className="card">
        <h2>Contacto</h2>
        <p>
          {customer.email}
          {customer.phone && <> · {customer.phone}</>}
        </p>
        {customer.address && <p className="muted">Dirección: {customer.address}</p>}
      </div>

      <h2>Historial de pedidos</h2>
      {customer.orders.length === 0 ? (
        <p className="muted">Sin pedidos todavía.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.map((order) => {
              const st = ADMIN_ORDER_STATUS[order.status];
              return (
                <tr key={order.id}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`}><strong>#{order.orderNumber}</strong></Link>
                  </td>
                  <td className="muted">{new Date(order.createdAt).toLocaleDateString("es-AR")}</td>
                  <td><span className="badge">{ADMIN_ORDER_TYPE_LABELS[order.type]}</span></td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <span className="portal-badge" style={{ color: st.color, borderColor: st.color }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
