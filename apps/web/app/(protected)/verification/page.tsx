"use client";

import { useState } from "react";

const mockVerifications = [
  { id: "VR-101", session: "#1039", status: "PENDING", requestedBy: "system", time: "1 hr ago", method: "Callback to trusted number" },
  { id: "VR-100", session: "#1041", status: "CONFIRMED", requestedBy: "analyst@acme.com", time: "15 min ago", method: "Human verification" },
  { id: "VR-99", session: "#1030", status: "REJECTED", requestedBy: "system", time: "6 hr ago", method: "Callback to trusted number" },
];

const statusBadge: Record<string, string> = {
  PENDING: "badge-medium", CONFIRMED: "badge-success", REJECTED: "badge-danger", ESCALATED: "badge-high", EXPIRED: "badge-low",
};

export default function VerificationPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="page-header"><h1>Verification</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Secondary verification is independent of the suspicious voice. Methods include callback to a trusted number,
        organization-approved confirmation workflow, or human operator review.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {mockVerifications.map((v) => (
          <div key={v.id} className="card" style={{ borderColor: selected === v.id ? "var(--color-primary)" : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)" }}>{v.id}</span>
                  <span className={`badge ${statusBadge[v.status]}`}>{v.status}</span>
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  Session {v.session} · {v.method} · by {v.requestedBy} · {v.time}
                </p>
              </div>
              {v.status === "PENDING" && (
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setSelected(v.id)}>Confirm</button>
                  <button className="btn btn-danger btn-sm">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
