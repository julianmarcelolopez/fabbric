import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import { slugify } from "../../../lib/slug";
import type { Taxonomy } from "../types";

type Props = {
  title: string;
  /** base de la API, ej. "/admin/categories" */
  endpoint: string;
  /** singular para textos, ej. "categoría" */
  noun: string;
  /** true cuando se embebe como tab de otra pantalla (T19) — evita un <h1> duplicado */
  hideTitle?: boolean;
};

export function TaxonomyManager({ title, endpoint, noun, hideTitle }: Props) {
  const [items, setItems] = useState<Taxonomy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);
  // T21/01 — subida de imagen: un solo input file oculto compartido por toda la
  // tabla, "pendingId" recuerda a qué fila apunta el próximo archivo elegido.
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingId = useRef<string | null>(null);

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

  async function uploadImage(itemId: string, file: File) {
    setError(null);
    setUploadingId(itemId);
    try {
      await apiUpload(`${endpoint}/${itemId}/image`, file);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploadingId(null);
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
      {!hideTitle && <h1>{title}</h1>}

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
        <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Imagen</th>
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
                    <ImageCell
                      item={item}
                      uploading={uploadingId === item.id}
                      onPick={() => {
                        pendingId.current = item.id;
                        fileRef.current?.click();
                      }}
                    />
                  </td>
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
                  <td>
                    <ImageCell
                      item={item}
                      uploading={uploadingId === item.id}
                      onPick={() => {
                        pendingId.current = item.id;
                        fileRef.current?.click();
                      }}
                    />
                  </td>
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
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = pendingId.current;
          if (file && id) void uploadImage(id, file);
          e.target.value = "";
        }}
      />
    </>
  );
}

function ImageCell({
  item,
  uploading,
  onPick,
}: {
  item: Taxonomy;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
        />
      ) : (
        <span className="muted" style={{ fontSize: 12 }}>
          Sin imagen
        </span>
      )}
      <button type="button" className="btn small" onClick={onPick} disabled={uploading}>
        {uploading ? "Subiendo…" : item.imageUrl ? "Cambiar" : "Subir"}
      </button>
    </div>
  );
}
