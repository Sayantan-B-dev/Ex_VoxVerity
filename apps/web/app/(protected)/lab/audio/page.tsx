"use client";

import { useState, useRef } from "react";

export default function LabAudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${aiUrl}/v1/analyze/file`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Is the AI service running?");
    } finally {
      setUploading(false);
    }
  }

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

      {error && <div className="alert alert-danger" style={{ marginTop: "var(--space-4)" }}>{error}</div>}

      {file && (
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Analyzing…" : "Analyze File"}
          </button>
          <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); setError(""); if (inputRef.current) inputRef.current.value = ""; }}>
            Clear
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Analysis Result</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Object.entries(result).map(([key, value]) => (
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
