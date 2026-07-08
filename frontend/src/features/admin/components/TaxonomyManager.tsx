import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiJson } from "../../../lib/api";
import { slugify } from "../../../lib/slug";
import type { Taxonomy } from "../types";

type Props = {
  title: string;
  /** base de la API, ej. "/admin/categories" */
  endpoint: string;
  /** singular para textos, ej. "categoría" */
  noun: string;
};

export function TaxonomyManager({ title, endpoint, noun }: Props) {
  const [items, setItems] = useState<Taxonomy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await apiJson<Taxonomy[]>(endpoint));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, [endpoint]);

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

  async function create(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      await apiJson(endpoint, { method: "POST", body: JSON.stringify({ name, slug }) });
      setName("");
      setSlug("");
      setSlugTouched(false);
    });
  }

  return (
    <>
      <h1>{title}</h1>

      <div className="card">
        <h2>Nueva {noun}</h2>
        <form onSubmit={create} className="row">
          <label className="field">
            Nombre
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </label>
          <label className="field">
            Slug
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="solo minúsculas, números y guiones"
            />
          </label>
          <button className="btn primary" type="submit">Crear</button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}

      {items === null ? (
        <p className="muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="muted">Todavía no hay {noun}s.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Activa</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              editing?.id === item.id ? (
                <tr key={item.id}>
                  <td>
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editing.slug}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    />
                  </td>
                  <td></td>
                  <td>
                    <button
                      className="btn small primary"
                      onClick={() =>
                        run(async () => {
                          await apiJson(`${endpoint}/${item.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ name: editing.name, slug: editing.slug }),
                          });
                          setEditing(null);
                        })
                      }
                    >
                      Guardar
                    </button>{" "}
                    <button className="btn small" onClick={() => setEditing(null)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="muted">{item.slug}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(e) =>
                        run(() =>
                          apiJson(`${endpoint}/${item.id}`, {
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
                      onClick={() => setEditing({ id: item.id, name: item.name, slug: item.slug })}
                    >
                      Editar
                    </button>{" "}
                    <button
                      className="btn small danger"
                      onClick={() => {
                        if (confirm(`¿Borrar la ${noun} "${item.name}"?`)) {
                          void run(() => apiJson(`${endpoint}/${item.id}`, { method: "DELETE" }));
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
