import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabaseClient";

// Email/contraseña reales contra Supabase Auth — mismo login que ya usa el
// panel admin de escritorio (frontend/), sin mapeo a ningún dominio falso
// (decisión revisada en overview.md tras integrar con el backend existente).
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
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#F7F3EC",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}
      >
        <p style={{ textAlign: "center", fontWeight: 500, color: "#201f1c", marginBottom: 8 }}>
          Eliathi Modas
        </p>
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
        {error && <p style={{ color: "#a32d2d", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #cac7ba",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: 8,
  border: "none",
  background: "#FF6B4A",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
};
