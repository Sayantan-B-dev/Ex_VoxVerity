"use client";

export default function ThreatIntelligencePage() {
  // Mock threat data for demo
  const threats = [
    { type: "Synthetic Voice", severity: "HIGH", count: 12, lastSeen: "2 hr ago", trend: "increasing" },
    { type: "Replay Attack", severity: "MEDIUM", count: 5, lastSeen: "1 day ago", trend: "stable" },
    { type: "Voice Conversion", severity: "MEDIUM", count: 3, lastSeen: "3 hr ago", trend: "increasing" },
    { type: "Speaker Mismatch", severity: "HIGH", count: 8, lastSeen: "45 min ago", trend: "decreasing" },
    { type: "Acoustic Anomaly", severity: "LOW", count: 18, lastSeen: "10 min ago", trend: "stable" },
  ];

  const campaigns = [
    { id: "CMP-001", name: "VoIP Phishing Wave", threats: 8, status: "ACTIVE", firstSeen: "3 days ago", lastSeen: "2 hr ago" },
    { id: "CMP-002", name: "TTS Bot Detection", threats: 5, status: "INVESTIGATING", firstSeen: "1 day ago", lastSeen: "45 min ago" },
  ];

  const recentFindings = [
    { timestamp: "14:32", type: "Synthetic Voice", session: "session-001", risk: 85, details: "High spoof signal with low acoustic dynamics" },
    { timestamp: "14:15", type: "Speaker Mismatch", session: "session-002", risk: 72, details: "Enrolled speaker similarity below threshold" },
    { timestamp: "13:58", type: "Acoustic Anomaly", session: "session-003", risk: 45, details: "Unusual spectral centroid pattern" },
    { timestamp: "13:42", type: "Replay Attack", session: "session-004", risk: 68, details: "Consistent energy pattern with no natural variation" },
  ];

  const severityColor: Record<string, string> = {
    HIGH: "var(--color-danger)",
    MEDIUM: "var(--color-warning)",
    LOW: "var(--color-success)",
  };

  return (
    <div>
      <div className="page-header"><h1>Threat Intelligence</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Campaign patterns, known attack characteristics, and threat trends.
        Tracks repeated suspicious voice indicators and device/source metadata
        without storing unnecessary raw voice content.
      </p>

      {/* Threat Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Active Threats</p>
          <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: "var(--color-danger)" }}>46</p>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Active Campaigns</p>
          <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)" }}>2</p>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Last 24h</p>
          <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)" }}>12</p>
        </div>
      </div>

      {/* Threat Types */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Threat Types</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Count</th>
                <th>Last Seen</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t) => (
                <tr key={t.type}>
                  <td style={{ fontWeight: "var(--weight-semibold)" }}>{t.type}</td>
                  <td>
                    <span style={{
                      padding: "var(--space-1) var(--space-3)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--weight-medium)",
                      background: `${severityColor[t.severity]}20`,
                      color: severityColor[t.severity],
                      border: `1px solid ${severityColor[t.severity]}40`,
                    }}>
                      {t.severity}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.count}</td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{t.lastSeen}</td>
                  <td>
                    <span style={{
                      fontSize: "var(--text-xs)",
                      color: t.trend === "increasing" ? "var(--color-danger)" : t.trend === "decreasing" ? "var(--color-success)" : "var(--color-text-muted)",
                    }}>
                      {t.trend === "increasing" ? "Up" : t.trend === "decreasing" ? "Down" : "Flat"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaigns */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Campaigns</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {campaigns.map((c) => (
            <div key={c.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-3)",
              background: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)" }}>{c.name}</span>
                  <span className={`badge ${c.status === "ACTIVE" ? "badge-danger" : "badge-medium"}`}>{c.status}</span>
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                  {c.id} · {c.threats} threats · First: {c.firstSeen} · Last: {c.lastSeen}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Findings */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Recent Findings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {recentFindings.map((f, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", width: "50px" }}>
                {f.timestamp}
              </span>
              <span style={{
                padding: "1px var(--space-2)",
                borderRadius: "var(--radius-full)",
                fontSize: "10px",
                background: "var(--color-warning-bg)",
                color: "var(--color-warning)",
              }}>
                {f.type}
              </span>
              <span style={{ flex: 1, color: "var(--color-text-secondary)" }}>{f.details}</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontWeight: "var(--weight-semibold)",
                color: f.risk >= 75 ? "var(--color-danger)" : f.risk >= 50 ? "var(--color-warning)" : "var(--color-success)",
              }}>
                Risk: {f.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
