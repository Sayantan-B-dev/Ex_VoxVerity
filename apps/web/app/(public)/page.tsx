import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--space-4)" }}>
          VoxVerity
        </h1>
        <p style={{ fontSize: "var(--text-xl)", color: "var(--color-text-secondary)", maxWidth: 640, margin: "0 auto var(--space-8)" }}>
          AI-powered real-time voice integrity verification.
          Detect suspicious, synthetic, and manipulated voice activity
          in authorized communication contexts.
        </p>
        <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center" }}>
          <Link href="/register" className="btn btn-primary btn-lg">
            Get Started
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Problem ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)", background: "var(--color-bg-secondary)" }}>
        <div className="container-lg">
          <h2 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            The Problem
          </h2>
          <div className="grid grid-3">
            <div className="card">
              <h4>Deepfake Voice Attacks</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                AI-generated voice clones can impersonate anyone.
                Traditional caller ID cannot detect synthetic speech.
              </p>
            </div>
            <div className="card">
              <h4>Replay &amp; Conversion</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                Recorded voices can be replayed or converted in real-time
                to bypass basic verification checks.
              </p>
            </div>
            <div className="card">
              <h4>No Real-Time Detection</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                Existing solutions analyze calls after the fact.
                By then, the damage is already done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)" }}>
        <div className="container-lg">
          <h2 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            How VoxVerity Works
          </h2>
          <div className="grid grid-4">
            {[
              { step: "1", title: "Capture", desc: "Authorized browser audio is captured through WebRTC or microphone with explicit consent." },
              { step: "2", title: "Analyze", desc: "Audio is processed in 3-second windows through DSP, anti-spoofing models, and speaker analysis." },
              { step: "3", title: "Score", desc: "A deterministic risk engine combines signals into a 0–100 score with contributing factors." },
              { step: "4", title: "Act", desc: "Alerts trigger verification workflows. Evidence is hashed and optionally registered on-chain." },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "var(--radius-full)",
                  background: "var(--color-primary)", color: "var(--color-text-inverse)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)",
                  margin: "0 auto var(--space-4)",
                }}>
                  {item.step}
                </div>
                <h4>{item.title}</h4>
                <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Evidence Layers ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)", background: "var(--color-bg-secondary)" }}>
        <div className="container-lg">
          <h2 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            Realtime Evidence Layers
          </h2>
          <div className="grid grid-2">
            <div className="card">
              <h4>DSP Metrics</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                Loudness, spectral analysis, pitch variability, voicing ratio,
                and silence patterns provide acoustic evidence.
              </p>
            </div>
            <div className="card">
              <h4>Anti-Spoofing Model</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                AASIST-L analyzes raw waveform for synthetic voice indicators.
                Score is a signal, not a probability.
              </p>
            </div>
            <div className="card">
              <h4>Speaker Similarity</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                ECAPA-TDNN embeddings compare live voice against enrolled references.
                Similarity is a consistency signal, not identity proof.
              </p>
            </div>
            <div className="card">
              <h4>Risk Engine</h4>
              <p style={{ marginTop: "var(--space-2)" }}>
                Deterministic scoring combines all signals with configurable policies.
                Every result is explainable and auditable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)" }}>
        <div className="container-lg" style={{ maxWidth: 768, textAlign: "center" }}>
          <h2 style={{ marginBottom: "var(--space-6)" }}>
            Privacy by Design
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", textAlign: "left" }}>
            {[
              "Explicit capture permissions — never hidden or silent",
              "Raw audio processed in memory, not stored by default",
              "No raw audio or biometric embeddings on-chain",
              "Organization-scoped data with Row Level Security",
              "Clear capture state: on, paused, denied, unsupported",
              "Human verification for high-impact decisions",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
                <span style={{ color: "var(--color-success)", fontWeight: "var(--weight-bold)" }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)", background: "var(--color-bg-secondary)" }}>
        <div className="container-lg" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "var(--space-8)" }}>
            Built on Proven Technology
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", justifyContent: "center" }}>
            {[
              "Next.js 16", "TypeScript", "Supabase", "FastAPI", "PyTorch",
              "Librosa", "WebRTC", "WebSocket", "Solidity", "Polygon Amoy",
            ].map((tech) => (
              <span key={tech} className="badge badge-low" style={{ fontSize: "var(--text-sm)", padding: "var(--space-2) var(--space-4)" }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "var(--space-16) var(--space-6)", textAlign: "center" }}>
        <h2 style={{ marginBottom: "var(--space-4)" }}>
          Ready to Verify Voice Integrity?
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-8)", maxWidth: 480, margin: "0 auto var(--space-8)" }}>
          Start with a controlled demo call and see real-time voice
          analysis in action.
        </p>
        <Link href="/register" className="btn btn-primary btn-lg">
          Start Free Trial
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "var(--space-8) var(--space-6)", borderTop: "1px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
        <div className="container-lg" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
            © 2026 VoxVerity. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: "var(--space-6)", fontSize: "var(--text-sm)" }}>
            <Link href="/help" style={{ color: "var(--color-text-secondary)" }}>Help</Link>
            <Link href="/status" style={{ color: "var(--color-text-secondary)" }}>Status</Link>
            <span style={{ color: "var(--color-text-muted)" }}>Privacy Policy</span>
            <span style={{ color: "var(--color-text-muted)" }}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
