"use client";

import { useRouter } from "next/navigation";
import {
  Hexagon,
  ShieldCheck,
  Waves,
  Activity,
  VenetianMask,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import RiskMeter from "./RiskMeter";
import { Tag } from "./primitives";

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 transition-colors hover:border-teal/40">
      <div className="grid size-10 place-items-center rounded-xl border border-teal/30 bg-teal/10 text-teal">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="dot text-[30px] leading-none text-teal">{value}</div>
      <div className="mt-2 text-[12px] uppercase tracking-wider text-text-secondary">
        {label}
      </div>
    </div>
  );
}

export default function Landing() {
  const router = useRouter();
  const enter = () => router.push("/dashboard");
  const signIn = () => router.push("/login");

  return (
    <div className="h-full overflow-y-auto bg-black text-text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Hexagon className="size-6 fill-teal/20 text-teal" strokeWidth={2.2} />
            <span className="text-[16px] font-bold tracking-tight">VOXVERITY</span>
          </div>
          <nav className="hidden items-center gap-8 text-[13px] text-text-secondary md:flex">
            <span className="cursor-pointer transition-colors hover:text-text-primary">Platform</span>
            <span className="cursor-pointer transition-colors hover:text-text-primary">Detection</span>
            <span className="cursor-pointer transition-colors hover:text-text-primary">Compliance</span>
          </nav>
          <button
            onClick={signIn}
            className="rounded-lg border border-line px-4 py-2 text-[13px] font-medium transition-colors hover:border-teal/50 hover:text-teal"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 60% at 75% 20%, rgba(53,214,193,0.12), transparent 70%), radial-gradient(40% 50% at 15% 80%, rgba(124,108,255,0.10), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[12px] font-medium text-teal">
              <Sparkles className="size-3.5" />
              AI-powered voice integrity verification
            </span>
            <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-tight md:text-[54px]">
              Stop voice scams &amp;
              <br />
              <span className="text-teal">deepfake calls</span> before
              <br />
              they reach your people.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-secondary">
              VoxVerity listens for cloned, synthetic, replayed or manipulated voices in
              authorized calls, scores the risk in real time, and tells your analysts exactly
              what to do next — protecting your money and your people.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={enter}
                className="group inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                Launch Dashboard
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={enter}
                className="rounded-xl border border-line px-6 py-3 text-[14px] font-medium text-text-primary transition-colors hover:border-white/25"
              >
                Book a demo
              </button>
            </div>
            <div className="mt-12 flex gap-12">
              <Stat value="3s" label="Update cadence" />
              <Stat value="0–100" label="Risk score" />
              <Stat value="24/7" label="Live coverage" />
            </div>
          </div>

          {/* Visual */}
          <div className="animate-fade-in">
            <div className="relative mx-auto max-w-md rounded-3xl border border-line bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[12px] uppercase tracking-wider text-text-secondary">
                    Live risk index
                  </div>
                  <div className="text-[14px] font-semibold">Current session risk</div>
                </div>
                <Tag level="At Risk">Monitoring</Tag>
              </div>
              <div className="grid place-items-center py-2">
                <RiskMeter value={72} size={220} centerValue="72" centerLabel="risk score" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Calls", "1.2k"],
                  ["Flagged", "43"],
                  ["Blocked", "9"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-line bg-elev py-3">
                    <div className="dot text-[20px] text-teal">{v}</div>
                    <div className="mt-1 text-[11px] text-text-secondary">{l}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-text-disabled">
                Captures only <span className="text-text-secondary">authorized audio</span> through
                explicit browser permission — never hidden or silent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1200px] px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={Waves}
            title="Voice-clone detection"
            body="AASIST-L analyzes raw waveform for synthetic and impersonated voices, so a fake 'CEO' or 'family member' can't fool you."
          />
          <Feature
            icon={VenetianMask}
            title="Call fraud monitoring"
            body="Suspicious callers get flagged for review — verify the safe ones, escalate the rest, all from one queue."
          />
          <Feature
            icon={ShieldCheck}
            title="Threat detection"
            body="Vishing, replay, and voice-conversion campaigns are caught early and explained in plain language."
          />
          <Feature
            icon={Activity}
            title="One clear dashboard"
            body="Your whole voice-integrity picture in a single view — simple enough for anyone, deep enough for teams."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-teal/30 bg-card p-10 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 120% at 50% 0%, rgba(53,214,193,0.16), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-[28px] font-bold tracking-tight md:text-[34px]">
              See your risk in real time
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] text-text-secondary">
              Jump into the live dashboard and see how VoxVerity keeps your calls — and your
              people — safe.
            </p>
            <button
              onClick={enter}
              className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              Launch Dashboard
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 text-[12px] text-text-secondary">
          <span>© 2026 VoxVerity</span>
          <span>Voice Integrity Platform</span>
        </div>
      </footer>
    </div>
  );
}