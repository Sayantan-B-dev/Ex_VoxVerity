"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Alert {
  alert_id: string;
  session_id: string;
  score: number;
  severity: string;
  sequence: number;
  created_at: number;
  status: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  rule_triggers: string[];
  recommendation: string;
  explanation: string;
  incident_id: string | null;
}

const severityBadge: Record<string, string> = {
  LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high", CRITICAL: "badge-critical",
};

export default function AlertsPage() {
  const [filter, setFilter] = useState("all");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const res = await fetch(`${aiUrl}/v1/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  async function handleAcknowledge(alertId: string) {
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      await fetch(`${aiUrl}/v1/alerts/${alertId}/acknowledge`, { method: "POST" });
      fetchAlerts(); // Refresh
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to acknowledge");
    }
  }

  // Combine real alerts with mock data for demo
  const mockAlerts: Alert[] = [
    { alert_id: "ALT-DEMO-001", session_id: "demo-session", score: 85, severity: "CRITICAL", sequence: 5, created_at: Date.now() / 1000 - 3600, status: "ACTIVE", acknowledged: false, acknowledged_by: null, rule_triggers: ["SPOOF_SIGNAL_LOW"], recommendation: "Immediate alert. Escalate to security team.", explanation: "Risk score 85/100 (CRITICAL).", incident_id: null },
    { alert_id: "ALT-DEMO-002", session_id: "demo-session", score: 72, severity: "HIGH", sequence: 3, created_at: Date.now() / 1000 - 1800, status: "ACTIVE", acknowledged: false, acknowledged_by: null, rule_triggers: ["ACOUSTIC_ANOMALY_HIGH"], recommendation: "Alert operator. Initiate verification workflow.", explanation: "Risk score 72/100 (HIGH).", incident_id: null },
  ];

  const allAlerts = [...alerts, ...mockAlerts];

  const filtered = allAlerts.filter((a) => {
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

      {error && <div className="alert alert-danger" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
          Loading alerts...
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {filtered.map((alert) => (
          <div key={alert.alert_id} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", opacity: alert.acknowledged ? 0.6 : 1 }}>
            <span className={`badge ${severityBadge[alert.severity]}`}>{alert.severity}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "var(--weight-medium)" }}>
                Risk {alert.score}/100 — {alert.recommendation}
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                {alert.alert_id} · Session {alert.session_id.slice(0, 8)} · Chunk #{alert.sequence} · {new Date(alert.created_at * 1000).toLocaleTimeString()}
              </p>
              {alert.rule_triggers.length > 0 && (
                <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
                  {alert.rule_triggers.map((trigger) => (
                    <span key={trigger} style={{
                      padding: "1px var(--space-2)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "10px",
                      background: "var(--color-warning-bg)",
                      color: "var(--color-warning)",
                    }}>
                      {trigger.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {alert.acknowledged && <span className="badge badge-success">ACK</span>}
            {!alert.acknowledged && (
              <button className="btn btn-primary btn-sm" onClick={() => handleAcknowledge(alert.alert_id)}>
                Acknowledge
              </button>
            )}
            <Link href={`/alerts/${alert.alert_id}`} className="btn btn-secondary btn-sm">View</Link>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
            No alerts match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
