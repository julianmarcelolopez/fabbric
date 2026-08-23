import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// DIAGNÓSTICO TEMPORAL (T23, debugging de escaneo en iOS): el visor de
// consola remota que se está usando no imprime bien objetos ni los format
// strings ("%s") que usa React internamente para sus warnings/errores — hay
// que loguear todo como texto plano para poder verlo.
window.addEventListener("error", (e) => {
  console.log("[global-error] " + e.message + " @ " + e.filename + ":" + e.lineno);
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  const text =
    reason instanceof Error ? reason.message + "\n" + (reason.stack ?? "") : String(reason);
  console.log("[unhandled-rejection] " + text);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
