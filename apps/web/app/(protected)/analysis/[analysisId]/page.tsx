import Link from "next/link";

const mockAnalyses: Record<string, {
  session: string; risk: number; severity: string;
  spoof: { score: string; label: string; model: string };
  speaker: { similarity: string; enrolled: boolean; label: string };
  dsp: { energy: string; silence: string; spectral: string; pitch: string; zcr: string };
  signals: { name: string; value: string; contribution: string }[];
  quality: { clipping: string; silence: string; sampleCount: string; decodeOk: string };
}> = {
  "AN-401": {
    session: "#1039", risk: 85, severity: "CRITICAL",
    spoof: { score: "0.78", label: "Synthetic voice signal: HIGH", model: "AASIST-L v1.0" },
    speaker: { similarity: "0.31", enrolled: true, label: "Speaker mismatch" },
    dsp: { energy: "-18.2 dBFS", silence: "8%", spectral: "Flat (synthetic pattern)", pitch: "142 Hz ± 3.1", zcr: "0.08" },
    signals: [
      { name: "Synthetic Spoof Signal", value: "0.78", contribution: "45%" },
      { name: "Speaker Similarity", value: "0.31", contribution: "25%" },
      { name: "Acoustic Anomaly", value: "0.65", contribution: "20%" },
      { name: "Context Risk", value: "0.40", contribution: "10%" },
    ],
    quality: { clipping: "0.2%", silence: "8%", sampleCount: "72,000", decodeOk: "Yes" },
  },
  "AN-399": {
    session: "#1042", risk: 42, severity: "MEDIUM",
    spoof: { score: "0.34", label: "Synthetic voice signal: MEDIUM", model: "AASIST-L v1.0" },
    speaker: { similarity: "0.82", enrolled: true, label: "Speaker consistent" },
    dsp: { energy: "-22.1 dBFS", silence: "12%", spectral: "Natural", pitch: "156 Hz ± 8.4", zcr: "0.11" },
    signals: [
      { name: "Synthetic Spoof Signal", value: "0.34", contribution: "40%" },
      { name: "Speaker Similarity", value: "0.82", contribution: "25%" },
      { name: "Acoustic Anomaly", value: "0.18", contribution: "20%" },
      { name: "Context Risk", value: "0.10", contribution: "15%" },
    ],
    quality: { clipping: "0%", silence: "12%", sampleCount: "48,000", decodeOk: "Yes" },
  },
};

function getFallback(id: string) {
  return {
    session: "—", risk: 0, severity: "LOW",
    spoof: { score: "—", label: "No data", model: "—" },
    speaker: { similarity: "—", enrolled: false, label: "Not enrolled" },
    dsp: { energy: "—", silence: "—", spectral: "—", pitch: "—", zcr: "—" },
    signals: [] as { name: string; value: string; contribution: string }[],
    quality: { clipping: "—", silence: "—", sampleCount: "—", decodeOk: "—" },
  };
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const { analysisId } = await params;
  const a = mockAnalyses[analysisId] ?? getFallback(analysisId);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/analysis" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>← Back to Analysis</Link>
          <h1 style={{ marginTop: "var(--space-2)" }}>{analysisId}</h1>
        </div>
        <span className={`badge badge-${a.severity.toLowerCase()}`}>{a.severity}</span>
      </div>

      {/* Risk + Signals */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Risk Score</p>
          <p className={`risk-score risk-score-${a.severity.toLowerCase()}`}>{a.risk}/100</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Spoof Signal</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{a.spoof.score}</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{a.spoof.model}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Speaker Similarity</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{a.speaker.similarity}</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{a.speaker.label}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Session</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{a.session}</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: "var(--space-6)" }}>
        {/* Contributing Signals */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Contributing Signals</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Signal</th><th>Value</th><th>Contribution</th></tr></thead>
              <tbody>
                {a.signals.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{s.value}</td>
                    <td>{s.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DSP Metrics */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>DSP Metrics</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Object.entries(a.dsp).map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textTransform: "capitalize" }}>{key}</span>
                <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Audio Quality</h3>
        <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
          {Object.entries(a.quality).map(([key, value]) => (
            <div key={key}>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "capitalize" }}>{key}</p>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
