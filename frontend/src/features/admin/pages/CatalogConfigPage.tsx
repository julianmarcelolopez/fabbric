import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, apiJson, apiUpload } from "../../../lib/api";
import type { CatalogConfig } from "../types";

type Form = {
  storeName: string;
  slug: string;
  accentColor: string;
  businessDescription: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  businessHours: string;
  active: boolean;
};

export function CatalogConfigPage() {
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiJson<CatalogConfig>("/admin/catalog-config")
      .then((c) => {
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
          active: c.active,
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await apiJson<CatalogConfig>("/admin/catalog-config", {
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
          active: form.active,
        }),
      });
      setConfig(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

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

  if (!config || !form) {
    return (
      <>
        <h1>Tienda</h1>
        {error ? <p className="error">{error}</p> : <p className="muted">Cargando…</p>}
      </>
    );
  }

  return (
    <>
      <h1>Configuración de la tienda</h1>

      <form onSubmit={save} className="card">
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
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
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
          <button className="btn" onClick={() => bannerFileRef.current?.click()} disabled={uploadingBanner}>
            {uploadingBanner ? "Subiendo…" : config.bannerUrl ? "Reemplazar banner" : "Subir banner"}
          </button>
          <span className="muted">JPEG/PNG/WebP/SVG, máx 2 MB — se muestra arriba del encabezado de la tienda</span>
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
      </div>
    </>
  );
}
