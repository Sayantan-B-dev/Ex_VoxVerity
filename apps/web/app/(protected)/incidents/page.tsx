"use client";

import { useState } from "react";
import Link from "next/link";

const mockIncidents = [
  { id: "INC-1039", status: "OPEN", session: "#1039", risk: 85, severity: "CRITICAL", owner: "analyst@acme.com", alerts: 1, time: "1 hr ago" },
  { id: "INC-1041", status: "INVESTIGATING", session: "#1041", risk: 62, severity: "HIGH", owner: "analyst@acme.com", alerts: 1, time: "2 hr ago" },
  { id: "INC-1030", status: "CONTAINED", session: "#1030", risk: 71, severity: "HIGH", owner: "admin@acme.com", alerts: 2, time: "6 hr ago" },
  { id: "INC-1025", status: "RESOLVED", session: "#1025", risk: 45, severity: "MEDIUM", owner: "analyst@acme.com", alerts: 1, time: "1 day ago" },
  { id: "INC-1020", status: "FALSE_POSITIVE", session: "#1020", risk: 58, severity: "HIGH", owner: "admin@acme.com", alerts: 3, time: "2 days ago" },
];

const statusBadge: Record<string, string> = {
  OPEN: "badge-critical", INVESTIGATING: "badge-high", CONTAINED: "badge-medium",
  RESOLVED: "badge-success", FALSE_POSITIVE: "badge-low",
};

export default function IncidentsPage() {
  const [filter, setFilter] = useState("all");

  const filtered = mockIncidents.filter((i) => {
    if (filter === "active") return ["OPEN", "INVESTIGATING"].includes(i.status);
    if (filter !== "all" && i.status !== filter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Incidents</h1>
        <button className="btn btn-primary">+ New Incident</button>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {["all", "active", "OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "FALSE_POSITIVE"].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "active" ? "Active" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Session</th>
              <th>Risk</th>
              <th>Owner</th>
              <th>Alerts</th>
              <th>Opened</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc) => (
              <tr key={inc.id}>
                <td style={{ fontWeight: "var(--weight-medium)" }}>{inc.id}</td>
                <td><span className={`badge ${statusBadge[inc.status]}`}>{inc.status.replace("_", " ")}</span></td>
                <td>{inc.session}</td>
                <td><span className={`risk-score risk-score-${inc.severity.toLowerCase()}`} style={{ fontSize: "var(--text-sm)" }}>{inc.risk}/100</span></td>
                <td style={{ fontSize: "var(--text-sm)" }}>{inc.owner}</td>
                <td>{inc.alerts}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{inc.time}</td>
                <td><Link href={`/incidents/${inc.id.replace("INC-", "")}`} className="btn btn-ghost btn-sm">View</Link></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
                  No incidents match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
