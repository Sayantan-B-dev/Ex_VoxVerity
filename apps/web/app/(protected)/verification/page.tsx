"use client";

import { useState, useRef } from "react";

const mockVerifications = [
  { id: "VR-101", session: "#1039", status: "PENDING", requestedBy: "system", time: "1 hr ago", method: "Callback to trusted number" },
  { id: "VR-100", session: "#1041", status: "CONFIRMED", requestedBy: "analyst@acme.com", time: "15 min ago", method: "Human verification" },
  { id: "VR-99", session: "#1030", status: "REJECTED", requestedBy: "system", time: "6 hr ago", method: "Callback to trusted number" },
];

const statusBadge: Record<string, string> = {
  PENDING: "badge-medium", CONFIRMED: "badge-success", REJECTED: "badge-danger", ESCALATED: "badge-high", EXPIRED: "badge-low",
};

export default function VerificationPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workflow" | "enroll" | "verify">("workflow");

  // Enrollment state
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [enrollUserId, setEnrollUserId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollResult, setEnrollResult] = useState<Record<string, unknown> | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const enrollInputRef = useRef<HTMLInputElement>(null);

  // Verify state
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyUserId, setVerifyUserId] = useState("");
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/flac"];

  function handleEnrollFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setEnrollError("");
    setEnrollResult(null);
    if (!allowedTypes.includes(f.type) && !f.name.match(/\.(wav|mp3|ogg|flac)$/i)) {
      setEnrollError("Unsupported format. Allowed: WAV, MP3, OGG, FLAC.");
      return;
    }
    setEnrollFile(f);
  }

  function handleVerifyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setVerifyError("");
    setVerifyResult(null);
    if (!allowedTypes.includes(f.type) && !f.name.match(/\.(wav|mp3|ogg|flac)$/i)) {
      setVerifyError("Unsupported format. Allowed: WAV, MP3, OGG, FLAC.");
      return;
    }
    setVerifyFile(f);
  }

  async function handleEnroll() {
    if (!enrollFile || !enrollUserId) return;
    setEnrollLoading(true);
    setEnrollError("");
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", enrollFile);
      formData.append("user_id", enrollUserId);
      formData.append("name", enrollName);

      const res = await fetch(`${aiUrl}/v1/speaker/enroll`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setEnrollResult(data);
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : "Enrollment failed. Is the AI service running?");
    } finally {
      setEnrollLoading(false);
    }
  }

  async function handleVerify() {
    if (!verifyFile || !verifyUserId) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", verifyFile);
      formData.append("user_id", verifyUserId);

      const res = await fetch(`${aiUrl}/v1/speaker/verify`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setVerifyResult(data);
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Verification failed. Is the AI service running?");
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Verification</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Secondary verification is independent of the suspicious voice. Methods include speaker enrollment,
        callback to a trusted number, organization-approved confirmation workflow, or human operator review.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {(["workflow", "enroll", "verify"] as const).map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "workflow" ? "Verification Workflow" : tab === "enroll" ? "Speaker Enrollment" : "Speaker Verify"}
          </button>
        ))}
      </div>

      {/* Verification Workflow Tab */}
      {activeTab === "workflow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {mockVerifications.map((v) => (
            <div key={v.id} className="card" style={{ borderColor: selected === v.id ? "var(--color-primary)" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                    <span style={{ fontWeight: "var(--weight-semibold)" }}>{v.id}</span>
                    <span className={`badge ${statusBadge[v.status]}`}>{v.status}</span>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                    Session {v.session} · {v.method} · by {v.requestedBy} · {v.time}
                  </p>
                </div>
                {v.status === "PENDING" && (
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setSelected(v.id)}>Confirm</button>
                    <button className="btn btn-danger btn-sm">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Speaker Enrollment Tab */}
      {activeTab === "enroll" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Speaker Enrollment</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
            Enroll a speaker by uploading a reference audio sample. This creates a voiceprint for future verification.
            Speaker similarity is a SIGNAL, not identity proof.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
                User ID
              </label>
              <input
                type="text"
                className="input"
                value={enrollUserId}
                onChange={(e) => setEnrollUserId(e.target.value)}
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
                Speaker Name (optional)
              </label>
              <input
                type="text"
                className="input"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="Enter speaker name"
              />
            </div>

            <div
              className="card"
              style={{
                border: "2px dashed var(--color-border)",
                textAlign: "center",
                padding: "var(--space-6)",
                cursor: "pointer",
                background: enrollFile ? "var(--color-bg-secondary)" : "var(--color-bg)",
              }}
              onClick={() => enrollInputRef.current?.click()}
            >
              <input
                ref={enrollInputRef}
                type="file"
                accept=".wav,.mp3,.ogg,.flac,audio/*"
                onChange={handleEnrollFileChange}
                style={{ display: "none" }}
              />
              {enrollFile ? (
                <div>
                  <p style={{ fontWeight: "var(--weight-semibold)" }}>{enrollFile.name}</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    {(enrollFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p>Drop reference audio here</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>or click to browse</p>
                </div>
              )}
            </div>

            {enrollError && <div className="alert alert-danger">{enrollError}</div>}

            {enrollFile && (
              <button className="btn btn-primary" onClick={handleEnroll} disabled={enrollLoading || !enrollUserId}>
                {enrollLoading ? "Enrolling…" : "Enroll Speaker"}
              </button>
            )}

            {enrollResult && (
              <div className="card" style={{ background: "var(--color-bg-secondary)" }}>
                <h4 style={{ marginBottom: "var(--space-2)" }}>Enrollment Result</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {Object.entries(enrollResult).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{key}</span>
                      <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Speaker Verify Tab */}
      {activeTab === "verify" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Speaker Verification</h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
            Verify a speaker against an enrolled reference. Upload audio to compare against the enrolled voiceprint.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
                User ID to verify against
              </label>
              <input
                type="text"
                className="input"
                value={verifyUserId}
                onChange={(e) => setVerifyUserId(e.target.value)}
                placeholder="Enter enrolled user ID"
              />
            </div>

            <div
              className="card"
              style={{
                border: "2px dashed var(--color-border)",
                textAlign: "center",
                padding: "var(--space-6)",
                cursor: "pointer",
                background: verifyFile ? "var(--color-bg-secondary)" : "var(--color-bg)",
              }}
              onClick={() => verifyInputRef.current?.click()}
            >
              <input
                ref={verifyInputRef}
                type="file"
                accept=".wav,.mp3,.ogg,.flac,audio/*"
                onChange={handleVerifyFileChange}
                style={{ display: "none" }}
              />
              {verifyFile ? (
                <div>
                  <p style={{ fontWeight: "var(--weight-semibold)" }}>{verifyFile.name}</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    {(verifyFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p>Drop audio to verify here</p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>or click to browse</p>
                </div>
              )}
            </div>

            {verifyError && <div className="alert alert-danger">{verifyError}</div>}

            {verifyFile && (
              <button className="btn btn-primary" onClick={handleVerify} disabled={verifyLoading || !verifyUserId}>
                {verifyLoading ? "Verifying…" : "Verify Speaker"}
              </button>
            )}

            {verifyResult && (
              <div className="card" style={{ background: "var(--color-bg-secondary)" }}>
                <h4 style={{ marginBottom: "var(--space-2)" }}>Verification Result</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {Object.entries(verifyResult).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{key}</span>
                      <span style={{
                        fontSize: "var(--text-sm)",
                        fontFamily: "var(--font-mono)",
                        color: key === "match" ? (value ? "var(--color-success)" : "var(--color-danger)") : undefined,
                      }}>
                        {typeof value === "boolean" ? (value ? "YES" : "NO") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
