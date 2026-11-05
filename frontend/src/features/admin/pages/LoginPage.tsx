import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../AuthContext";
import "./login.css";

// T44: pantalla partida (formulario + panel de marca). Solo cambió la piel —
// la autenticación, el mensaje de error genérico y el redirect son los de siempre.
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/admin" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      // Mensaje genérico a propósito: no revelar si el email existe
      setError("Email o contraseña incorrectos");
      return;
    }
    navigate("/admin", { replace: true });
  }

  return (
    <main className="login">
      <section className="login-form-pane">
        <div className="login-form-wrap">
          <div className="login-brand-head">
            <p className="login-script">Eliathi</p>
            <p className="login-sub">MODAS</p>
            <h1>Bienvenida</h1>
            <p className="login-hint">Ingresá al panel de tu tienda</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className={`login-field${error ? " has-error" : ""}`}>
              <svg className="login-ico" {...svgProps} aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={`login-field${error ? " has-error" : ""}`}>
              <svg className="login-ico" {...svgProps} aria-hidden="true">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                aria-label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <svg {...svgProps} aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 6.1A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.4-1" />
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {error && (
              <p className="login-error" role="alert">
                <svg {...svgProps} strokeWidth={2} aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.5v.01" />
                </svg>
                {error}
              </p>
            )}

            <button type="submit" className="login-btn" disabled={submitting}>
              {submitting && <span className="login-spin" aria-hidden="true" />}
              {submitting ? "Ingresando..." : "Ingresar"}
            </button>

            <p className="login-help">¿Problemas para entrar? Pedile acceso a quien administra la tienda.</p>
          </form>
        </div>
      </section>

      <aside className="login-brand-pane" aria-hidden="true">
        <svg className="login-waves" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff" strokeWidth="1.2">
          <path d="M-20 120 C 120 60, 220 190, 360 130 S 560 60, 640 120" />
          <path d="M-20 200 C 120 140, 220 270, 360 210 S 560 140, 640 200" />
          <path d="M-20 560 C 120 500, 240 630, 380 570 S 560 520, 640 590" />
          <path d="M-20 640 C 120 580, 240 710, 380 650 S 560 600, 640 670" />
          <path d="M-20 720 C 120 660, 240 790, 380 730 S 560 680, 640 750" />
        </svg>
        <div className="login-glow" />
        <div className="login-glass">
          <p className="login-script">Eliathi</p>
          <p className="login-sub">MODAS</p>
          <p className="login-tag">Tu stock, tus ventas y tu tienda online en un solo lugar.</p>
          <div className="login-chips">
            <span className="login-chip">
              <svg {...svgProps}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
              Stock
            </span>
            <span className="login-chip">
              <svg {...svgProps}><path d="M6 6h15l-1.5 9h-12L5 3H2" /><circle cx="9" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /></svg>
              Pedidos
            </span>
            <span className="login-chip">
              <svg {...svgProps}><path d="M3 20h18M6 16V10M11 16V6M16 16v-4M21 16V8" /></svg>
              Finanzas
            </span>
            <span className="login-chip">
              <svg {...svgProps}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
              App de escaneo
            </span>
          </div>
        </div>
        <div className="login-foot">Panel de administración</div>
      </aside>
    </main>
  );
}
