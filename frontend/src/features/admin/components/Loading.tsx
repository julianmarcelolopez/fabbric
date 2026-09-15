export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="loading-state">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
