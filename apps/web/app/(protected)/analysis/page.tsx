"use client";

import { useState } from "react";
import Link from "next/link";

const mockAnalyses = [
  { id: "AN-401", session: "#1039", risk: 85, severity: "CRITICAL", spoof: "0.78", speaker: "0.31", time: "1 hr ago" },
  { id: "AN-400", session: "#1041", risk: 62, severity: "HIGH", spoof: "0.62", speaker: "0.74", time: "18 min ago" },
  { id: "AN-399", session: "#1042", risk: 42, severity: "MEDIUM", spoof: "0.34", speaker: "0.82", time: "2 min ago" },
  { id: "AN-398", session: "#1038", risk: 18, severity: "LOW", spoof: "0.12", speaker: "0.91", time: "2 hr ago" },
  { id: "AN-397", session: "#1035", risk: 31, severity: "MEDIUM", spoof: "0.28", speaker: "0.85", time: "3 hr ago" },
];

export default function AnalysisPage() {
  const [filter, setFilter] = useState("all");
  const filtered = mockAnalyses.filter((a) => filter === "all" || a.severity === filter);

  return (
    <div>
      <div className="page-header"><h1>Analysis</h1></div>

      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Session</th><th>Risk</th><th>Spoof Signal</th><th>Speaker Sim.</th><th>Time</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: "var(--weight-medium)" }}>{a.id}</td>
                <td>{a.session}</td>
                <td><span className={`risk-score risk-score-${a.severity.toLowerCase()}`} style={{ fontSize: "var(--text-sm)" }}>{a.risk}/100</span></td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{a.spoof}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{a.speaker}</td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{a.time}</td>
                <td><Link href={`/analysis/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
