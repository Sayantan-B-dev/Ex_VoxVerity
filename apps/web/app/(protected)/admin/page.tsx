import Link from "next/link";

const adminLinks = [
  { href: "/admin/users", label: "Users", desc: "Manage users and roles" },
  { href: "/admin/organizations", label: "Organizations", desc: "Organization settings" },
  { href: "/admin/roles", label: "Roles & Permissions", desc: "Configure RBAC" },
  { href: "/admin/models", label: "AI Models", desc: "Model deployment and governance" },
  { href: "/admin/system", label: "System", desc: "System health and configuration" },
];

export default function AdminPage() {
  return (
    <div>
      <div className="page-header"><h1>Administration</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 640 }}>
        {adminLinks.map((a) => (
          <Link key={a.href} href={a.href} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none" }}>
            <div>
              <p style={{ fontWeight: "var(--weight-semibold)" }}>{a.label}</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{a.desc}</p>
            </div>
            <span style={{ color: "var(--color-text-muted)" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
