"use client";

import { useState, useRef, useEffect } from "react";

interface HumanPatternResult {
  score: number;
  label: string;
  description: string;
  contributing_factors: Array<{ feature: string; value: number; note: string }>;
  flags: Record<string, boolean>;
  quality: string;
  method: string;
  disclaimer: string;
}

interface DspMetrics {
  duration_s: number;
  sample_count: number;
  sample_rate: number;
  rms_energy: number;
  dbfs: number;
  peak_amplitude: number;
  clipping_ratio: number;
  zero_crossing_rate: number;
  silence_ratio: number;
  spectral_centroid_hz: number;
  crest_factor: number;
  dynamic_range_db: number;
}

interface SpoofDetectionResult {
  model: string;
  version: string;
  score: number;
  confidence: number;
  loaded: boolean;
  fallback: boolean;
  error: string | null;
}

interface ContributingFactor {
  signal: string;
  score?: number;
  weight?: number;
  label?: string;
  similarity?: number;
  match?: boolean;
  flag?: string;
  impact?: string;
}

interface AnalysisResult {
  result_id: string;
  timestamp: string;
  aggregation_version: string;
  risk_indicators: {
    overall_score: number;
    severity: string;
    contributing_factors: ContributingFactor[];
  };
  model_versions: Record<string, { model: string; version: string; loaded?: boolean; fallback?: boolean; similarity?: number }>;
  metadata: Record<string, string>;
}

interface RiskResult {
  score: number;
  severity: string;
  recommendation: string;
  contributing_factors: ContributingFactor[];
  rule_triggers: string[];
  policy_version: string;
  explanation: string;
}

export default function LabAudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [aiStatus, setAiStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI service on mount
  useEffect(() => {
    const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
    fetch(`${aiUrl}/health`, { method: "GET" })
      .then((r) => r.ok ? setAiStatus("online") : setAiStatus("offline"))
      .catch(() => setAiStatus("offline"));
  }, []);

  const allowedTypes = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/flac"];
  const maxSizeMB = 50;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setResult(null);

    if (!allowedTypes.includes(f.type) && !f.name.match(/\.(wav|mp3|ogg|flac)$/i)) {
      setError("Unsupported format. Allowed: WAV, MP3, OGG, FLAC.");
      return;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    console.log("[AudioLab] Starting upload for file:", file);
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", file);

      console.log("[AudioLab] Uploading to:", `${aiUrl}/v1/analyze/file`);

      const res = await fetch(`${aiUrl}/v1/analyze/file`, {
        method: "POST",
        body: formData,
      });

      console.log("[AudioLab] Response status:", res.status);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("[AudioLab] Result:", data.status);
      setResult(data);
    } catch (e) {
      console.error("[AudioLab] Error:", e);
      setError(e instanceof Error ? e.message : "Upload failed. Is the AI service running?");
    } finally {
      setUploading(false);
    }
  }

  const hp = result?.human_pattern as HumanPatternResult | undefined;
  const dsp = result?.dsp_metrics as DspMetrics | undefined;
  const sd = result?.spoof_detection as SpoofDetectionResult | undefined;
  const analysis = result?.analysis as AnalysisResult | undefined;
  const risk = result?.risk as RiskResult | undefined;
  const scoreColor = hp ? (hp.score >= 70 ? "var(--color-success)" : hp.score >= 50 ? "var(--color-warning)" : "var(--color-danger)") : "var(--color-text-secondary)";
  const riskColor = risk ? (risk.score <= 25 ? "var(--color-success)" : risk.score <= 50 ? "var(--color-warning)" : risk.score <= 75 ? "var(--color-danger)" : "var(--color-danger)") : "var(--color-text-secondary)";

  return (
    <div>
      <div className="page-header"><h1>Audio Lab</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Upload audio files for analysis. Supported formats: WAV, MP3, OGG, FLAC.
        Max file size: {maxSizeMB}MB. Files are sent to the AI service for metadata inspection.
      </p>

      {/* Upload area */}
      <div
        className="card"
        style={{
          border: "2px dashed var(--color-border)",
          textAlign: "center",
          padding: "var(--space-12)",
          cursor: "pointer",
          background: file ? "var(--color-bg-secondary)" : "var(--color-bg)",
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.ogg,.flac,audio/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {file ? (
          <div>
            <p style={{ fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>{file.name}</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || "unknown type"}
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>Drop audio file here</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>or click to browse</p>
          </div>
        )}
      </div>

      {/* AI Service Status */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-3)",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-medium)",
        marginBottom: "var(--space-4)",
        background: aiStatus === "online" ? "var(--color-success-bg)" : aiStatus === "offline" ? "var(--color-danger-bg)" : "var(--color-bg-secondary)",
        color: aiStatus === "online" ? "var(--color-success)" : aiStatus === "offline" ? "var(--color-danger)" : "var(--color-text-muted)",
        border: `1px solid ${aiStatus === "online" ? "var(--color-success-border)" : aiStatus === "offline" ? "var(--color-danger-border)" : "var(--color-border)"}`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: aiStatus === "online" ? "var(--color-success)" : aiStatus === "offline" ? "var(--color-danger)" : "var(--color-text-muted)" }} />
        AI Service: {aiStatus === "online" ? "Running" : aiStatus === "offline" ? "Not running — start with: uvicorn app.main:app --reload --port 8000" : "Checking..."}
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: "var(--space-4)" }}>{error}</div>}

      {file && (
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Analyzing…" : "Analyze File"}
            {uploading && <span style={{ marginLeft: "var(--space-2)" }}>Please wait...</span>}
          </button>
          <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); setError(""); if (inputRef.current) inputRef.current.value = ""; }}>
            Clear
          </button>
        </div>
      )}

      {/* Aggregated Analysis Result */}
      {analysis && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
            Aggregated Analysis
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontStyle: "italic" }}>
            Versioned signal bundle — every result is attributable and reproducible.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Risk Overview */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-bold)",
                fontFamily: "var(--font-mono)",
                color: analysis.risk_indicators.severity === "LOW" ? "var(--color-success)"
                  : analysis.risk_indicators.severity === "MEDIUM" ? "var(--color-warning)"
                  : "var(--color-danger)",
              }}>
                {analysis.risk_indicators.overall_score}/100
              </div>
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                  Risk: {analysis.risk_indicators.severity}
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  Version {analysis.aggregation_version} · {new Date(analysis.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Contributing Factors */}
            {analysis.risk_indicators.contributing_factors.length > 0 && (
              <div>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
                  Contributing Signals
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  {analysis.risk_indicators.contributing_factors.map((f, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "var(--space-1) var(--space-2)",
                      background: "var(--color-bg-secondary)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--text-sm)",
                    }}>
                      <span style={{ fontWeight: "var(--weight-medium)", textTransform: "capitalize" }}>
                        {f.signal.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                        {f.label ?? (f.score !== undefined ? String(f.score) : "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Versions */}
            {Object.keys(analysis.model_versions).length > 0 && (
              <div>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
                  Model Attribution
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  {Object.entries(analysis.model_versions).map(([key, mv]) => (
                    <div key={key} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--text-sm)",
                    }}>
                      <span style={{ color: "var(--color-text-muted)", textTransform: "capitalize" }}>
                        {key.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {mv.model} {mv.version} {mv.loaded ? "(loaded)" : "(fallback)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human-Pattern Result */}
      {hp && (
        <div className="card" style={{ marginTop: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>
            Acoustic Behavior Descriptor
          </h3>

          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontStyle: "italic" }}>
            {hp.disclaimer}
          </p>

          {/* Score */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div style={{
              fontSize: "var(--text-3xl)",
              fontWeight: "var(--weight-bold)",
              fontFamily: "var(--font-mono)",
              color: scoreColor,
            }}>
              {hp.score}/100
            </div>
            <div>
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                {hp.label.replace(/_/g, " ").toUpperCase()}
              </p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                Quality: {hp.quality}
              </p>
            </div>
          </div>

          {/* Description */}
          <p style={{ marginBottom: "var(--space-4)", color: "var(--color-text-secondary)" }}>
            {hp.description}
          </p>

          {/* Contributing Factors */}
          {hp.contributing_factors.length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-3)" }}>
                Contributing Factors
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {hp.contributing_factors.map((f, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "var(--space-2)",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>
                      {f.feature.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                      {f.value}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", flex: 1, marginLeft: "var(--space-3)" }}>
                      {f.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {hp.flags && Object.keys(hp.flags).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {Object.entries(hp.flags).map(([key, val]) => (
                val ? (
                  <span key={key} style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    background: "var(--color-warning-bg)",
                    color: "var(--color-warning)",
                    border: "1px solid var(--color-warning-border)",
                  }}>
                    {key.replace(/_/g, " ")}
                  </span>
                ) : null
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spoof Detection (AASIST-L) */}
      {sd && (
        <div className="card" style={{ marginTop: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
            Spoof Detection (AASIST-L)
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontStyle: "italic" }}>
            Model score only. Higher score = more likely bona fide. Not an absolute verdict.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-bold)",
                fontFamily: "var(--font-mono)",
                color: sd.fallback ? "var(--color-text-muted)" : (sd.score >= 0.7 ? "var(--color-success)" : sd.score >= 0.4 ? "var(--color-warning)" : "var(--color-danger)"),
              }}>
                {sd.score.toFixed(3)}
              </div>
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase" }}>
                  {sd.model} {sd.version}
                </p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  Confidence: {(sd.confidence * 100).toFixed(1)}% · {sd.loaded ? "Model loaded" : "Fallback"}
                </p>
              </div>
            </div>
            {sd.error && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", fontStyle: "italic" }}>
                {sd.error}
              </p>
            )}
          </div>
        </div>
      )}


      {/* Risk Engine Result */}
      {risk && (
        <div className="card" style={{ marginTop: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
            Risk Assessment
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)", fontStyle: "italic" }}>
            Deterministic risk scoring from combined signals. Policy v{risk.policy_version}.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{
                fontSize: "var(--text-3xl)",
                fontWeight: "var(--weight-bold)",
                fontFamily: "var(--font-mono)",
                color: riskColor,
              }}>
                {risk.score}/100
              </div>
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                  {risk.severity}
                </p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                  {risk.recommendation}
                </p>
              </div>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              {risk.explanation}
            </p>
            {risk.rule_triggers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {risk.rule_triggers.map((trigger) => (
                  <span key={trigger} style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    background: "var(--color-warning-bg)",
                    color: "var(--color-warning)",
                    border: "1px solid var(--color-warning-border)",
                  }}>
                    {trigger.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* DSP Metrics */}
      {dsp && (
        <div className="card" style={{ marginTop: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>DSP Metrics</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {Object.entries(dsp).map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textTransform: "capitalize" }}>
                  {key.replace(/_/g, " ")}
                </span>
                <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
