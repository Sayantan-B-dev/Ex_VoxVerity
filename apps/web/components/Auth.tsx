"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Hexagon,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Loader2,
} from "lucide-react";

type Mode = "signin" | "signup";
type Method = "choose" | "email" | "phone" | "otp";

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 43.5c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.6 2.5-7.3 2.5-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3c-.4.4 6.9-5 6.9-14.8 0-1.2-.1-2.3-.3-3.5z"
    />
  </svg>
);

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-text-disabled">
      <span className="h-px flex-1 bg-line" />
      or continue with
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export default function Auth({ mode: initialMode = "signin" }: { mode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [method, setMethod] = useState<Method>("choose");
  const [busy, setBusy] = useState<false | "google" | "github" | "submit">(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const title = mode === "signin" ? "Welcome back" : "Create your account";

  function reset() {
    setError("");
  }

  async function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    reset();
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
    await signIn(provider, { callbackUrl: "/dashboard" });
  }

  function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setError(
      "Phone OTP requires an SMS provider to be configured. Use email or a social provider for now.",
    );
  }

  function setOtpAt(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
    if (v && next.every((d) => d !== "")) {
      setError("Phone OTP requires an SMS provider. Use email or a social provider for now.");
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
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="rounded-3xl border border-line bg-card p-7">
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

          {method === "choose" && (
            <>
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
                  {busy === "github" ? <Loader2 className="size-4 animate-spin text-teal" /> : (
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
                    </svg>
                  )}
                  GitHub
                </button>
              </div>

              <Divider />

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    reset();
                    setMethod("email");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-elev px-4 py-3 text-[14px] font-medium transition-colors hover:border-teal/40"
                >
                  <Mail className="size-4.5 text-teal" />
                  Continue with email
                  <ArrowRight className="ml-auto size-4 text-text-disabled" />
                </button>
                <button
                  onClick={() => {
                    reset();
                    setMethod("phone");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-elev px-4 py-3 text-[14px] font-medium transition-colors hover:border-teal/40"
                >
                  <Phone className="size-4.5 text-teal" />
                  Continue with phone
                  <ArrowRight className="ml-auto size-4 text-text-disabled" />
                </button>
              </div>
            </>
          )}

          {method === "email" && (
            <form onSubmit={submitEmail} className="space-y-3.5">
              {mode === "signup" && (
                <Input
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="Elena Vasquez"
                />
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                icon={<Mail className="size-4" />}
              />
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

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-[13px] text-text-secondary transition-colors hover:text-teal"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

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

              <BackToMethods onClick={() => setMethod("choose")} />
            </form>
          )}

          {method === "phone" && (
            <form onSubmit={submitPhone} className="space-y-3.5">
              <Input
                label="Phone number"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="+1 (555) 000-0142"
                icon={<Phone className="size-4" />}
              />
              {error && <p className="text-[12px] text-critical">{error}</p>}
              <button
                type="submit"
                disabled={busy !== false}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                Send code <ArrowRight className="size-4" />
              </button>
              <BackToMethods onClick={() => setMethod("choose")} />
            </form>
          )}

          {method === "otp" && (
            <div className="space-y-4">
              <p className="text-center text-[13px] text-text-secondary">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-text-primary">{phone}</span>
              </p>
              <div className="flex justify-center gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => setOtpAt(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !d && i > 0)
                        otpRefs.current[i - 1]?.focus();
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    className="dot size-12 rounded-xl border border-line bg-elev text-center text-[22px] text-teal outline-none transition-colors focus:border-teal/60"
                  />
                ))}
              </div>
              {error && <p className="text-center text-[12px] text-critical">{error}</p>}
              <button
                onClick={() => {
                  setOtp(["", "", "", "", "", ""]);
                  setMethod("phone");
                }}
                className="block w-full text-center text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                Use a different number
              </button>
            </div>
          )}
        </div>

        {method !== "otp" && (
          <p className="mt-5 text-center text-[13px] text-text-secondary">
            {mode === "signin" ? "New to VoxVerity?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setMethod("choose");
                reset();
              }}
              className="font-medium text-teal hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        )}
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

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-line bg-elev py-2.5 pr-3 text-[14px] outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60 ${
            icon ? "pl-9" : "pl-3"
          }`}
        />
      </div>
    </div>
  );
}

function BackToMethods({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="size-3.5" /> All sign-in options
    </button>
  );
}