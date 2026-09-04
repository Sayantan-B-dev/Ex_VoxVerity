"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  }

  function setField(field: keyof Omit<FormErrors, "general">, value: string) {
    const setters: Record<keyof Omit<FormErrors, "general">, React.Dispatch<React.SetStateAction<string>>> = {
      name: setName, email: setEmail, password: setPassword, confirmPassword: setConfirmPassword,
    };
    setters[field](value);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErrors({});
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    // TODO: Phase 14 - create user in Supabase database
    // For now, sign in directly with credentials
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setErrors({ general: "Registration failed. Try again." });
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "github") {
    await signIn(provider, { callbackUrl: "/dashboard" });
  }

  if (submitted) {
    return (
      <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Welcome!</h2>
          <p style={{ marginBottom: "var(--space-6)" }}>Your account has been created. Redirecting to dashboard…</p>
          <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>Create Account</h1>

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {errors.general && <div className="alert alert-danger">{errors.general}</div>}

        <div>
          <label htmlFor="name" className="input-label">Full Name</label>
          <input id="name" className={`input ${errors.name ? "input-error" : ""}`} placeholder="Jane Doe" value={name} onChange={(e) => setField("name", e.target.value)} autoComplete="name" />
          {errors.name && <p className="input-error-text">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="input-label">Email</label>
          <input id="email" type="email" className={`input ${errors.email ? "input-error" : ""}`} placeholder="you@example.com" value={email} onChange={(e) => setField("email", e.target.value)} autoComplete="email" />
          {errors.email && <p className="input-error-text">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="input-label">Password</label>
          <input id="password" type="password" className={`input ${errors.password ? "input-error" : ""}`} placeholder="At least 8 characters" value={password} onChange={(e) => setField("password", e.target.value)} autoComplete="new-password" />
          {errors.password && <p className="input-error-text">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
          <input id="confirmPassword" type="password" className={`input ${errors.confirmPassword ? "input-error" : ""}`} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} autoComplete="new-password" />
          {errors.confirmPassword && <p className="input-error-text">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", margin: "var(--space-6) 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>or sign up with</span>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleOAuth("google")}>Google</button>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleOAuth("github")}>GitHub</button>
      </div>

      <p style={{ textAlign: "center", marginTop: "var(--space-6)", fontSize: "var(--text-sm)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-primary)" }}>Sign in</Link>
      </p>
    </div>
  );
}
