"use client";

import { useState } from "react";

const defaultThresholds = { low: 25, medium: 50, high: 75 };

export default function RiskSettingsPage() {
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [weights, setWeights] = useState({ spoof: 40, speaker: 25, acoustic: 20, context: 15 });
  return (
    <div>
      <div className="page-header"><h1>Risk Configuration</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 640 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Severity Thresholds</h3>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            {(["low", "medium", "high"] as const).map((key) => (
              <div key={key}>
                <label className="input-label" style={{ textTransform: "capitalize" }}>{key} (0–{thresholds[key]})</label>
                <input className="input" type="number" value={thresholds[key]} onChange={(e) => setThresholds((p) => ({ ...p, [key]: +e.target.value }))} style={{ width: 100 }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
            Bands: LOW 0–{thresholds.low} · MEDIUM {thresholds.low + 1}–{thresholds.medium} · HIGH {thresholds.medium + 1}–{thresholds.high} · CRITICAL {thresholds.high + 1}–100
          </p>
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Signal Weights</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {([
              ["spoof", "Synthetic Spoof Signal"],
              ["speaker", "Speaker Similarity"],
              ["acoustic", "Acoustic Anomaly"],
              ["context", "Context Risk"],
            ] as const).map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <label style={{ width: 200, fontSize: "var(--text-sm)" }}>{label}</label>
                <input className="input" type="number" value={weights[key]} onChange={(e) => setWeights((p) => ({ ...p, [key]: +e.target.value }))} style={{ width: 80 }} />
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>%</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
            Total: {Object.values(weights).reduce((a, b) => a + b, 0)}%
          </p>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Save Risk Configuration</button>
      </div>
    </div>
  );
}
