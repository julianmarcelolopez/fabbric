import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { formatPrice } from "../../../lib/money";
import { DashboardCustomizable, type DashboardCardDef } from "../components/DashboardCustomizable";
import {
  ADMIN_ORDER_STATUS,
  MOVEMENT_TYPE_UI,
  type Me,
  type MetricsOverview,
} from "../types";

function currentMonth(): string {
  // Mes contable AR (en-CA => YYYY-MM-DD)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .format(new Date())
    .slice(0, 7);
}

function Stat({ value, hint }: { value: React.ReactNode; hint?: string }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-value">{value}</div>
      {hint && <div className="muted">{hint}</div>}
    </div>
  );
}

export function DashboardPage() {
  const me = useOutletContext<Me>();
  const [month, setMonth] = useState(currentMonth());
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me.orgId) return;
    const [y, m] = month.split("-");
    try {
      const data = await apiJson<MetricsOverview>(`/admin/metrics/overview?year=${y}&month=${Number(m)}`);
      setOverview(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [me.orgId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!me.orgId) {
    // Super admin: sin org, sin métricas — placeholder simple
    return (
      <>
        <h1>fabbric (super admin)</h1>
        <p>
          Sesión: <strong>{me.email}</strong> — rol <strong>{me.role}</strong>
        </p>
        <p className="muted">El panel de super admin llega en una fase posterior.</p>
      </>
    );
  }

  if (error) return <p className="error">{error}</p>;
  if (!overview) return <p className="muted">Cargando…</p>;

  const { stats, paneles } = overview;

  const statCards: DashboardCardDef[] = [
    { id: "pedidosMes", label: "Pedidos del mes", content: <Stat value={stats.pedidosMes} /> },
    {
      id: "ingresos",
      label: "Ingresos",
      content: <Stat value={<span style={{ color: MOVEMENT_TYPE_UI.income.color }}>{formatPrice(stats.ingresos)}</span>} />,
    },
    {
      id: "egresos",
      label: "Egresos",
      content: <Stat value={<span style={{ color: MOVEMENT_TYPE_UI.expense.color }}>{formatPrice(stats.egresos)}</span>} />,
    },
    { id: "balance", label: "Balance", content: <Stat value={formatPrice(stats.balance)} /> },
    {
      id: "gananciaBruta",
      label: "Ganancia bruta",
      content: <Stat value={formatPrice(stats.gananciaBruta)} hint="precio − costo de lo cobrado" />,
    },
    {
      id: "gananciaNeta",
      label: "Ganancia neta",
      content: (
        <Stat
          value={
            <span style={{ color: stats.gananciaNeta >= 0 ? MOVEMENT_TYPE_UI.income.color : MOVEMENT_TYPE_UI.expense.color }}>
              {formatPrice(stats.gananciaNeta)}
            </span>
          }
          hint="bruta − egresos"
        />
      ),
    },
    { id: "clientesNuevos", label: "Clientes nuevos", content: <Stat value={stats.clientesNuevos} /> },
    { id: "porCobrar", label: "Por cobrar", content: <Stat value={formatPrice(stats.porCobrar)} hint="deuda viva, todos los pendientes" /> },
    { id: "ticketPromedio", label: "Ticket promedio", content: <Stat value={formatPrice(stats.ticketPromedio)} /> },
  ];

  const totalPersonalizado = paneles.catalogoVsPersonalizado.catalogo.qty + paneles.catalogoVsPersonalizado.personalizado.qty;
  const totalCanal = paneles.ventasPorCanal.online.qty + paneles.ventasPorCanal.local.qty + paneles.ventasPorCanal.sinCanal.qty;
  const maxMensual = Math.max(1, ...paneles.ingresosEgresosMensual.flatMap((p) => [p.ingresos, p.egresos]));

  const panelCards: DashboardCardDef[] = [
    {
      id: "ultimosPedidos",
      label: "Últimos pedidos",
      content:
        paneles.ultimosPedidos.length === 0 ? (
          <p className="muted">Sin pedidos todavía.</p>
        ) : (
          <table className="grid">
            <tbody>
              {paneles.ultimosPedidos.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}>#{o.orderNumber}</Link></td>
                  <td>{o.customerName ?? <span className="muted">—</span>}</td>
                  <td style={{ color: ADMIN_ORDER_STATUS[o.status].color }}>{ADMIN_ORDER_STATUS[o.status].label}</td>
                  <td>{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    {
      id: "masVendidos",
      label: "Más vendidos del mes",
      content:
        paneles.masVendidos.length === 0 ? (
          <p className="muted">Sin ventas cobradas este mes.</p>
        ) : (
          <table className="grid">
            <tbody>
              {paneles.masVendidos.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.qty} u.</td>
                  <td>{formatPrice(p.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
    },
    {
      id: "catalogoVsPersonalizado",
      label: "Catálogo vs Personalizado",
      content: (
        <div className="dash-breakdown">
          <div className="dash-bar">
            <span>Catálogo ({paneles.catalogoVsPersonalizado.catalogo.qty} u.)</span>
            <div className="dash-bar-track">
              <div
                className="dash-bar-fill"
                style={{ width: `${totalPersonalizado ? (paneles.catalogoVsPersonalizado.catalogo.qty / totalPersonalizado) * 100 : 0}%`, background: "#2563eb" }}
              />
            </div>
          </div>
          <div className="dash-bar">
            <span>Personalizado ({paneles.catalogoVsPersonalizado.personalizado.qty} u.)</span>
            <div className="dash-bar-track">
              <div
                className="dash-bar-fill"
                style={{ width: `${totalPersonalizado ? (paneles.catalogoVsPersonalizado.personalizado.qty / totalPersonalizado) * 100 : 0}%`, background: "#7c3aed" }}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "ventasPorCanal",
      label: "Ventas por canal",
      content: (
        <div className="dash-breakdown">
          {(["online", "local", "sinCanal"] as const).map((canal) => {
            const row = paneles.ventasPorCanal[canal];
            const label = canal === "online" ? "Online" : canal === "local" ? "Local" : "Sin canal";
            return (
              <div className="dash-bar" key={canal}>
                <span>{label} ({row.qty} u.)</span>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill"
                    style={{ width: `${totalCanal ? (row.qty / totalCanal) * 100 : 0}%`, background: "#0891b2" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: "ingresosEgresosMensual",
      label: "Ingresos y egresos (últimos 6 meses)",
      content: (
        <div className="dash-chart">
          {paneles.ingresosEgresosMensual.map((p) => (
            <div className="dash-chart-col" key={`${p.year}-${p.month}`}>
              <div className="dash-chart-bars">
                <div
                  className="dash-chart-bar"
                  style={{ height: `${(p.ingresos / maxMensual) * 100}%`, background: MOVEMENT_TYPE_UI.income.color }}
                  title={`Ingresos: ${formatPrice(p.ingresos)}`}
                />
                <div
                  className="dash-chart-bar"
                  style={{ height: `${(p.egresos / maxMensual) * 100}%`, background: MOVEMENT_TYPE_UI.expense.color }}
                  title={`Egresos: ${formatPrice(p.egresos)}`}
                />
              </div>
              <span className="muted dash-chart-label">{String(p.month).padStart(2, "0")}/{String(p.year).slice(2)}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>{me.orgName}</h1>
        <label className="field">
          Mes
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>
      <DashboardCustomizable initialLayout={me.dashboardLayout} stats={statCards} paneles={panelCards} />
    </>
  );
}
