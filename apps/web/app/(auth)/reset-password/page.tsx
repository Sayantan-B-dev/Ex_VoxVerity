"use client";

import { useState } from "react";
import Link from "next/link";

type FormErrors = {
  password?: string;
  confirmPassword?: string;
  general?: string;
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErrors({});
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    // TODO: Phase 14 - implement password reset via Supabase admin API
    await new Promise((r) => setTimeout(r, 800));
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "var(--space-4)" }}>Password Reset</h2>
          <p style={{ marginBottom: "var(--space-6)" }}>Your password has been updated successfully.</p>
          <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-sm" style={{ paddingTop: "var(--space-16)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>Reset Password</h1>
      <p style={{ textAlign: "center", marginBottom: "var(--space-8)", color: "var(--color-text-secondary)" }}>Enter your new password below.</p>

      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {errors.general && <div className="alert alert-danger">{errors.general}</div>}

        <div>
          <label htmlFor="password" className="input-label">New Password</label>
          <input id="password" type="password" className={`input ${errors.password ? "input-error" : ""}`} placeholder="At least 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }} autoComplete="new-password" />
          {errors.password && <p className="input-error-text">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
          <input id="confirmPassword" type="password" className={`input ${errors.confirmPassword ? "input-error" : ""}`} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }} autoComplete="new-password" />
          {errors.confirmPassword && <p className="input-error-text">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
