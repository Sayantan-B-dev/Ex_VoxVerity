const roles = [
  { name: "Owner", perms: ["Full administration", "Manage billing", "Delete organization"] },
  { name: "Admin", perms: ["Manage users", "Configure settings", "View audit logs", "Manage integrations"] },
  { name: "Analyst", perms: ["View alerts", "Manage incidents", "View analytics", "Generate evidence"] },
  { name: "Operator", perms: ["Start live monitor", "View calls", "Acknowledge alerts", "Perform verification"] },
  { name: "Viewer", perms: ["Read-only access", "View dashboard"] },
];

export default function AdminRolesPage() {
  return (
    <div>
      <div className="page-header"><h1>Roles &amp; Permissions</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: 700 }}>
        {roles.map((r) => (
          <div key={r.name} className="card">
            <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>{r.name}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {r.perms.map((p) => <span key={p} className="badge badge-low">{p}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
