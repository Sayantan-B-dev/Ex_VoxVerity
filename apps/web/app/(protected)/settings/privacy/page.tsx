"use client";

import { useState } from "react";

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState({ retainAudio: false, retentionDays: 30, shareAnalytics: false });
  return (
    <div>
      <div className="page-header"><h1>Privacy Settings</h1></div>
      <div className="card" style={{ maxWidth: 540 }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Data &amp; Capture</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", cursor: "pointer" }}>
            <input type="checkbox" checked={settings.retainAudio} onChange={(e) => setSettings((p) => ({ ...p, retainAudio: e.target.checked }))} style={{ marginTop: 4 }} />
            <div>
              <p style={{ fontWeight: "var(--weight-medium)" }}>Retain audio for debugging</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Keep temporary audio files for lab analysis. Raw audio is processed in memory by default.</p>
            </div>
          </label>
          <div>
            <label className="input-label">Data retention (days)</label>
            <input className="input" type="number" value={settings.retentionDays} onChange={(e) => setSettings((p) => ({ ...p, retentionDays: +e.target.value }))} style={{ maxWidth: 120 }} />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", cursor: "pointer" }}>
            <input type="checkbox" checked={settings.shareAnalytics} onChange={(e) => setSettings((p) => ({ ...p, shareAnalytics: e.target.checked }))} style={{ marginTop: 4 }} />
            <div>
              <p style={{ fontWeight: "var(--weight-medium)" }}>Share anonymous analytics</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Help improve VoxVerity with anonymous usage data.</p>
            </div>
          </label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: "var(--space-6)" }}>Save Privacy Settings</button>
      </div>
    </div>
  );
}
