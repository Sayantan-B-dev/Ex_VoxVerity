import Link from "next/link";

const mockIncidents: Record<string, {
  status: string; session: string; risk: number; severity: string;
  owner: string; opened: string; scope: string;
  timeline: { action: string; by: string; time: string }[];
  evidence: { id: string; hash: string; status: string }[];
}> = {
  "1039": {
    status: "OPEN", session: "#1039", risk: 85, severity: "CRITICAL",
    owner: "analyst@acme.com", opened: "1 hr ago", scope: "Full session analysis — high synthetic signal, low speaker similarity",
    timeline: [
      { action: "Incident created from alert ALT-201", by: "system", time: "1 hr ago" },
      { action: "Assigned to analyst", by: "admin@acme.com", time: "55 min ago" },
    ],
    evidence: [{ id: "EVD-1039", hash: "a1b2c3d4…e5f6", status: "Generated" }],
  },
  "1041": {
    status: "INVESTIGATING", session: "#1041", risk: 62, severity: "HIGH",
    owner: "analyst@acme.com", opened: "2 hr ago", scope: "Speaker similarity mismatch detected",
    timeline: [
      { action: "Incident created from alert ALT-200", by: "system", time: "2 hr ago" },
      { action: "Investigation started", by: "analyst@acme.com", time: "1 hr ago" },
    ],
    evidence: [],
  },
};

function getFallback(id: string) {
  return {
    status: "OPEN", session: "—", risk: 0, severity: "LOW",
    owner: "—", opened: "—", scope: "—",
    timeline: [] as { action: string; by: string; time: string }[],
    evidence: [] as { id: string; hash: string; status: string }[],
  };
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = await params;
  const inc = mockIncidents[incidentId] ?? getFallback(incidentId);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/incidents" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>← Back to Incidents</Link>
          <h1 style={{ marginTop: "var(--space-2)" }}>INC-{incidentId}</h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {inc.status === "OPEN" && <button className="btn btn-primary">Start Investigation</button>}
          {inc.status === "INVESTIGATING" && <button className="btn btn-primary">Mark Contained</button>}
          <button className="btn btn-secondary">Generate Evidence</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Status</p>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>{inc.status.replace("_", " ")}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Risk</p>
          <p className={`risk-score risk-score-${inc.severity.toLowerCase()}`}>{inc.risk}/100</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Owner</p>
          <p style={{ fontSize: "var(--text-sm)" }}>{inc.owner}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Opened</p>
          <p style={{ fontSize: "var(--text-sm)" }}>{inc.opened}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>Scope</h3>
        <p>{inc.scope}</p>
      </div>

      <div className="grid grid-2">
        {/* Timeline */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Timeline</h3>
          {inc.timeline.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {inc.timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--color-text-muted)", minWidth: 80 }}>{t.time}</span>
                  <div>
                    <p>{t.action}</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>by {t.by}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No timeline events.</p>
          )}
        </div>

        {/* Evidence */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Evidence</h3>
          {inc.evidence.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {inc.evidence.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                  <span>{e.id}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{e.hash}</span>
                  <span className="badge badge-success">{e.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No evidence generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
