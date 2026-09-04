import Link from "next/link";

const settingsLinks = [
  { href: "/settings/profile", label: "Profile", desc: "Name, email, avatar" },
  { href: "/settings/security", label: "Security", desc: "Password, sessions, 2FA" },
  { href: "/settings/notifications", label: "Notifications", desc: "Alert and notification preferences" },
  { href: "/settings/privacy", label: "Privacy", desc: "Data retention and capture settings" },
  { href: "/settings/risk", label: "Risk Configuration", desc: "Thresholds and scoring weights" },
];

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header"><h1>Settings</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 640 }}>
        {settingsLinks.map((s) => (
          <Link key={s.href} href={s.href} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none" }}>
            <div>
              <p style={{ fontWeight: "var(--weight-semibold)" }}>{s.label}</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{s.desc}</p>
            </div>
            <span style={{ color: "var(--color-text-muted)" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
