import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiJson } from "../../../lib/api";
import { HomeSectionsRenderer } from "../../catalog/HomeSectionsRenderer";
import type { HomeSectionItem, Taxonomy } from "../types";

export function HomeSectionsPage() {
  const [sections, setSections] = useState<HomeSectionItem[] | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState("");
  // Drag & drop nativo HTML5 (patrón Bordart): reorden local en vivo + persistencia al soltar
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const orderBeforeDrag = useRef<HomeSectionItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [secs, cats, cols] = await Promise.all([
        apiJson<HomeSectionItem[]>("/admin/home-sections"),
        apiJson<Taxonomy[]>("/admin/categories"),
        apiJson<Taxonomy[]>("/admin/collections"),
      ]);
      setSections(secs);
      setCategories(cats);
      setCollections(cols);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inHome = new Set((sections ?? []).map((s) => `${s.refType}:${s.refId}`));
  const available = [
    ...categories
      .filter((c) => !inHome.has(`category:${c.id}`))
      .map((c) => ({ key: `category:${c.id}`, label: `Categoría: ${c.name}` })),
    ...collections
      .filter((c) => !inHome.has(`collection:${c.id}`))
      .map((c) => ({ key: `collection:${c.id}`, label: `Colección: ${c.name}` })),
  ];

  async function addSection(e: FormEvent) {
    e.preventDefault();
    if (!selection) return;
    const [refType, refId] = selection.split(":");
    setError(null);
    try {
      await apiJson("/admin/home-sections", {
        method: "POST",
        body: JSON.stringify({ refType, refId }),
      });
      setSelection("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  function onDragStart(index: number) {
    orderBeforeDrag.current = sections;
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !sections) return;
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setSections(next);
    setDragIndex(index);
  }

  async function onDragEnd() {
    setDragIndex(null);
    const before = orderBeforeDrag.current;
    orderBeforeDrag.current = null;
    if (!sections || !before) return;
    if (before.map((s) => s.id).join() === sections.map((s) => s.id).join()) return; // no cambió
    setError(null);
    try {
      await apiJson("/admin/home-sections/order", {
        method: "PUT",
        body: JSON.stringify({ sectionIds: sections.map((s) => s.id) }),
      });
    } catch (err) {
      setSections(before); // rollback
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function toggleVisible(section: HomeSectionItem) {
    setError(null);
    // Optimista: el preview reacciona al instante; rollback si el PATCH falla
    const before = sections;
    setSections(
      (prev) =>
        prev?.map((s) => (s.id === section.id ? { ...s, visible: !s.visible } : s)) ?? prev
    );
    try {
      await apiJson(`/admin/home-sections/${section.id}`, {
        method: "PATCH",
        body: JSON.stringify({ visible: !section.visible }),
      });
    } catch (err) {
      setSections(before);
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function removeSection(section: HomeSectionItem) {
    if (!confirm(`¿Quitar "${section.refName ?? "(sin nombre)"}" del home?`)) return;
    setError(null);
    try {
      await apiJson(`/admin/home-sections/${section.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <>
      <h1>Secciones del home</h1>
      <p className="muted">
        Armá la portada de tu tienda: arrastrá para ordenar, ocultá sin quitar, mezclá categorías
        y colecciones.
      </p>

      <div className="editor-split">
        <div>
      <div className="card">
        <h2>Agregar sección</h2>
        {available.length === 0 ? (
          <p className="muted">Todas tus categorías y colecciones ya están en el home.</p>
        ) : (
          <form onSubmit={addSection} className="row">
            <select value={selection} onChange={(e) => setSelection(e.target.value)} required>
              <option value="">Elegir…</option>
              {available.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <button className="btn primary" type="submit">Agregar</button>
          </form>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {sections === null ? (
        <p className="muted">Cargando…</p>
      ) : sections.length === 0 ? (
        <p className="muted">El home está vacío — agregá tu primera sección.</p>
      ) : (
        <div>
          {sections.map((s, i) => (
            <div
              key={s.id}
              className={`hs-row${dragIndex === i ? " dragging" : ""}${!s.visible ? " hidden-row" : ""}`}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => void onDragEnd()}
            >
              <span className="hs-grip" title="Arrastrá para ordenar">⠿</span>
              <span className="badge">{s.refType === "category" ? "Categoría" : "Colección"}</span>
              <strong>{s.refName ?? "(ref borrada)"}</strong>
              <span className="muted">{s.products.length} producto{s.products.length === 1 ? "" : "s"}</span>
              {!s.refActive && s.refName && (
                <span className="hs-warn">
                  {s.refType === "category" ? "categoría desactivada" : "colección desactivada"} — no se
                  muestra en la tienda
                </span>
              )}
              <span className="spacer" />
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={s.visible} onChange={() => void toggleVisible(s)} />
                Visible
              </label>
              <button className="btn small danger" onClick={() => void removeSection(s)}>Quitar</button>
            </div>
          ))}
        </div>
      )}
        </div>

        <aside className="preview-pane">
          <h2>Vista previa del home</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            La portada de tu tienda — se actualiza mientras arrastrás u ocultás.
          </p>
          <HomeSectionsRenderer sections={sections ?? []} />
        </aside>
      </div>
    </>
  );
}
