import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Me } from "../types";

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

      {tab === "integraciones" && (
        <div className="card">
          <h2>Integraciones</h2>
          <p className="muted">Próximamente.</p>
        </div>
      )}
    </>
  );
}
