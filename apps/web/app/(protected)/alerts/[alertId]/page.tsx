import Link from "next/link";

const mockAlerts: Record<string, {
  severity: string; session: string; message: string; time: string;
  acknowledged: boolean; incident: string | null;
  signals: { name: string; value: string }[];
  recommendedAction: string;
  notes: string;
}> = {
  "ALT-201": {
    severity: "CRITICAL", session: "#1039", message: "Risk threshold 85/100 exceeded", time: "1 hr ago",
    acknowledged: false, incident: "INC-1039",
    signals: [{ name: "Synthetic Spoof Signal", value: "0.78" }, { name: "Speaker Similarity", value: "0.31" }, { name: "Acoustic Anomaly", value: "0.65" }],
    recommendedAction: "Escalate to security analyst for manual review",
    notes: "",
  },
  "ALT-200": {
    severity: "HIGH", session: "#1041", message: "Synthetic voice signal detected", time: "18 min ago",
    acknowledged: false, incident: null,
    signals: [{ name: "Synthetic Spoof Signal", value: "0.62" }, { name: "Speaker Similarity", value: "0.74" }],
    recommendedAction: "Request secondary verification",
    notes: "",
  },
};

function getFallback(id: string) {
  return {
    severity: "LOW", session: "—", message: "Alert details", time: "—",
    acknowledged: false, incident: null,
    signals: [] as { name: string; value: string }[],
    recommendedAction: "Review", notes: "",
  };
}

export default async function AlertDetailPage({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  const alert = mockAlerts[alertId] ?? getFallback(alertId);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/alerts" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>← Back to Alerts</Link>
          <h1 style={{ marginTop: "var(--space-2)" }}>{alertId}</h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {!alert.acknowledged && <button className="btn btn-primary">Acknowledge</button>}
          {!alert.incident && <button className="btn btn-secondary">Create Incident</button>}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Alert Info</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[
              ["Severity", alert.severity],
              ["Session", alert.session],
              ["Time", alert.time],
              ["Status", alert.acknowledged ? "Acknowledged" : "Open"],
              ["Incident", alert.incident ?? "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{label}</span>
                <span style={{ fontSize: "var(--text-sm)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Contributing Signals</h3>
          {alert.signals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {alert.signals.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-sm)" }}>{s.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{s.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No signal data available.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Recommended Action</h3>
        <p>{alert.recommendedAction}</p>
      </div>
    </div>
  );
}
