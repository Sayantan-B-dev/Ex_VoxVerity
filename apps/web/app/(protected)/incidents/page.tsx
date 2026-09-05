"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Incident {
  incident_id: string;
  session_id: string;
  alert_id: string | null;
  status: string;
  created_at: number;
  updated_at: number;
  owner: string | null;
  timeline: Array<{ event: string; timestamp: number; details: string }>;
  risk_summary: { score: number; severity: string } | null;
  analysis_count: number;
  evidence_ids: string[];
  notes: Array<{ text: string; timestamp: number; author: string }>;
  false_positive: boolean;
}

const statusBadge: Record<string, string> = {
  OPEN: "badge-critical", INVESTIGATING: "badge-high", CONTAINED: "badge-medium",
  RESOLVED: "badge-success", FALSE_POSITIVE: "badge-low",
};

export default function IncidentsPage() {
  const [filter, setFilter] = useState("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const res = await fetch(`${aiUrl}/v1/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch {
      // Use mock data as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Mock data for demo
  const mockIncidents: Incident[] = [
    { incident_id: "INC-DEMO-001", session_id: "session-001", alert_id: "ALT-001", status: "OPEN", created_at: Date.now() / 1000 - 3600, updated_at: Date.now() / 1000 - 3600, owner: null, timeline: [{ event: "incident_created", timestamp: Date.now() / 1000 - 3600, details: "Created from high risk alert" }], risk_summary: { score: 85, severity: "CRITICAL" }, analysis_count: 5, evidence_ids: ["EVD-001"], notes: [], false_positive: false },
    { incident_id: "INC-DEMO-002", session_id: "session-002", alert_id: "ALT-002", status: "INVESTIGATING", created_at: Date.now() / 1000 - 7200, updated_at: Date.now() / 1000 - 1800, owner: "analyst@acme.com", timeline: [{ event: "incident_created", timestamp: Date.now() / 1000 - 7200, details: "Created from high risk alert" }, { event: "owner_assigned", timestamp: Date.now() / 1000 - 1800, details: "Assigned to analyst" }], risk_summary: { score: 72, severity: "HIGH" }, analysis_count: 3, evidence_ids: [], notes: [{ text: "Investigating synthetic voice indicators", timestamp: Date.now() / 1000 - 1800, author: "analyst@acme.com" }], false_positive: false },
  ];

  const allIncidents = [...incidents, ...mockIncidents];

  const filtered = allIncidents.filter((i) => {
    if (filter === "active") return ["OPEN", "INVESTIGATING"].includes(i.status);
    if (filter !== "all" && i.status !== filter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Incidents</h1>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {["all", "active", "OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "FALSE_POSITIVE"].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "active" ? "Active" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
          Loading incidents...
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Session</th>
              <th>Risk</th>
              <th>Owner</th>
              <th>Evidence</th>
              <th>Opened</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc) => (
              <tr key={inc.incident_id}>
                <td style={{ fontWeight: "var(--weight-medium)" }}>{inc.incident_id}</td>
                <td><span className={`badge ${statusBadge[inc.status] || "badge-medium"}`}>{inc.status.replace("_", " ")}</span></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{inc.session_id.slice(0, 12)}...</td>
                <td>
                  {inc.risk_summary ? (
                    <span className={`risk-score risk-score-${inc.risk_summary.severity.toLowerCase()}`} style={{ fontSize: "var(--text-sm)" }}>
                      {inc.risk_summary.score}/100
                    </span>
                  ) : "--"}
                </td>
                <td style={{ fontSize: "var(--text-sm)" }}>{inc.owner || "Unassigned"}</td>
                <td>{inc.evidence_ids.length}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
                  {new Date(inc.created_at * 1000).toLocaleTimeString()}
                </td>
                <td><Link href={`/incidents/${inc.incident_id}`} className="btn btn-ghost btn-sm">View</Link></td>
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
