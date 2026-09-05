"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEvent {
  event_id: string;
  action: string;
  user_id: string | null;
  session_id: string | null;
  details: Record<string, unknown>;
  severity: string;
  timestamp: number;
}

const severityColor: Record<string, string> = {
  INFO: "var(--color-text-secondary)",
  WARNING: "var(--color-warning)",
  ERROR: "var(--color-danger)",
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const params = new URLSearchParams();
      if (filter !== "all") params.set("action", filter);
      params.set("limit", "50");

      const res = await fetch(`${aiUrl}/v1/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      // Use mock data as fallback
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Mock data for demo
  const mockEvents: AuditEvent[] = [
    { event_id: "AUD-001", action: "SYSTEM_STARTUP", user_id: null, session_id: null, details: { version: "0.1.0" }, severity: "INFO", timestamp: Date.now() / 1000 - 7200 },
    { event_id: "AUD-002", action: "MODEL_LOADED", user_id: null, session_id: null, details: { model: "AASIST-L", status: "loaded" }, severity: "INFO", timestamp: Date.now() / 1000 - 7100 },
    { event_id: "AUD-003", action: "USER_LOGIN", user_id: "user-001", session_id: null, details: { method: "email" }, severity: "INFO", timestamp: Date.now() / 1000 - 3600 },
    { event_id: "AUD-004", action: "SESSION_STARTED", user_id: "user-001", session_id: "session-001", details: { source: "microphone" }, severity: "INFO", timestamp: Date.now() / 1000 - 3500 },
    { event_id: "AUD-005", action: "ALERT_CREATED", user_id: null, session_id: "session-001", details: { score: 85, severity: "CRITICAL" }, severity: "WARNING", timestamp: Date.now() / 1000 - 3000 },
    { event_id: "AUD-006", action: "INCIDENT_CREATED", user_id: "analyst@acme.com", session_id: "session-001", details: { incident_id: "INC-001" }, severity: "INFO", timestamp: Date.now() / 1000 - 2900 },
    { event_id: "AUD-007", action: "ALERT_ACKNOWLEDGED", user_id: "analyst@acme.com", session_id: "session-001", details: { alert_id: "ALT-001" }, severity: "INFO", timestamp: Date.now() / 1000 - 1800 },
  ];

  const allEvents = [...events, ...mockEvents];
  const filtered = filter === "all" ? allEvents : allEvents.filter((e) => e.action === filter);

  const actionTypes = [...new Set(allEvents.map((e) => e.action))].sort();

  return (
    <div>
      <div className="page-header">
        <h1>Audit Trail</h1>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          {totalCount || allEvents.length} events recorded
        </span>
      </div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Security-relevant actions and system events. Every action is traceable to a user,
        session, and timestamp. Never logs secrets, raw audio, or unnecessary PII.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        <button
          className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {actionTypes.slice(0, 10).map((action) => (
          <button
            key={action}
            className={`btn btn-sm ${filter === action ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(action)}
          >
            {action.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
          Loading audit events...
        </div>
      )}

      {/* Event List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {filtered.map((event) => (
          <div key={event.event_id} className="card" style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            padding: "var(--space-3)",
          }}>
            {/* Severity indicator */}
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: severityColor[event.severity] || "var(--color-text-muted)",
              flexShrink: 0,
            }} />

            {/* Event info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>
                  {event.action.replace(/_/g, " ")}
                </span>
                <span style={{
                  fontSize: "10px",
                  padding: "1px var(--space-2)",
                  borderRadius: "var(--radius-full)",
                  background: event.severity === "ERROR" ? "var(--color-danger-bg)" : event.severity === "WARNING" ? "var(--color-warning-bg)" : "var(--color-bg-secondary)",
                  color: event.severity === "ERROR" ? "var(--color-danger)" : event.severity === "WARNING" ? "var(--color-warning)" : "var(--color-text-muted)",
                }}>
                  {event.severity}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                <span>{event.event_id}</span>
                {event.user_id && <span>User: {event.user_id}</span>}
                {event.session_id && <span>Session: {event.session_id.slice(0, 12)}</span>}
              </div>
            </div>

            {/* Timestamp */}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              {new Date(event.timestamp * 1000).toLocaleTimeString()}
            </span>
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
            No audit events match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
