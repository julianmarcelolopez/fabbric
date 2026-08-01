import type { CSSProperties } from "react";

// T20/06 — aproximación visual — el swatch es solo una ayuda de lectura rápida,
// el nombre de color (dato real) siempre se muestra al lado y es la fuente de
// verdad. Nombres no reconocidos caen a un swatch neutro con borde punteado
// en vez de adivinar mal un color.
// T21/05 — extraído de ProductDetailView.tsx para reusarlo también en el
// filtro de color de CategoryPage.tsx, sin duplicar el diccionario.
const COLOR_HEX: Record<string, string> = {
  rojo: "#E53E3E",
  negro: "#2C2C2C",
  blanco: "#F7F7F7",
  azul: "#2B4C7E",
  "azul marino": "#1E2A4A",
  celeste: "#7FB3D5",
  verde: "#4A7C59",
  oliva: "#6B7A4A",
  amarillo: "#E8C547",
  gris: "#8A8278",
  beige: "#D8CBB8",
  crema: "#EFE6D8",
  marron: "#6F4E37",
  marrón: "#6F4E37",
  camel: "#C19A6B",
  rosa: "#E8A0BF",
  violeta: "#7D5BA6",
  morado: "#7D5BA6",
  naranja: "#E07A3E",
  coral: "#F07058",
  bordo: "#7B2D3E",
  bordó: "#7B2D3E",
  dorado: "#C9A227",
  plateado: "#B8B8B8",
  turquesa: "#3FA6A6",
  nude: "#D9B99B",
};

export function colorSwatchStyle(color: string): CSSProperties {
  const hex = COLOR_HEX[color.trim().toLowerCase()];
  return hex ? { background: hex } : { background: "var(--gray)", border: "1px dashed var(--muted)" };
}
