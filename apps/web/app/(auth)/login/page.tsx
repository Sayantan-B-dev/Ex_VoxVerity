"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setErrors({ general: "Invalid email or password" });
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleOAuth(provider: "google" | "github") {
    await signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>Sign In</h1>

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {errors.general && <div className="alert alert-danger">{errors.general}</div>}

        <div>
          <label htmlFor="email" className="input-label">Email</label>
          <input id="email" type="email" className={`input ${errors.email ? "input-error" : ""}`} placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }} autoComplete="email" />
          {errors.email && <p className="input-error-text">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="input-label">Password</label>
          <input id="password" type="password" className={`input ${errors.password ? "input-error" : ""}`} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }} autoComplete="current-password" />
          {errors.password && <p className="input-error-text">{errors.password}</p>}
        </div>

        <div style={{ textAlign: "right" }}>
          <Link href="/forgot-password" style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>Forgot password?</Link>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", margin: "var(--space-6) 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleOAuth("google")}>
          Google
        </button>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleOAuth("github")}>
          GitHub
        </button>
      </div>

      <p style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--text-sm)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "var(--color-primary)" }}>Create one</Link>
      </p>
    </div>
  );
}
