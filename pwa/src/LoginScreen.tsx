import { useState, type FormEvent } from "react";
import { colors, fonts, radius } from "./lib/theme";
import { supabase } from "./lib/supabaseClient";

// Email/contraseña reales contra Supabase Auth — mismo login que ya usa el
// panel admin de escritorio (frontend/), sin mapeo a ningún dominio falso
// (decisión revisada en overview.md tras integrar con el backend existente).
// T27, Fase 3: hero navy + logotipo en Alex Brush, calcado del tratamiento de
// marca que ya usa la tienda pública (StoreLayout.tsx), no un estilo nuevo
// inventado para la PWA.
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      // Mensaje genérico a propósito (mismo criterio que frontend/LoginPage.tsx):
      // no revelar si el email existe.
      setError("Email o contraseña incorrectos");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: colors.navy,
        fontFamily: fonts.body,
        padding: 24,
      }}
    >
      <p style={{ fontFamily: fonts.script, fontSize: 48, color: colors.white, margin: 0 }}>Eliathi</p>
      <p style={{ fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.7)", margin: "-8px 0 24px" }}>
        MODAS
      </p>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={inputStyle}
        />
        {error && (
          <p
            style={{
              background: colors.dangerBg,
              color: colors.danger,
              fontSize: 13,
              margin: 0,
              padding: "6px 10px",
              borderRadius: radius,
            }}
          >
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 12px",
  borderRadius: radius,
  border: "none",
  background: colors.white,
  color: colors.text,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "12px",
  borderRadius: radius,
  border: "none",
  background: colors.accent,
  color: colors.white,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
