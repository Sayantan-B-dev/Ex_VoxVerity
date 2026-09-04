export default function AdminSystemPage() {
  return (
    <div>
      <div className="page-header"><h1>System Settings</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Health</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[["Web App", "Healthy", "badge-success"], ["AI Service", "Offline", "badge-danger"], ["Database", "Healthy", "badge-success"], ["Blockchain", "Not configured", "badge-low"]].map(([name, status, badge]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)" }}>{name}</span>
                <span className={`badge ${badge}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Versions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[["Next.js", "16.3.4"], ["Node.js", "24.x LTS"], ["Python", "3.13.x"], ["AASIST-L", "v1.0"]].map(([name, ver]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "var(--text-sm)" }}>{name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{ver}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
