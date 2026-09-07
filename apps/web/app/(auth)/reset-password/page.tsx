"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Hexagon, Check, Eye, EyeOff, Lock, Loader2 } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Request a new reset link.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not update password. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid h-full place-items-center overflow-y-auto bg-black px-4 py-10 text-text-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 25%, rgba(53,214,193,0.12), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-[400px] animate-fade-in">
        <button
          onClick={() => router.push("/login")}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </button>

        <div className="rounded-3xl border border-line bg-card p-7">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-teal/30 bg-teal/10">
              <Hexagon className="size-6 fill-teal/20 text-teal" strokeWidth={2.2} />
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-tight">Set a new password</h1>
            <p className="mt-1 text-[13px] text-text-secondary">
              {done ? "Your password was updated." : "Choose a strong password for your account."}
            </p>
          </div>

          {done ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-center text-[13px] text-teal">
                <Check className="mx-auto mb-1 size-4" />
                Password updated successfully
              </div>
              <button
                onClick={() => router.push("/login")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.01]"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
                  New password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">
                    <Lock className="size-4" />
                  </span>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-elev py-2.5 pl-9 pr-10 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
                  Confirm new password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">
                    <Lock className="size-4" />
                  </span>
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-line bg-elev py-2.5 pl-9 pr-10 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
                  />
                </div>
              </div>

              {error && <p className="text-[12px] text-critical">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}