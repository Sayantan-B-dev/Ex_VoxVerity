"use client";

import { useState } from "react";
import Link from "next/link";

const mockAlerts = [
  { id: "ALT-201", severity: "CRITICAL", session: "#1039", message: "Risk threshold 85/100 exceeded", time: "1 hr ago", acknowledged: false, incident: "INC-1039" },
  { id: "ALT-200", severity: "HIGH", session: "#1041", message: "Synthetic voice signal detected", time: "18 min ago", acknowledged: false, incident: null },
  { id: "ALT-199", severity: "HIGH", session: "#1030", message: "Speaker similarity mismatch", time: "6 hr ago", acknowledged: true, incident: "INC-1030" },
  { id: "ALT-198", severity: "MEDIUM", session: "#1035", message: "Acoustic anomaly score elevated", time: "3 hr ago", acknowledged: true, incident: null },
  { id: "ALT-197", severity: "LOW", session: "#1032", message: "Unusual silence pattern detected", time: "5 hr ago", acknowledged: true, incident: null },
];

const severityBadge: Record<string, string> = {
  LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high", CRITICAL: "badge-critical",
};

export default function AlertsPage() {
  const [filter, setFilter] = useState("all");

  const filtered = mockAlerts.filter((a) => {
    if (filter === "unacknowledged") return !a.acknowledged;
    if (filter !== "all" && a.severity !== filter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Alerts</h1>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {["all", "unacknowledged", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "unacknowledged" ? "Unacknowledged" : f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {filtered.map((alert) => (
          <div key={alert.id} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", opacity: alert.acknowledged ? 0.6 : 1 }}>
            <span className={`badge ${severityBadge[alert.severity]}`}>{alert.severity}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "var(--weight-medium)" }}>{alert.message}</p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                {alert.id} · Session {alert.session} · {alert.time}
              </p>
            </div>
            {alert.acknowledged && <span className="badge badge-success">ACK</span>}
            {alert.incident && (
              <Link href={`/incidents/${alert.incident.replace("INC-", "")}`} className="btn btn-ghost btn-sm">
                {alert.incident}
              </Link>
            )}
            <Link href={`/alerts/${alert.id}`} className="btn btn-secondary btn-sm">View</Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
            No alerts match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
