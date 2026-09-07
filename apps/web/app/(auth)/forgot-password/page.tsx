"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hexagon, Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 800);
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
            <h1 className="mt-4 text-[22px] font-bold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-[13px] text-text-secondary">
              {sent
                ? "Check your inbox for the reset link."
                : "We'll email you a secure link to set a new password."}
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-center text-[13px] text-teal">
              Reset link sent to <span className="font-semibold">{email}</span>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">
                    <Mail className="size-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-line bg-elev py-2.5 pl-9 pr-3 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
                  />
                </div>
              </div>

              {error && <p className="text-[12px] text-critical">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}