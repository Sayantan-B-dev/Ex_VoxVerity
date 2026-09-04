export default function AdminOrganizationsPage() {
  return (
    <div>
      <div className="page-header"><h1>Organizations</h1></div>
      <div className="card" style={{ maxWidth: 540 }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Current Organization</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {[["Name", "Acme Corp"], ["Plan", "Free"], ["Members", "4"], ["Created", "Jan 2026"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{k}</span>
              <span style={{ fontSize: "var(--text-sm)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
