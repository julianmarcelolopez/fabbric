import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiJson } from "../../../lib/api";
import { centsToPesosInput, formatPrice, pesosToCents } from "../../../lib/money";
import type { ShippingZoneRow } from "../types";

type Editing = { id: string; name: string; cost: string; freeFrom: string };

export function ShippingZonesPage() {
  const [zones, setZones] = useState<ShippingZoneRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [freeFrom, setFreeFrom] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);

  const load = useCallback(async () => {
    try {
      setZones(await apiJson<ShippingZoneRow[]>("/admin/shipping-zones"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  function parseMoney(costStr: string, freeStr: string): { cost: number; freeShippingFrom: number | null } | null {
    const c = pesosToCents(costStr);
    if (c === null) {
      setError("Costo inválido");
      return null;
    }
    const f = freeStr.trim() === "" ? null : pesosToCents(freeStr);
    if (freeStr.trim() !== "" && f === null) {
      setError("Monto de envío gratis inválido");
      return null;
    }
    return { cost: c, freeShippingFrom: f };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const money = parseMoney(cost, freeFrom);
    if (!money) return;
    await run(async () => {
      await apiJson("/admin/shipping-zones", {
        method: "POST",
        body: JSON.stringify({ name, ...money }),
      });
      setName("");
      setCost("");
      setFreeFrom("");
    });
  }

  return (
    <>
      <h1>Zonas de envío</h1>
      <p className="muted">
        Costo fijo por zona; opcionalmente envío gratis superando un monto. El comprador elige la
        zona en el checkout.
      </p>

      <div className="card">
        <h2>Nueva zona</h2>
        <form onSubmit={create} className="row">
          <label className="field" style={{ flex: 1, minWidth: 160 }}>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="CABA" />
          </label>
          <label className="field">
            Costo ($)
            <input style={{ width: 100 }} value={cost} onChange={(e) => setCost(e.target.value)} required inputMode="decimal" />
          </label>
          <label className="field">
            Gratis desde ($, opcional)
            <input style={{ width: 120 }} value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)} inputMode="decimal" placeholder="—" />
          </label>
          <button className="btn primary" type="submit">Crear</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      {zones === null ? (
        <p className="muted">Cargando…</p>
      ) : zones.length === 0 ? (
        <p className="muted">Sin zonas todavía — el checkout necesita al menos una activa.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Costo</th>
              <th>Gratis desde</th>
              <th>Activa</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) =>
              editing?.id === zone.id ? (
                <tr key={zone.id}>
                  <td><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                  <td><input style={{ width: 90 }} value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: e.target.value })} inputMode="decimal" /></td>
                  <td><input style={{ width: 110 }} value={editing.freeFrom} onChange={(e) => setEditing({ ...editing, freeFrom: e.target.value })} inputMode="decimal" placeholder="—" /></td>
                  <td></td>
                  <td>
                    <button
                      className="btn small primary"
                      onClick={() => {
                        const money = parseMoney(editing.cost, editing.freeFrom);
                        if (!money) return;
                        void run(async () => {
                          await apiJson(`/admin/shipping-zones/${zone.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ name: editing.name, ...money }),
                          });
                          setEditing(null);
                        });
                      }}
                    >
                      Guardar
                    </button>{" "}
                    <button className="btn small" onClick={() => setEditing(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={zone.id}>
                  <td>{zone.name}</td>
                  <td>{formatPrice(zone.cost)}</td>
                  <td>{zone.freeShippingFrom === null ? "—" : formatPrice(zone.freeShippingFrom)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={zone.active}
                      onChange={(e) =>
                        run(() =>
                          apiJson(`/admin/shipping-zones/${zone.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ active: e.target.checked }),
                          })
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn small"
                      onClick={() =>
                        setEditing({
                          id: zone.id,
                          name: zone.name,
                          cost: centsToPesosInput(zone.cost),
                          freeFrom: centsToPesosInput(zone.freeShippingFrom),
                        })
                      }
                    >
                      Editar
                    </button>{" "}
                    <button
                      className="btn small danger"
                      onClick={() => {
                        if (confirm(`¿Borrar la zona "${zone.name}"? Las órdenes existentes conservan su costo.`)) {
                          void run(() => apiJson(`/admin/shipping-zones/${zone.id}`, { method: "DELETE" }));
                        }
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
