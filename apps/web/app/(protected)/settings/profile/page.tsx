"use client";

import { useState } from "react";

export default function ProfileSettingsPage() {
  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("demo@acme.com");
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <div className="page-header"><h1>Profile Settings</h1></div>
      <form className="card" style={{ maxWidth: 540, display: "flex", flexDirection: "column", gap: "var(--space-4)" }} onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
        <div>
          <label className="input-label">Full Name</label>
          <input className="input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label className="input-label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label className="input-label">Role</label>
          <input className="input" value="Operator" disabled />
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>Role is managed by an administrator.</p>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Save Changes</button>
        {saved && <div className="alert alert-success">Profile updated.</div>}
      </form>
    </div>
  );
}
