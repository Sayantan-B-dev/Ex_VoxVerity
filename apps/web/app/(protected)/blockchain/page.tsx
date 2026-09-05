"use client";

import { useState } from "react";

export default function BlockchainPage() {
  const [contractAddress, setContractAddress] = useState("");
  const [network, setNetwork] = useState("Polygon Amoy (80002)");
  const [evidenceId, setEvidenceId] = useState("");
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (!evidenceId) return;
    setLoading(true);
    setError("");
    setVerifyResult(null);

    try {
      const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
      const res = await fetch(`${aiUrl}/v1/evidence/${evidenceId}/verify`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setVerifyResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Evidence & Blockchain</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Evidence manifests are SHA-256 hashed and can be registered on Polygon Amoy testnet
        for tamper-evident provenance. The contract stores only hashes, never raw audio or embeddings.
      </p>

      {/* Contract Info */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Contract Status</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Network</span>
            <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>{network}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Contract Address</span>
            <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>
              {contractAddress || "Not deployed"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Chain ID</span>
            <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)" }}>80002</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Status</span>
            <span style={{
              fontSize: "var(--text-sm)",
              color: contractAddress ? "var(--color-success)" : "var(--color-text-muted)",
            }}>
              {contractAddress ? "Deployed" : "Not deployed (local development only)"}
            </span>
          </div>
        </div>
      </div>

      {/* Verify Evidence */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Verify Evidence</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          Verify the integrity of an evidence record by checking its SHA-256 hash.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
              Evidence ID
            </label>
            <input
              type="text"
              className="input"
              value={evidenceId}
              onChange={(e) => setEvidenceId(e.target.value)}
              placeholder="e.g., EVD-A1B2C3D4"
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button className="btn btn-primary" onClick={handleVerify} disabled={loading || !evidenceId}>
            {loading ? "Verifying..." : "Verify Evidence"}
          </button>

          {verifyResult && (
            <div style={{
              padding: "var(--space-4)",
              background: verifyResult.match ? "var(--color-success-bg)" : "var(--color-danger-bg)",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${verifyResult.match ? "var(--color-success-border)" : "var(--color-danger-border)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <span style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--weight-bold)",
                  color: verifyResult.match ? "var(--color-success)" : "var(--color-danger)",
                }}>
                  {verifyResult.match ? "VERIFIED" : "MISMATCH"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Evidence ID</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{String(verifyResult.evidence_id)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Stored Hash</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{String(verifyResult.stored_hash).slice(0, 32)}...</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Computed Hash</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{String(verifyResult.computed_hash).slice(0, 32)}...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>How Evidence Integrity Works</h3>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p><strong>1.</strong> Analysis results are collected into a canonical evidence manifest</p>
          <p><strong>2.</strong> The manifest is deterministically serialized (sorted keys, compact JSON)</p>
          <p><strong>3.</strong> SHA-256 hash is computed from the canonical serialization</p>
          <p><strong>4.</strong> The hash is stored on-chain (Polygon Amoy testnet)</p>
          <p><strong>5.</strong> Verification recomputes the hash and compares to the stored value</p>
          <p style={{ marginTop: "var(--space-2)", fontStyle: "italic" }}>
            Note: On-chain registration is optional for the prototype. The application remains
            fully functional if blockchain is unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}
