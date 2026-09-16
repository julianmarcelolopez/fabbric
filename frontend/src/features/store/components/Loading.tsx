export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="store-loading">
      <span className="store-spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
