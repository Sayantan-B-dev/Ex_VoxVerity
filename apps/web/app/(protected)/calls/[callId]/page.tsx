import Link from "next/link";

const mockCall: Record<string, {
  source: string; user: string; duration: string; risk: number; severity: string;
  startTime: string; endTime: string; chunks: number; modelVersion: string;
  dspSummary: { energy: string; silence: string; spectral: string };
  signals: { name: string; value: string; weight: string }[];
}> = {
  "1042": {
    source: "WebRTC", user: "alice@acme.com", duration: "4:32", risk: 42, severity: "MEDIUM",
    startTime: "2026-09-04 18:42:00", endTime: "2026-09-04 18:46:32", chunks: 91, modelVersion: "AASIST-L v1.0",
    dspSummary: { energy: "Normal", silence: "12%", spectral: "Natural" },
    signals: [
      { name: "Synthetic Spoof Signal", value: "0.34", weight: "40%" },
      { name: "Speaker Similarity", value: "0.82", weight: "25%" },
      { name: "Acoustic Anomaly", value: "0.18", weight: "20%" },
      { name: "Context Risk", value: "0.10", weight: "15%" },
    ],
  },
};

function getFallback(id: string) {
  return {
    source: "Unknown", user: "unknown@example.com", duration: "0:00", risk: 0, severity: "LOW",
    startTime: "—", endTime: "—", chunks: 0, modelVersion: "—",
    dspSummary: { energy: "—", silence: "—", spectral: "—" },
    signals: [] as { name: string; value: string; weight: string }[],
  };
}

export default async function CallDetailPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  const call = mockCall[callId] ?? getFallback(callId);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/calls" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>← Back to Calls</Link>
          <h1 style={{ marginTop: "var(--space-2)" }}>Call #{callId}</h1>
        </div>
        <span className={`badge ${call.risk >= 76 ? "badge-critical" : call.risk >= 51 ? "badge-high" : call.risk >= 26 ? "badge-medium" : "badge-low"}`}>
          {call.severity}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-8)" }}>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Risk Score</p>
          <p className={`risk-score risk-score-${call.severity.toLowerCase()}`}>{call.risk}/100</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Duration</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{call.duration}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Source</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{call.source}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Chunks Analyzed</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{call.chunks}</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Session Info */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Session Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[
              ["User", call.user],
              ["Start", call.startTime],
              ["End", call.endTime],
              ["Model", call.modelVersion],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{label}</span>
                <span style={{ fontSize: "var(--text-sm)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DSP Summary */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>DSP Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Object.entries(call.dspSummary).map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{key}</span>
                <span style={{ fontSize: "var(--text-sm)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contributing Signals */}
      {call.signals.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Contributing Signals</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Value</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {call.signals.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{s.value}</td>
                    <td>{s.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
