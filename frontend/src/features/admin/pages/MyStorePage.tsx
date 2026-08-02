import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import { HomeSectionsRenderer, type HsrSection } from "../../catalog/HomeSectionsRenderer";
import { AnnouncementBar } from "../../store/StoreLayout";
import { BagIcon, FacebookIcon, InstagramIcon, SearchIcon, UserIcon, WhatsAppIcon } from "../../store/icons";
import type { CatalogConfig, HomeSectionItem, ProductListItem, Taxonomy } from "../types";

type ConfigForm = {
  storeName: string;
  slug: string;
  accentColor: string;
  businessDescription: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  address: string;
  businessHours: string;
  // T21/08 — [] = la tienda pública autogenera el texto desde zonas de envío.
  // 2+ = carrusel con flechas; 1 = mensaje fijo sin flechas.
  announcementTexts: string[];
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
  const [uploadingHero, setUploadingHero] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

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
        facebook: c.facebook ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        businessHours: c.businessHours ?? "",
        announcementTexts: c.announcementTexts,
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

  // T21/08 — hasta 3 mensajes (límite decidido por el usuario). Botones
  // subir/bajar en vez de drag & drop: con máximo 3 ítems no justifica el
  // estado de arrastre aparte que ya usa "Secciones visibles".
  function addAnnouncementText() {
    if (!form || form.announcementTexts.length >= 3) return;
    setForm({ ...form, announcementTexts: [...form.announcementTexts, ""] });
  }

  function updateAnnouncementText(index: number, value: string) {
    if (!form) return;
    const next = [...form.announcementTexts];
    next[index] = value;
    setForm({ ...form, announcementTexts: next });
  }

  function removeAnnouncementText(index: number) {
    if (!form) return;
    setForm({ ...form, announcementTexts: form.announcementTexts.filter((_, i) => i !== index) });
  }

  function moveAnnouncementText(index: number, direction: -1 | 1) {
    if (!form) return;
    const target = index + direction;
    if (target < 0 || target >= form.announcementTexts.length) return;
    const next = [...form.announcementTexts];
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...form, announcementTexts: next });
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
          facebook: form.facebook.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          businessHours: form.businessHours.trim() || null,
          announcementTexts: form.announcementTexts.map((t) => t.trim()).filter((t) => t.length > 0),
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

  async function uploadHeroImage(file: File) {
    setError(null);
    setUploadingHero(true);
    try {
      const updated = await apiUpload<CatalogConfig>("/admin/catalog-config/hero-image", file);
      setConfig(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploadingHero(false);
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
    refType: s.refType,
    visible: s.visible,
    refActive: s.refActive,
    products: productsFor(s),
  }));
  const previewCategories = previewSections.filter((s) => s.refType === "category" && s.refActive && s.refName);
  const previewWhatsappHref = form.whatsapp ? `https://wa.me/${form.whatsapp.replace(/\D/g, "")}` : null;
  const previewAnnouncementTexts = form.announcementTexts.map((t) => t.trim()).filter(Boolean);

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
          {/* T21/08 — orden de las cards: sigue el orden visual de la vista previa de
              arriba a abajo (header → hero → secciones → mid-banner → footer). Barra
              superior y política de cambios van al final porque no se ven en este
              preview (aparecen en otras pantallas de la tienda real). Un solo <form>
              para todo — las cards de imagen (Logo/Banner/Hero) tienen sus propios
              botones type="button" que suben al toque, no dependen de "Guardar cambios". */}
          <form onSubmit={save}>
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
                <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB — se sube al instante, sin esperar a "Guardar cambios"</span>
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
              <p className="muted" style={{ margin: "0 0 0" }}>
                Tu tienda vive en <code>/store/{form.slug || "…"}</code>
                {form.slug !== config.slug && " — ojo: cambiar la URL rompe los links ya compartidos"}
              </p>
            </div>

            <div className="card">
              <h2>Portada (hero)</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Es lo primero que se ve al entrar a la tienda, con el nombre de la tienda como título grande.
              </p>
              <div className="row" style={{ alignItems: "center" }}>
                {config.heroImageUrl ? (
                  <img src={config.heroImageUrl} alt="hero" style={{ width: 160, height: 60, objectFit: "cover", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }} />
                ) : (
                  <span className="muted">Sin imagen todavía — fondo de color sólido</span>
                )}
                <button type="button" className="btn" onClick={() => heroFileRef.current?.click()} disabled={uploadingHero}>
                  {uploadingHero ? "Subiendo…" : config.heroImageUrl ? "Reemplazar imagen" : "Subir imagen"}
                </button>
                <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB — se sube al instante</span>
                <input
                  ref={heroFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadHeroImage(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                Descripción del negocio (subtítulo de la portada — también aparece en el pie de página)
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.businessDescription}
                  onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                />
              </label>
            </div>

            <div className="card">
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
                <div className="row">
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
            </div>

            <div className="card">
              <h2>Banner intermedio</h2>
              <div className="row" style={{ alignItems: "center" }}>
                {config.bannerUrl ? (
                  <img src={config.bannerUrl} alt="banner" style={{ width: 160, height: 60, objectFit: "cover", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }} />
                ) : (
                  <span className="muted">Sin banner todavía</span>
                )}
                <button type="button" className="btn" onClick={() => bannerFileRef.current?.click()} disabled={uploadingBanner}>
                  {uploadingBanner ? "Subiendo…" : config.bannerUrl ? "Reemplazar banner" : "Subir banner"}
                </button>
                <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB — se sube al instante</span>
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

            <div className="card">
              <h2>Pie de página</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Redes sociales — el ícono solo aparece en el pie de la tienda si completás el campo.
              </p>
              <div className="row" style={{ marginBottom: 12 }}>
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
                  Facebook
                  <input
                    value={form.facebook}
                    onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                    placeholder="https://facebook.com/tu_tienda"
                    maxLength={100}
                  />
                </label>
                <label className="field">
                  WhatsApp
                  <input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="+54 9 11 2233-4455"
                    maxLength={20}
                  />
                </label>
              </div>
              <div className="row">
                <label className="field">
                  Mail de contacto
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contacto@tutienda.com"
                  />
                </label>
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
            </div>

            <div className="card">
              <h2>Barra superior</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Se ve arriba de todo en la vista previa, encima del header. Hasta 3 mensajes. Con 2 o más rotan
                solos cada 5 segundos, con flechas para navegar a mano.
                Sin ninguno, se arma solo con la zona de envío gratis más accesible.
              </p>

              {form.announcementTexts.map((text, i) => (
                <div className="row" key={i} style={{ marginBottom: 8, alignItems: "center" }}>
                  <input
                    value={text}
                    onChange={(e) => updateAnnouncementText(i, e.target.value)}
                    placeholder="Ej: Hasta 6 cuotas sin interés"
                    maxLength={120}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn small" disabled={i === 0} onClick={() => moveAnnouncementText(i, -1)} title="Mover arriba">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    disabled={i === form.announcementTexts.length - 1}
                    onClick={() => moveAnnouncementText(i, 1)}
                    title="Mover abajo"
                  >
                    ↓
                  </button>
                  <button type="button" className="btn small danger" onClick={() => removeAnnouncementText(i)}>
                    Quitar
                  </button>
                </div>
              ))}

              {form.announcementTexts.length < 3 ? (
                <button type="button" className="btn" onClick={addAnnouncementText}>
                  + Agregar mensaje
                </button>
              ) : (
                <p className="muted" style={{ margin: 0 }}>Máximo 3 mensajes.</p>
              )}
            </div>

            <div className="card">
              <h2>Política de cambios/devoluciones</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                No se ve en esta vista previa — en la tienda real aparece en la ficha de cada producto.
              </p>
              <label className="field">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.returnPolicy}
                  onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
                  placeholder="Ej: Cambios dentro de los 30 días con ticket de compra"
                />
              </label>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Vacío = la ficha de producto sigue mostrando "Consultanos por WhatsApp" en vez de una política propia.
              </p>
            </div>

            {error && <p className="error">{error}</p>}
            {saved && <p className="success">Guardado ✓</p>}
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </div>

        <aside className="preview-pane">
          <h2>Vista previa</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Así se ve el home de tu tienda — se actualiza mientras editás, sin guardar. (Logo,
            color, secciones y textos: en vivo. El resto de las páginas solo se ve entrando a la
            tienda real.)
          </p>
          <div style={{ maxWidth: 480, margin: "0 auto", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div className="store" style={{ minHeight: "auto", "--accent": form.accentColor } as CSSProperties}>
              {previewAnnouncementTexts.length > 0 && <AnnouncementBar messages={previewAnnouncementTexts} />}
              {/* T21: header simplificado del home real (T20/02) — sin las clases
                  full-bleed (100vw/calc) que usa la tienda de verdad, porque acá
                  viven dentro de un preview angosto, no del viewport completo. */}
              <header className="store-header" style={{ position: "static" }}>
                <div className="store-header-inner" style={{ padding: "0 12px", gap: 12, height: 52 }}>
                  <span className="store-logo-wrap">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="" style={{ height: 24 }} />
                    ) : (
                      <span className="store-logo-text" style={{ fontSize: 15 }}>{form.storeName}</span>
                    )}
                  </span>
                  <nav className="store-nav" style={{ gap: 10, overflow: "hidden" }}>
                    {previewCategories.slice(0, 3).map((c) => (
                      <span key={c.id} style={{ fontSize: 10 }}>{c.refName}</span>
                    ))}
                  </nav>
                  <div className="store-header-actions" style={{ gap: 8 }}>
                    <SearchIcon size={13} />
                    <UserIcon size={13} />
                    <BagIcon size={13} />
                  </div>
                </div>
              </header>

              {/* Hero (T20/03, opción A) — tamaños fijos, no clamp(vw), por el
                  mismo motivo del header. */}
              <section
                className={config.heroImageUrl ? "home-hero has-image" : "home-hero"}
                style={{
                  position: "relative",
                  width: "100%",
                  margin: 0,
                  minHeight: 160,
                  backgroundImage: config.heroImageUrl ? `url(${config.heroImageUrl})` : undefined,
                }}
              >
                <div className="home-hero-content" style={{ padding: "24px 16px" }}>
                  <h1 className="home-hero-title" style={{ fontSize: 24 }}>{form.storeName || "Tu tienda"}</h1>
                  {form.businessDescription && (
                    <p className="home-hero-sub" style={{ fontSize: 12 }}>{form.businessDescription}</p>
                  )}
                  <span className="home-hero-cta" style={{ fontSize: 10 }}>
                    Ver catálogo <span className="home-hero-cta-arrow">→</span>
                  </span>
                </div>
              </section>

              <div className="store-main" style={{ padding: "16px 12px" }}>
                {previewCategories.length > 0 && (
                  <div className="home-section" style={{ padding: "0 0 20px" }}>
                    <div className="hsr-section-head">
                      <h2 className="hsr-title" style={{ fontSize: 13 }}>Explorá por categoría</h2>
                    </div>
                    <div className="home-categories-grid" style={{ gap: 8 }}>
                      {previewCategories.map((c) => (
                        <div key={c.id} className="home-cat-card">
                          <div className="home-cat-card-ph" />
                          <div className="home-cat-overlay" style={{ padding: 8 }}>
                            <div className="home-cat-name" style={{ fontSize: 12 }}>{c.refName}</div>
                            <div className="home-cat-count" style={{ fontSize: 9 }}>{c.products.length} prod.</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <HomeSectionsRenderer sections={previewSections} />
              </div>

              {/* Mid-banner (T20/03 + T21/04) — mismos 3 casos que el home real. */}
              {(form.midBannerTitle || config.bannerUrl) && (
                <div
                  className={form.midBannerTitle ? "home-mid-banner has-text" : "home-mid-banner"}
                  style={{
                    width: "100%",
                    margin: 0,
                    minHeight: 100,
                    backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : undefined,
                  }}
                >
                  {form.midBannerTitle && (
                    <div className="home-mid-banner-inner" style={{ padding: "16px 20px" }}>
                      <h2 className="home-mid-banner-title" style={{ fontSize: 18 }}>{form.midBannerTitle}</h2>
                      {form.midBannerSubtitle && (
                        <p className="home-mid-banner-sub" style={{ fontSize: 10 }}>{form.midBannerSubtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer (T21/08) — mismas clases/campos que StoreLayout.tsx, apilado en
                  1 columna en vez de la grilla de 3 (footer-top) porque el preview vive
                  en una caja angosta (480px), no en el viewport completo. */}
              <footer className="store-footer-v2" style={{ padding: "24px 16px 16px", marginTop: 0 }}>
                <div className="footer-inner">
                  <div className="footer-top" style={{ gridTemplateColumns: "1fr", gap: 20, paddingBottom: 20, marginBottom: 16 }}>
                    <div className="footer-brand">
                      {config.logoUrl ? (
                        <img src={config.logoUrl} alt={form.storeName} className="footer-logo-img" style={{ height: 28 }} />
                      ) : (
                        <span className="footer-logo-text" style={{ fontSize: 16 }}>{form.storeName}</span>
                      )}
                      {form.businessDescription && <p style={{ fontSize: 11 }}>{form.businessDescription}</p>}
                      <div className="footer-social">
                        {form.instagram && (
                          <span className="social-btn" style={{ width: 26, height: 26 }}>
                            <InstagramIcon />
                          </span>
                        )}
                        {form.facebook && (
                          <span className="social-btn" style={{ width: 26, height: 26 }}>
                            <FacebookIcon />
                          </span>
                        )}
                        {previewWhatsappHref && (
                          <span className="social-btn" style={{ width: 26, height: 26 }}>
                            <WhatsAppIcon />
                          </span>
                        )}
                      </div>
                    </div>

                    {previewCategories.length > 0 && (
                      <div className="footer-col">
                        <h4 style={{ fontSize: 10, marginBottom: 10 }}>Tienda</h4>
                        <ul style={{ gap: 6 }}>
                          {previewCategories.slice(0, 5).map((c) => (
                            <li key={c.id} style={{ fontSize: 11 }}>{c.refName}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(form.address || form.businessHours || previewWhatsappHref || form.email || form.facebook) && (
                      <div className="footer-col">
                        <h4 style={{ fontSize: 10, marginBottom: 10 }}>Contacto</h4>
                        <ul style={{ gap: 6 }}>
                          {previewWhatsappHref && <li style={{ fontSize: 11 }}>WhatsApp</li>}
                          {form.instagram && <li style={{ fontSize: 11 }}>Instagram</li>}
                          {form.facebook && <li style={{ fontSize: 11 }}>Facebook</li>}
                          {form.email && <li style={{ fontSize: 11 }}>{form.email}</li>}
                          {form.address && <li style={{ fontSize: 11 }}>{form.address}</li>}
                          {form.businessHours && <li style={{ fontSize: 11 }}>{form.businessHours}</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="footer-bottom" style={{ fontSize: 10 }}>
                    <span>© {new Date().getFullYear()} {form.storeName}. Todos los derechos reservados.</span>
                    <div className="footer-payments">
                      <span className="payment-badge" style={{ fontSize: 9 }}>Mercado Pago</span>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
