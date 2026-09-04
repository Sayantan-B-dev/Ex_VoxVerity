"use client";

import { useState } from "react";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <div>
      <div className="page-header"><h1>Security Settings</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 540 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Change Password</h3>
          <form style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }} onSubmit={(e) => { e.preventDefault(); setLoading(true); setTimeout(() => { setLoading(false); setMsg("Password updated."); }, 800); }}>
            <div><label className="input-label">Current Password</label><input type="password" className="input" /></div>
            <div><label className="input-label">New Password</label><input type="password" className="input" /></div>
            <div><label className="input-label">Confirm New Password</label><input type="password" className="input" /></div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={loading}>{loading ? "Updating…" : "Update Password"}</button>
            {msg && <div className="alert alert-success">{msg}</div>}
          </form>
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Active Sessions</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>1 active session (this device).</p>
          <button className="btn btn-danger btn-sm" style={{ marginTop: "var(--space-3)" }}>Sign out all other sessions</button>
        </div>
      </div>
    </div>
  );
}
