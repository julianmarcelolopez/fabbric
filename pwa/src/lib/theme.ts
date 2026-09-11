// T27, Fase 3 — tokens de color/tipografía/radio, calcados de la identidad
// real de la tienda (frontend/src/features/catalog/catalog.css) vía
// docs/T27_UX-PWA/mockups/mockups_v5.html. Duplicados acá a propósito, no
// compartidos con frontend/ — ver Tarea 1 de esta fase
// (docs/T27_UX-PWA/tareas/03-identidad-visual-real/01-tokens-y-fuentes) para
// la decisión: alcanza con duplicar para un solo tenant usando la PWA: mover
// a un paquete compartido (ej. packages/shared) queda para cuando haya más.
export const colors = {
  navy: "#1E2A4A",
  accent: "#FF6B4A",
  accentSoft: "#FDE1D8",
  off: "#F8F7F5",
  white: "#FFFFFF",
  gray: "#E8E4DF",
  text: "#2C2C2C",
  muted: "#8A8278",
  green: "#16A34A",
  greenBg: "#F0FDF4",
  warning: "#B8792F",
  warningBg: "#F6E9D3",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
} as const;

// Confirmado por el mockup v5: no hace falta migrar a botones tipo "pill"
// (999px) como se pensaba con v3 — 8px alcanza para toda la app.
export const radius = 8;

export const fonts = {
  body: '"DM Sans", system-ui, sans-serif',
  // Títulos, nombres de producto, montos.
  display: '"Cormorant Garamond", Georgia, serif',
  // Solo el logotipo "Eliathi" — nunca precios, tabs ni texto largo.
  script: '"Alex Brush", cursive',
} as const;
