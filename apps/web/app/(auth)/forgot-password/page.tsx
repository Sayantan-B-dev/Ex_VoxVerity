"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; }

    setLoading(true);
    // TODO: Phase 14 - implement password reset via Supabase
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Check Your Email</h2>
          <p style={{ marginBottom: "var(--space-6)" }}>If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link.</p>
          <Link href="/login" className="btn btn-primary">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>Forgot Password</h1>
      <p style={{ textAlign: "center", marginBottom: "var(--space-8)", color: "var(--color-text-secondary)" }}>Enter your email and we&apos;ll send a reset link.</p>

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <label htmlFor="email" className="input-label">Email</label>
          <input id="email" type="email" className={`input ${error ? "input-error" : ""}`} placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} autoComplete="email" />
          {error && <p className="input-error-text">{error}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--text-sm)" }}>
        Remember your password? <Link href="/login" style={{ color: "var(--color-primary)" }}>Sign in</Link>
      </p>
    </div>
  );
}
