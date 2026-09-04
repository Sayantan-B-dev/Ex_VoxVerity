"use client";

import { useState } from "react";

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState({ email: true, browser: true, criticalOnly: false });
  return (
    <div>
      <div className="page-header"><h1>Notification Settings</h1></div>
      <div className="card" style={{ maxWidth: 540 }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Alert Delivery</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {([
            ["email", "Email notifications", "Receive alert summaries via email"],
            ["browser", "Browser notifications", "Get notified in real-time while the app is open"],
            ["criticalOnly", "Critical alerts only", "Only notify for CRITICAL severity alerts"],
          ] as const).map(([key, label, desc]) => (
            <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", cursor: "pointer" }}>
              <input type="checkbox" checked={prefs[key]} onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))} style={{ marginTop: 4 }} />
              <div>
                <p style={{ fontWeight: "var(--weight-medium)" }}>{label}</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{desc}</p>
              </div>
            </label>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: "var(--space-6)" }}>Save Preferences</button>
      </div>
    </div>
  );
}
