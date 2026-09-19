import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { centsToPesosInput, formatPrice, pesosToCents } from "../../../lib/money";
import { Loading } from "../components/Loading";
import {
  MOVEMENT_TYPE_UI,
  SUGGESTED_CATEGORIES,
  type AdminMovementRow,
  type AdminWallet,
  type FinanceSummary,
  type MovementType,
} from "../types";

function currentMonth(): string {
  // Mes contable AR (en-CA => YYYY-MM-DD)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .format(new Date())
    .slice(0, 7);
}

function monthQuery(month: string): string {
  const [y, m] = month.split("-");
  return `year=${y}&month=${Number(m)}`;
}

export function FinanzasPage() {
  const [wallets, setWallets] = useState<AdminWallet[] | null>(null);
  const [movements, setMovements] = useState<AdminMovementRow[] | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Filtros
  const [month, setMonth] = useState(currentMonth());
  const [day, setDay] = useState("");
  const [filterWallet, setFilterWallet] = useState("");
  const [filterType, setFilterType] = useState<"" | MovementType>("");

  // Alta de cartera
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletColor, setNewWalletColor] = useState("#fcc424");
  const [newWalletBalance, setNewWalletBalance] = useState("");

  // Edición de cartera (inline)
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);

  // Alta de movimiento
  const [movType, setMovType] = useState<MovementType>("income");
  const [movWallet, setMovWallet] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movCategory, setMovCategory] = useState("");
  const [movDescription, setMovDescription] = useState("");
  const [movDate, setMovDate] = useState("");

  const loadWallets = useCallback(async () => {
    setWallets(await apiJson<AdminWallet[]>("/admin/wallets"));
  }, []);

  const loadMonth = useCallback(async () => {
    const params = new URLSearchParams(monthQuery(month));
    if (day) params.set("day", day);
    if (filterWallet) params.set("walletId", filterWallet);
    if (filterType) params.set("type", filterType);
    const summaryParams = new URLSearchParams(monthQuery(month));
    if (day) summaryParams.set("day", day);
    const [movs, sum] = await Promise.all([
      apiJson<AdminMovementRow[]>(`/admin/finance/movements?${params}`),
      apiJson<FinanceSummary>(`/admin/finance/summary?${summaryParams}`),
    ]);
    setMovements(movs);
    setSummary(sum);
  }, [month, day, filterWallet, filterType]);

  useEffect(() => {
    loadWallets().catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [loadWallets]);

  useEffect(() => {
    loadMonth().catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [loadMonth]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await Promise.all([loadWallets(), loadMonth()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function createWallet() {
    const initialBalance = newWalletBalance.trim() === "" ? 0 : pesosToCents(newWalletBalance);
    if (initialBalance === null) {
      setError("Saldo inicial inválido");
      return;
    }
    void run(async () => {
      await apiJson("/admin/wallets", {
        method: "POST",
        body: JSON.stringify({ name: newWalletName.trim(), color: newWalletColor, initialBalance }),
      });
      setNewWalletName("");
      setNewWalletBalance("");
    });
  }

  function saveWallet() {
    if (!editing) return;
    const { id, name, color } = editing;
    void run(async () => {
      await apiJson(`/admin/wallets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      setEditing(null);
    });
  }

  function createMovement() {
    const amount = pesosToCents(movAmount);
    if (amount === null || amount <= 0) {
      setError("Monto inválido");
      return;
    }
    if (!movWallet) {
      setError("Elegí una cartera");
      return;
    }
    void run(async () => {
      await apiJson("/admin/finance/movements", {
        method: "POST",
        body: JSON.stringify({
          walletId: movWallet,
          type: movType,
          amount,
          ...(movCategory.trim() ? { category: movCategory.trim() } : {}),
          ...(movDescription.trim() ? { description: movDescription.trim() } : {}),
          ...(movDate ? { date: movDate } : {}),
        }),
      });
      setMovAmount("");
      setMovCategory("");
      setMovDescription("");
      setMovDate("");
    });
  }

  const activeWallets = wallets?.filter((w) => w.active) ?? [];

  return (
    <>
      <h1>Finanzas</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>Carteras</h2>
        {wallets === null ? (
          <Loading />
        ) : (
          <>
            {wallets.length === 0 && (
              <p className="muted">Sin carteras todavía — creá la primera para poder cobrar pedidos.</p>
            )}
            <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
              {wallets.map((wallet) =>
                editing?.id === wallet.id ? (
                  <div key={wallet.id} className="card" style={{ margin: 0 }}>
                    <div className="row" style={{ alignItems: "flex-end" }}>
                      <label className="field">
                        Nombre
                        <input
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        Color
                        <input
                          type="color"
                          value={editing.color}
                          onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                        />
                      </label>
                      <button className="btn primary" disabled={busy || !editing.name.trim()} onClick={saveWallet}>
                        Guardar
                      </button>
                      <button className="btn" disabled={busy} onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={wallet.id}
                    className="card"
                    style={{ margin: 0, opacity: wallet.active ? 1 : 0.55, minWidth: 220 }}
                  >
                    <p style={{ margin: 0 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: wallet.color ?? "#8A8278",
                          marginRight: 8,
                        }}
                      />
                      <strong>{wallet.name}</strong>
                      {!wallet.active && <span className="badge" style={{ marginLeft: 6 }}>inactiva</span>}
                    </p>
                    <p style={{ margin: "6px 0", fontSize: "1.25em" }}>{formatPrice(wallet.balance)}</p>
                    <p className="muted" style={{ margin: "0 0 8px" }}>
                      {wallet.movementCount} movimiento{wallet.movementCount === 1 ? "" : "s"}
                      {wallet.initialBalance !== 0 && <> · inicial {formatPrice(wallet.initialBalance)}</>}
                    </p>
                    <div className="row">
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          setEditing({ id: wallet.id, name: wallet.name, color: wallet.color ?? "#8A8278" })
                        }
                      >
                        Editar
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            apiJson(`/admin/wallets/${wallet.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ active: !wallet.active }),
                            })
                          )
                        }
                      >
                        {wallet.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="row" style={{ alignItems: "flex-end", marginTop: 12 }}>
              <label className="field">
                Nueva cartera
                <input
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="Efectivo, Banco…"
                />
              </label>
              <label className="field">
                Color
                <input type="color" value={newWalletColor} onChange={(e) => setNewWalletColor(e.target.value)} />
              </label>
              <label className="field">
                Saldo inicial ($)
                <input
                  value={newWalletBalance}
                  onChange={(e) => setNewWalletBalance(e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </label>
              <button className="btn primary" disabled={busy || !newWalletName.trim()} onClick={createWallet}>
                Crear cartera
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "flex-end" }}>
          <label className="field">
            Mes
            <input
              type="month"
              value={month}
              disabled={!!day}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </label>
          <label className="field">
            Ver un día puntual
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          {day && (
            <button className="btn" onClick={() => setDay("")}>
              Ver todo el mes
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="dash-grid dash-grid-stats" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-card-label">Ingresos</div>
            <div className="stat-card-value" style={{ color: MOVEMENT_TYPE_UI.income.color }}>{formatPrice(summary.ingresos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Egresos</div>
            <div className="stat-card-value" style={{ color: MOVEMENT_TYPE_UI.expense.color }}>{formatPrice(summary.egresos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Balance</div>
            <div className="stat-card-value">{formatPrice(summary.balance)}</div>
          </div>
          <div className="stat-card" title="Σ (precio − costo) × cantidad de los pedidos cobrados en el mes">
            <div className="stat-card-label">Ganancia bruta</div>
            <div className="stat-card-value">{formatPrice(summary.gananciaBruta)}</div>
          </div>
          <div className="stat-card" title="Ganancia bruta − egresos del mes">
            <div className="stat-card-label">Ganancia neta</div>
            <div
              className="stat-card-value"
              style={{ color: summary.gananciaNeta >= 0 ? MOVEMENT_TYPE_UI.income.color : MOVEMENT_TYPE_UI.expense.color }}
            >
              {formatPrice(summary.gananciaNeta)}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Nuevo movimiento</h2>
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field">
            Tipo
            <select value={movType} onChange={(e) => setMovType(e.target.value as MovementType)}>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </label>
          <label className="field">
            Cartera
            <select value={movWallet} onChange={(e) => setMovWallet(e.target.value)}>
              <option value="">Elegir…</option>
              {activeWallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Monto ($)
            <input value={movAmount} onChange={(e) => setMovAmount(e.target.value)} inputMode="decimal" placeholder="15000" />
          </label>
          <label className="field">
            Categoría
            <input
              value={movCategory}
              onChange={(e) => setMovCategory(e.target.value)}
              list="t9-categorias"
              placeholder={SUGGESTED_CATEGORIES[movType][0]}
            />
            <datalist id="t9-categorias">
              {SUGGESTED_CATEGORIES[movType].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="field">
            Descripción
            <input value={movDescription} onChange={(e) => setMovDescription(e.target.value)} placeholder="opcional" />
          </label>
          <label className="field">
            Fecha
            <input type="date" value={movDate} onChange={(e) => setMovDate(e.target.value)} />
          </label>
          <button className="btn primary" disabled={busy} onClick={createMovement}>
            Registrar
          </button>
        </div>
        {activeWallets.length === 0 && wallets !== null && (
          <p className="muted">Necesitás al menos una cartera activa.</p>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-end" }}>
        <h2 style={{ marginRight: "auto" }}>{day ? "Movimientos del día" : "Movimientos del mes"}</h2>
        <label className="field">
          Cartera
          <select value={filterWallet} onChange={(e) => setFilterWallet(e.target.value)}>
            <option value="">Todas</option>
            {(wallets ?? []).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Tipo
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
            <option value="">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Egresos</option>
          </select>
        </label>
      </div>

      {movements === null ? (
        <Loading />
      ) : movements.length === 0 ? (
        <p className="muted">Sin movimientos en este mes.</p>
      ) : (
        <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cartera</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Pedido</th>
              <th>Monto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {movements.map((mov, i) => {
              const ui = MOVEMENT_TYPE_UI[mov.type];
              const groupEnd = i === movements.length - 1 || movements[i + 1].date !== mov.date;
              let subtotalRow: ReactNode = null;
              if (groupEnd) {
                const group = movements.filter((m) => m.date === mov.date);
                const subtotal = group.reduce(
                  (acc, m) => acc + (m.type === "income" ? m.amount : -m.amount),
                  0
                );
                subtotalRow = (
                  <tr key={`${mov.date}-subtotal`} className="muted">
                    <td colSpan={5} style={{ textAlign: "right" }}>
                      Subtotal {new Date(`${mov.date}T00:00:00`).toLocaleDateString("es-AR")}
                    </td>
                    <td style={{ color: subtotal >= 0 ? MOVEMENT_TYPE_UI.income.color : MOVEMENT_TYPE_UI.expense.color }}>
                      <strong>{formatPrice(subtotal)}</strong>
                    </td>
                    <td />
                  </tr>
                );
              }
              return (
                <Fragment key={mov.id}>
                  <tr>
                    <td className="muted">{new Date(`${mov.date}T00:00:00`).toLocaleDateString("es-AR")}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: mov.walletColor ?? "#8A8278",
                          marginRight: 6,
                        }}
                      />
                      {mov.walletName}
                    </td>
                    <td>{mov.category ?? <span className="muted">—</span>}</td>
                    <td className="muted">{mov.description ?? "—"}</td>
                    <td>
                      {mov.orderId ? (
                        <Link to={`/admin/orders/${mov.orderId}`}>#{mov.orderNumber}</Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ color: ui.color }}>
                      <strong>{ui.sign} {formatPrice(mov.amount)}</strong>
                    </td>
                    <td>
                      {!mov.orderId && (
                        <button
                          className="btn danger"
                          disabled={busy}
                          onClick={() => {
                            if (!confirm("¿Borrar este movimiento?")) return;
                            void run(() =>
                              apiJson(`/admin/finance/movements/${mov.id}`, { method: "DELETE" })
                            );
                          }}
                        >
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                  {subtotalRow}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}
