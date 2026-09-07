"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Hexagon, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 43.5c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.6 2.5-7.3 2.5-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3c-.4.4 6.9-5 6.9-14.8 0-1.2-.1-2.3-.3-3.5z" />
  </svg>
);

const GitHubMark = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </svg>
);

export default function Auth({ mode: initialMode = "signin" }: { mode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState<false | "google" | "github" | "submit">(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const title = mode === "signin" ? "Welcome back" : "Create your account";

  async function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    setBusy("submit");
    if (mode === "signup") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not create account.");
          setBusy(false);
          return;
        }
      } catch {
        setError("Could not create account. Check your connection.");
        setBusy(false);
        return;
      }
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      setBusy(false);
      return;
    }
    await finish();
  }

  async function handleOAuth(provider: "google" | "github") {
    setBusy(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setError(`${provider === "google" ? "Google" : "GitHub"} sign-in is not configured yet. Use email and password.`);
      setBusy(false);
    }
  }

  return (
    <div className="relative grid h-full place-items-center overflow-y-auto bg-black px-4 py-10 text-text-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(50% 50% at 50% 25%, rgba(53,214,193,0.12), transparent 70%)" }}
      />
      <div className="relative w-full max-w-[400px] animate-fade-in">
        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="rounded-3xl border border-line bg-card p-7">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-teal/30 bg-teal/10">
              <Hexagon className="size-6 fill-teal/20 text-teal" strokeWidth={2.2} />
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-[13px] text-text-secondary">
              {mode === "signin"
                ? "Sign in to your VoxVerity dashboard"
                : "Start protecting your organization"}
            </p>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleOAuth("google")}
              disabled={busy !== false}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-elev py-3 text-[14px] font-medium transition-colors hover:border-white/25 disabled:opacity-60"
            >
              {busy === "google" ? <Loader2 className="size-5 animate-spin text-teal" /> : <GoogleMark />}
              Google
            </button>
            <button
              onClick={() => handleOAuth("github")}
              disabled={busy !== false}
              className="flex items-center justify-center gap-2 rounded-xl border border-line bg-elev py-3 text-[14px] font-medium transition-colors hover:border-white/25 disabled:opacity-60"
            >
              {busy === "github" ? <Loader2 className="size-4 animate-spin text-teal" /> : <GitHubMark />}
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-text-disabled">
            <span className="h-px flex-1 bg-line" />
            or continue with email
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Email + Password form */}
          <form onSubmit={submitForm} className="space-y-3.5">
            {mode === "signup" && (
              <div>
                <Label>Full name</Label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Vasquez"
                    className="w-full rounded-xl border border-line bg-elev py-2.5 pl-3 pr-3 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Email</Label>
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

            <div>
              <Label>Password</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">
                  <Lock className="size-4" />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-line bg-elev py-2.5 pl-9 pr-10 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-[12px] text-critical">{error}</p>}

            <button
              type="submit"
              disabled={busy !== false}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {busy === "submit" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle sign in / sign up */}
        <p className="mt-5 text-center text-[13px] text-text-secondary">
          {mode === "signin" ? "New to VoxVerity?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
            }}
            className="font-medium text-teal hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
      {children}
    </label>
  );
}
