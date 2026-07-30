import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { ApiError, apiJson } from "../../../lib/api";
import { supabase } from "../../../lib/supabaseClient";
import type { CatalogConfig, Me } from "../types";

type Tab = "usuario" | "integraciones";

function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <form onSubmit={onSubmit} className="row" style={{ alignItems: "flex-end", marginTop: 8 }}>
      <label className="field">
        Contraseña nueva
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <label className="field">
        Confirmar contraseña
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <button className="btn primary" type="submit" disabled={submitting}>
        {submitting ? "Guardando…" : "Cambiar contraseña"}
      </button>
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      {success && <p className="success" style={{ margin: 0 }}>Contraseña actualizada ✓</p>}
    </form>
  );
}

function IntegracionesTab() {
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiJson<CatalogConfig>("/admin/catalog-config")
      .then(setConfig)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  async function connect(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const updated = await apiJson<CatalogConfig>("/admin/catalog-config/mp-integration", {
        method: "PATCH",
        body: JSON.stringify({ mpAccessToken: accessToken, mpWebhookSecret: webhookSecret }),
      });
      setConfig(updated);
      setAccessToken("");
      setWebhookSecret("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function disconnect() {
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const updated = await apiJson<CatalogConfig>("/admin/catalog-config/mp-integration", {
        method: "PATCH",
        body: JSON.stringify({ mpAccessToken: null, mpWebhookSecret: null }),
      });
      setConfig(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function copyWebhookUrl(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!config) {
    return (
      <div className="card">
        <h2>Integraciones</h2>
        {loadError ? <p className="error">{loadError}</p> : <p className="muted">Cargando…</p>}
      </div>
    );
  }

  const webhookUrl = `${import.meta.env.VITE_API_URL}/webhooks/mercadopago/${config.slug}`;
  const connected = config.mpAccessToken !== null;

  return (
    <div className="card">
      <h2>Mercado Pago</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Por defecto los cobros de tu tienda se procesan con la cuenta de Mercado Pago de fabbric.
        Si preferís cobrar directo a tu propia cuenta, conectá acá tus credenciales.
      </p>

      <label className="field" style={{ maxWidth: 480, marginBottom: 12 }}>
        URL de notificaciones (pegala en tu aplicación de Mercado Pago, sección Webhooks)
        <div className="row" style={{ alignItems: "center" }}>
          <input value={webhookUrl} readOnly style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={() => copyWebhookUrl(webhookUrl)}>
            {copied ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
      </label>

      {connected ? (
        <>
          <p>
            Estado: <strong>Conectado</strong> — token <code>{config.mpAccessToken}</code>
          </p>
          <button className="btn" onClick={disconnect} disabled={submitting}>
            {submitting ? "Desconectando…" : "Desconectar"}
          </button>
        </>
      ) : (
        <form onSubmit={connect} className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 240 }}>
            Access Token
            <input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-..."
              required
            />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 240 }}>
            Webhook Secret
            <input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Clave secreta de firma"
              required
            />
          </label>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Conectando…" : "Conectar"}
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Guardado ✓</p>}
    </div>
  );
}

export function SettingsPage() {
  const me = useOutletContext<Me>();
  const [tab, setTab] = useState<Tab>("usuario");

  return (
    <>
      <h1>Configuración</h1>

      <div className="row" style={{ marginBottom: 16 }}>
        <button
          className={`btn${tab === "usuario" ? " primary" : ""}`}
          onClick={() => setTab("usuario")}
        >
          Usuario
        </button>
        <button
          className={`btn${tab === "integraciones" ? " primary" : ""}`}
          onClick={() => setTab("integraciones")}
        >
          Integraciones
        </button>
      </div>

      {tab === "usuario" && (
        <>
          <div className="card">
            <h2>Tu cuenta</h2>
            <p>
              Email: <strong>{me.email}</strong>
            </p>
            <p>
              Rol: <strong>{me.role}</strong>
            </p>
            <p>
              Organización: <strong>{me.orgName ?? "—"}</strong>
            </p>
          </div>

          <div className="card">
            <h2>Cambiar contraseña</h2>
            <ChangePasswordForm />
          </div>
        </>
      )}

      {tab === "integraciones" && <IntegracionesTab />}
    </>
  );
}
