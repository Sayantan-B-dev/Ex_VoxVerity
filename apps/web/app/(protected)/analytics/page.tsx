"use client";

import { useState, useEffect, useCallback } from "react";

interface LanguageInfo {
  name: string;
  region: string;
  evaluated: boolean;
  known_limitations: string[];
}

interface AnalyticsData {
  total_languages: number;
  evaluated_languages: number;
  languages: Record<string, LanguageInfo>;
  evaluation_matrix: Record<string, Record<string, { status: string; notes: string }>>;
}

export default function AnalyticsPage() {
  const [langData, setLangData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLangData = useCallback(async () => {
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const res = await fetch(`${aiUrl}/v1/languages`);
      if (res.ok) {
        const data = await res.json();
        setLangData(data);
      }
    } catch {
      // Use default data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLangData();
  }, [fetchLangData]);

  // Mock analytics data
  const riskDistribution = [
    { severity: "LOW", count: 145, color: "var(--color-success)" },
    { severity: "MEDIUM", count: 52, color: "var(--color-warning)" },
    { severity: "HIGH", count: 18, color: "var(--color-danger)" },
    { severity: "CRITICAL", count: 5, color: "var(--color-danger)" },
  ];

  const totalRisk = riskDistribution.reduce((a, b) => a + b.count, 0);

  const modelPerformance = [
    { model: "AASIST-L", version: "v1.0", status: "Evaluated", accuracy: "85.3%", notes: "In-domain ASVspoof2019" },
    { model: "ECAPA-TDNN", version: "v1.0", status: "Available", accuracy: "TBD", notes: "Pending evaluation" },
    { model: "DSP", version: "1.0", status: "Language-agnostic", accuracy: "N/A", notes: "Metrics, not classification" },
    { model: "Risk Engine", version: "1.0", status: "Calibrated", accuracy: "N/A", notes: "Deterministic rules" },
  ];

  return (
    <div>
      <div className="page-header"><h1>Analytics & Threat Intelligence</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Detection volumes, risk distribution, model performance, and language coverage.
        No sensitive PII is exposed in aggregate dashboards.
      </p>

      {/* Risk Distribution */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Risk Distribution</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {riskDistribution.map((item) => (
            <div key={item.severity} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span style={{ width: "80px", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>
                {item.severity}
              </span>
              <div style={{ flex: 1, height: "24px", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${(item.count / totalRisk) * 100}%`,
                  background: item.color,
                  borderRadius: "var(--radius-sm)",
                  transition: "width 0.5s",
                }} />
              </div>
              <span style={{ width: "60px", textAlign: "right", fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
                {item.count} ({((item.count / totalRisk) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Performance */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Model Performance</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Version</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {modelPerformance.map((m) => (
                <tr key={m.model}>
                  <td style={{ fontWeight: "var(--weight-semibold)" }}>{m.model}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{m.version}</td>
                  <td>
                    <span className={`badge ${m.status === "Evaluated" ? "badge-success" : "badge-medium"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{m.accuracy}</td>
                  <td style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Language Coverage */}
      {langData && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>
            Language Coverage ({langData.evaluated_languages}/{langData.total_languages} evaluated)
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
            {Object.entries(langData.languages).map(([code, lang]) => (
              <div key={code} style={{
                padding: "var(--space-3)",
                background: "var(--color-bg)",
                border: `1px solid ${lang.evaluated ? "var(--color-success-border)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)" }}>{lang.name}</span>
                  <span style={{
                    fontSize: "10px",
                    padding: "1px var(--space-2)",
                    borderRadius: "var(--radius-full)",
                    background: lang.evaluated ? "var(--color-success-bg)" : "var(--color-bg-secondary)",
                    color: lang.evaluated ? "var(--color-success)" : "var(--color-text-muted)",
                  }}>
                    {lang.evaluated ? "Evaluated" : "Pending"}
                  </span>
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                  {lang.region} · {code}
                </p>
                {lang.known_limitations.length > 0 && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", marginTop: "var(--space-1)" }}>
                    {lang.known_limitations[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Matrix */}
      {langData?.evaluation_matrix && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Evaluation Matrix</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>English</th>
                  <th>Hindi</th>
                  <th>Bengali</th>
                  <th>Tamil</th>
                  <th>Telugu</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(langData.evaluation_matrix).map(([component, langs]) => (
                  <tr key={component}>
                    <td style={{ fontWeight: "var(--weight-semibold)" }}>{component}</td>
                    {["en", "hi", "bn", "ta", "te"].map((code) => {
                      const status = langs[code]?.status || "not_applicable";
                      return (
                        <td key={code}>
                          <span className={`badge ${status === "evaluated" ? "badge-success" : status === "not_evaluated" ? "badge-medium" : "badge-low"}`}>
                            {status === "evaluated" ? "Yes" : status === "not_evaluated" ? "No" : "N/A"}
                          </span>
                        </td>
                      );
                    })}
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
