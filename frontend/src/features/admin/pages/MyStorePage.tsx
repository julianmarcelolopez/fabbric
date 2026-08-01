import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import { HomeSectionsRenderer, type HsrSection } from "../../catalog/HomeSectionsRenderer";
import type { CatalogConfig, HomeSectionItem, ProductListItem, Taxonomy } from "../types";

type ConfigForm = {
  storeName: string;
  slug: string;
  accentColor: string;
  businessDescription: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  businessHours: string;
  // T21/03 — vacío = la tienda pública autogenera el texto desde zonas de envío
  announcementText: string;
  // T21/04 — vacío = mid-banner del home sin overlay ni texto (T20/03)
  midBannerTitle: string;
  midBannerSubtitle: string;
  // T21/06 — vacío = la ficha de producto sigue derivando a WhatsApp (T20/06)
  returnPolicy: string;
  active: boolean;
};

// T19/07 — "Mi tienda": Home + Configuración unificados. Opción A (decisión del usuario):
// todo (secciones + identidad) vive en estado local hasta "Guardar cambios", igual que el
// patrón de ProductEditPage — la vista previa refleja el estado local, no lo que ya está
// guardado. Únicas excepciones: logo y banner, que se suben (y confirman) al toque, igual
// que ImageDropzone en ProductEditPage — no tiene sentido "diferir" una subida de archivo.

function tempId(refType: "category" | "collection", refId: string) {
  return `new:${refType}:${refId}`;
}

export function MyStorePage() {
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [sections, setSections] = useState<HomeSectionItem[] | null>(null);
  const [initialSections, setInitialSections] = useState<HomeSectionItem[] | null>(null);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, cats, cols, prods, secs] = await Promise.all([
        apiJson<CatalogConfig>("/admin/catalog-config"),
        apiJson<Taxonomy[]>("/admin/categories"),
        apiJson<Taxonomy[]>("/admin/collections"),
        apiJson<ProductListItem[]>("/admin/products"),
        apiJson<HomeSectionItem[]>("/admin/home-sections"),
      ]);
      setConfig(c);
      setForm({
        storeName: c.storeName,
        slug: c.slug,
        accentColor: c.accentColor,
        businessDescription: c.businessDescription ?? "",
        whatsapp: c.whatsapp ?? "",
        instagram: c.instagram ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        businessHours: c.businessHours ?? "",
        announcementText: c.announcementText ?? "",
        midBannerTitle: c.midBannerTitle ?? "",
        midBannerSubtitle: c.midBannerSubtitle ?? "",
        returnPolicy: c.returnPolicy ?? "",
        active: c.active,
      });
      setCategories(cats);
      setCollections(cols);
      setProducts(prods);
      setSections(secs);
      setInitialSections(secs);
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

  function addSection() {
    if (!selection || !sections) return;
    const [refType, refId] = selection.split(":") as ["category" | "collection", string];
    const source = refType === "category" ? categories : collections;
    const ref = source.find((c) => c.id === refId);
    setSections([
      ...sections,
      {
        id: tempId(refType, refId),
        refType,
        refId,
        sortOrder: sections.length,
        visible: true,
        refName: ref?.name ?? null,
        refSlug: ref?.slug ?? null,
        refActive: true,
        products: [],
      },
    ]);
    setSelection("");
  }

  function removeSection(id: string) {
    setSections((prev) => prev?.filter((s) => s.id !== id) ?? prev);
  }

  function toggleVisible(id: string) {
    setSections((prev) => prev?.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)) ?? prev);
  }

  function onDragStart(index: number) {
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

  function onDragEnd() {
    // Opción A: el reorden queda en estado local — recién se persiste al Guardar.
    setDragIndex(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !sections || !initialSections) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updatedConfig = await apiJson<CatalogConfig>("/admin/catalog-config", {
        method: "PATCH",
        body: JSON.stringify({
          storeName: form.storeName,
          slug: form.slug,
          accentColor: form.accentColor,
          businessDescription: form.businessDescription.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          instagram: form.instagram.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          businessHours: form.businessHours.trim() || null,
          announcementText: form.announcementText.trim() || null,
          midBannerTitle: form.midBannerTitle.trim() || null,
          midBannerSubtitle: form.midBannerSubtitle.trim() || null,
          returnPolicy: form.returnPolicy.trim() || null,
          active: form.active,
        }),
      });

      // Diff de secciones contra la foto del último load() — todo lo demás fue edición local.
      const currentRealIds = new Set(sections.filter((s) => !s.id.startsWith("new:")).map((s) => s.id));
      const removed = initialSections.filter((s) => !currentRealIds.has(s.id));
      for (const s of removed) {
        await apiJson(`/admin/home-sections/${s.id}`, { method: "DELETE" });
      }

      // Crear las nuevas (en el orden local actual) y resolver su id real; ajustar
      // visibilidad de las que ya existían y cambiaron. El PUT de orden exige la lista
      // EXACTA de ids reales que van a quedar, así que va al final, con todo resuelto.
      const orderedRealIds: string[] = [];
      for (const s of sections) {
        if (s.id.startsWith("new:")) {
          const created = await apiJson<{ id: string }>("/admin/home-sections", {
            method: "POST",
            body: JSON.stringify({ refType: s.refType, refId: s.refId }),
          });
          orderedRealIds.push(created.id);
          if (!s.visible) {
            await apiJson(`/admin/home-sections/${created.id}`, {
              method: "PATCH",
              body: JSON.stringify({ visible: false }),
            });
          }
        } else {
          orderedRealIds.push(s.id);
          const before = initialSections.find((i) => i.id === s.id);
          if (before && before.visible !== s.visible) {
            await apiJson(`/admin/home-sections/${s.id}`, {
              method: "PATCH",
              body: JSON.stringify({ visible: s.visible }),
            });
          }
        }
      }

      await apiJson("/admin/home-sections/order", {
        method: "PUT",
        body: JSON.stringify({ sectionIds: orderedRealIds }),
      });

      setConfig(updatedConfig);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // Logo y banner quedan FUERA de "Opción A": se suben (y confirman) al toque, como
  // ImageDropzone en ProductEditPage — no hay forma útil de "previsualizar sin guardar"
  // un archivo que todavía no se subió a Storage.
  async function uploadLogo(file: File) {
    setError(null);
    setUploading(true);
    try {
      const updated = await apiUpload<CatalogConfig>("/admin/catalog-config/logo", file);
      setConfig(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function uploadBanner(file: File) {
    setError(null);
    setUploadingBanner(true);
    try {
      const updated = await apiUpload<CatalogConfig>("/admin/catalog-config/banner", file);
      setConfig(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploadingBanner(false);
    }
  }

  function shareUrl(slug: string) {
    return `${window.location.origin}/store/${slug}`;
  }

  async function copyLink() {
    if (!form) return;
    await navigator.clipboard.writeText(shareUrl(form.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareInstagram() {
    if (!form) return;
    const url = shareUrl(form.slug);
    if (navigator.share) {
      try {
        await navigator.share({ title: form.storeName, url });
      } catch {
        // usuario canceló el share nativo — no es un error
      }
      return;
    }
    await copyLink();
  }

  if (!config || !form || !sections) {
    return (
      <>
        <h1>Mi tienda</h1>
        {error ? <p className="error">{error}</p> : <p className="muted">Cargando…</p>}
      </>
    );
  }

  // Productos por sección calculados en el cliente (no desde /admin/home-sections) para que
  // la vista previa funcione igual para secciones ya guardadas y para las recién agregadas
  // localmente, que todavía no existen en el backend (Opción A).
  function productsFor(section: HomeSectionItem): HsrSection["products"] {
    const visible = products.filter((p) => p.visibleInCatalog && p.status !== "paused");
    const matching =
      section.refType === "category"
        ? visible.filter((p) => p.categoryId === section.refId)
        : visible.filter((p) => p.collections.some((c) => c.id === section.refId));
    return matching.slice(0, 8).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      brand: p.brand,
      imageUrl: p.firstImageUrl,
    }));
  }

  const previewSections: HsrSection[] = sections.map((s) => ({
    id: s.id,
    refName: s.refName,
    visible: s.visible,
    refActive: s.refActive,
    products: productsFor(s),
  }));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Mi tienda</h1>
        <div className="row">
          <button type="button" className="btn" onClick={() => void copyLink()}>
            {copied ? "Copiado ✓" : "🔗 Copiar link"}
          </button>
          <button type="button" className="btn" onClick={() => void shareInstagram()}>
            📱 Compartir en Instagram
          </button>
        </div>
      </div>

      <div className="editor-split">
        <div>
          <form onSubmit={save} className="card">
            <h2>Secciones visibles</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Arrastrá para ordenar, ocultá sin quitar — los cambios se ven en la vista previa
              al instante, pero no se guardan hasta que toques "Guardar cambios".
            </p>

            {sections.length === 0 ? (
              <p className="muted">Todavía no agregaste ninguna sección.</p>
            ) : (
              <div style={{ marginBottom: 12 }}>
                {sections.map((s, i) => (
                  <div
                    key={s.id}
                    className={`hs-row${dragIndex === i ? " dragging" : ""}${!s.visible ? " hidden-row" : ""}`}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDragEnd={onDragEnd}
                  >
                    <span className="hs-grip" title="Arrastrá para ordenar">⠿</span>
                    <span className="badge">{s.refType === "category" ? "Categoría" : "Colección"}</span>
                    <strong>{s.refName ?? "(ref borrada)"}</strong>
                    {s.id.startsWith("new:") && <span className="hs-warn">nueva, sin guardar</span>}
                    {!s.refActive && s.refName && (
                      <span className="hs-warn">
                        {s.refType === "category" ? "categoría desactivada" : "colección desactivada"}
                      </span>
                    )}
                    <span className="spacer" />
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input type="checkbox" checked={s.visible} onChange={() => toggleVisible(s.id)} />
                      Visible
                    </label>
                    <button type="button" className="btn small danger" onClick={() => removeSection(s.id)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {available.length === 0 ? (
              <p className="muted">Todas tus categorías y colecciones ya están en el home.</p>
            ) : (
              <div className="row" style={{ marginBottom: 20 }}>
                <select value={selection} onChange={(e) => setSelection(e.target.value)}>
                  <option value="">Elegir…</option>
                  {available.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <button type="button" className="btn" disabled={!selection} onClick={addSection}>
                  + Agregar sección
                </button>
              </div>
            )}

            <h2>Identidad</h2>
            <div className="row" style={{ marginBottom: 12 }}>
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                Nombre de la tienda
                <input
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                Color de acento
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  style={{ width: 60, height: 34, padding: 2 }}
                />
              </label>
              <label className="field" style={{ flexDirection: "row", alignItems: "center", display: "flex", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Tienda activa (visible al público)
              </label>
            </div>
            <p className="muted" style={{ margin: "-6px 0 12px" }}>
              El color de acento se usa en los botones de compra, links activos y detalles de toda la
              tienda — cambialo y vas a ver el resultado reflejado ahí mismo.
            </p>

            <label className="field" style={{ marginBottom: 4, maxWidth: 320 }}>
              URL de la tienda (slug)
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="solo minúsculas, números y guiones"
              />
            </label>
            <p className="muted" style={{ margin: "0 0 12px" }}>
              Tu tienda vive en <code>/store/{form.slug || "…"}</code>
              {form.slug !== config.slug && " — ojo: cambiar la URL rompe los links ya compartidos"}
            </p>

            <label className="field" style={{ marginBottom: 12 }}>
              Descripción del negocio (aparece en el pie de la tienda)
              <textarea
                rows={3}
                maxLength={2000}
                value={form.businessDescription}
                onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
              />
            </label>

            <label className="field" style={{ marginBottom: 4 }}>
              Texto de la barra superior (announcement bar)
              <input
                value={form.announcementText}
                onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
                placeholder="Se genera automáticamente desde tus zonas de envío si lo dejás vacío"
                maxLength={120}
              />
            </label>
            <p className="muted" style={{ margin: "0 0 12px" }}>
              {form.announcementText.length}/120 — texto libre. Vacío = se arma solo con la zona de envío gratis más
              accesible.
            </p>

            <label className="field" style={{ marginBottom: 4 }}>
              Política de cambios/devoluciones (aparece en la ficha de cada producto)
              <textarea
                rows={3}
                maxLength={2000}
                value={form.returnPolicy}
                onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                placeholder="Ej: Cambios dentro de los 30 días con ticket de compra"
              />
            </label>
            <p className="muted" style={{ margin: "0 0 12px" }}>
              Vacío = la ficha de producto sigue mostrando "Consultanos por WhatsApp" en vez de una política propia.
            </p>

            <p className="muted" style={{ margin: "0 0 4px", fontWeight: 600 }}>
              Contacto y horario (aparecen en el pie de la tienda)
            </p>
            <div className="row" style={{ marginBottom: 12 }}>
              <label className="field">
                WhatsApp
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="+54 9 11 2233-4455"
                  maxLength={20}
                />
              </label>
              <label className="field">
                Instagram
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="https://instagram.com/tu_tienda"
                  maxLength={100}
                />
              </label>
              <label className="field">
                Mail de contacto
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@tutienda.com"
                />
              </label>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Dirección
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Av. Falsa 123, Almirante Brown"
                  maxLength={200}
                />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Horario
                <input
                  value={form.businessHours}
                  onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                  placeholder="Lun a Vie 9 a 18hs"
                  maxLength={200}
                />
              </label>
            </div>

            {error && <p className="error">{error}</p>}
            {saved && <p className="success">Guardado ✓</p>}
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>

          <div className="card">
            <h2>Logo</h2>
            <div className="row" style={{ alignItems: "center" }}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="logo" style={{ width: 72, height: 72, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }} />
              ) : (
                <span className="muted">Sin logo todavía</span>
              )}
              <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : config.logoUrl ? "Reemplazar logo" : "Subir logo"}
              </button>
              <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="card">
            <h2>Banner de portada</h2>
            <div className="row" style={{ alignItems: "center" }}>
              {config.bannerUrl ? (
                <img src={config.bannerUrl} alt="banner" style={{ width: 160, height: 60, objectFit: "cover", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }} />
              ) : (
                <span className="muted">Sin banner todavía</span>
              )}
              <button type="button" className="btn" onClick={() => bannerFileRef.current?.click()} disabled={uploadingBanner}>
                {uploadingBanner ? "Subiendo…" : config.bannerUrl ? "Reemplazar banner" : "Subir banner"}
              </button>
              <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB</span>
              <input
                ref={bannerFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadBanner(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* T21/04 — texto opcional superpuesto al banner del home (mid-banner,
                CatalogHomePage.tsx). Vacío = banner solo, sin overlay (T20/03). */}
            <div className="row" style={{ marginTop: 12 }}>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Título sobre el banner del home (opcional)
                <input
                  value={form.midBannerTitle}
                  onChange={(e) => setForm({ ...form, midBannerTitle: e.target.value })}
                  placeholder="Vacío = el banner se muestra solo, sin texto"
                  maxLength={60}
                />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Subtítulo (opcional, solo si hay título)
                <input
                  value={form.midBannerSubtitle}
                  onChange={(e) => setForm({ ...form, midBannerSubtitle: e.target.value })}
                  placeholder="Bajada corta debajo del título"
                  maxLength={120}
                />
              </label>
            </div>
          </div>
        </div>

        <aside className="preview-pane">
          <h2>Vista previa</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Así se ve tu tienda — se actualiza mientras editás, sin guardar.
          </p>
          <div style={{ maxWidth: 480, margin: "0 auto", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div className="store" style={{ minHeight: "auto", "--accent": form.accentColor } as CSSProperties}>
              {config.bannerUrl && <img className="store-banner" src={config.bannerUrl} alt="" />}
              <div className="store-topbar">
                <span className="store-brand">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="" />
                  ) : (
                    <span className="store-brand-badge" aria-hidden="true">
                      {form.storeName.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                  <span>{form.storeName}</span>
                </span>
              </div>
              <div className="store-main" style={{ padding: "20px 16px" }}>
                <HomeSectionsRenderer sections={previewSections} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
