"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  Phone,
  Radar,
  ShieldCheck,
  Sparkles,
  VenetianMask,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Card, InfoHint, Tag, TickMeter } from "./primitives";
import MeshSurface from "./viz/MeshSurface";
import RiskMeter from "./RiskMeter";
import StreamFeed from "./viz/StreamFeed";
import Sonar from "./viz/Sonar";
import Candles from "./viz/Candles";
import { dashboardStats, insights, protectedLines, alerts, weeklyRiskTrend } from "@/lib/demo-data";

function ControlBtn({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
        accent
          ? "border-teal/40 bg-teal/15 text-teal hover:bg-teal/25"
          : "border-line bg-elev text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function KpiTile({
  icon: Icon,
  value,
  label,
  hint,
  plain,
  glow,
  children,
  className,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  hint?: string;
  plain?: string;
  glow: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card glow={glow} className={`flex flex-col justify-between p-5 ${className ?? ""}`}>
      <div className="flex items-start justify-between">
        <Icon className="size-5 text-text-secondary" />
        <div className="text-right text-[12px] text-text-secondary">{children}</div>
      </div>
      <div>
        <p className="dot text-[42px] text-text-primary">{value}</p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-text-secondary">
          {label}
          {hint && <InfoHint text={hint} />}
        </p>
        {plain && <p className="mt-0.5 text-[11px] text-text-disabled">{plain}</p>}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [showWelcome, setShowWelcome] = useState(true);
  const topAlert = alerts[0];

  return (
    <div className="animate-fade-in space-y-4">
      {/* friendly welcome / onboarding banner */}
      {showWelcome && (
        <div className="flex items-start gap-3 rounded-2xl border border-teal/30 bg-teal/10 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal/20 text-teal">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold">Welcome to your security dashboard 👋</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
              This page shows how safe your voice channels are right now. Start with the{" "}
              <span className="font-medium text-text-primary">Protection Score</span> on the left
              — higher is better. Hover the{" "}
              <span className="font-medium text-text-primary">?</span> icons anywhere for a plain
              explanation of what each number means.
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss welcome message"
            className="shrink-0 text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* page header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-text-secondary">
            A quick overview of your voice-integrity health and any threats we've spotted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ControlBtn accent>
            <Zap className="size-4" /> Quick Actions
          </ControlBtn>
          <ControlBtn>
            Last 24h <ChevronDown className="size-3.5" />
          </ControlBtn>
          <ControlBtn>
            Export <Download className="size-3.5" />
          </ControlBtn>
        </div>
      </div>

      {/* top bento row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Protection posture */}
        <Card className="relative lg:col-span-5">
          <div className="absolute inset-x-0 bottom-0 h-2/3 opacity-30">
            <MeshSurface />
          </div>
          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-1.5 text-[18px] font-semibold">
                  Protection Score
                  <InfoHint text="A single 0–100 rating of how safe your voice channels are overall. Above 80 is healthy, 60–80 needs a look, below 60 is urgent." />
                </h2>
                <p className="text-[12px] text-text-secondary">Overall voice-integrity health</p>
              </div>
              <Tag level="At Risk">Needs attention</Tag>
            </div>
            <div className="my-4 flex flex-col items-center">
              <RiskMeter
                value={dashboardStats.currentProtection}
                size={220}
                centerValue={String(dashboardStats.currentProtection)}
                centerLabel="out of 100"
              />
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-critical/15 px-2 py-0.5 text-[11px] text-critical">
                ↓ 4.2% since yesterday
              </span>
            </div>
            <p className="text-center text-[12px] leading-relaxed text-text-secondary">
              <span className="font-semibold text-warn">In plain terms:</span> your score dipped
              because we noticed a synthetic-voice campaign on the CFO line —{" "}
              <span className="font-semibold text-text-primary">{dashboardStats.openAlerts}</span>{" "}
              open alerts in the last 2 hours. Worth reviewing soon.
            </p>
          </div>
        </Card>

        {/* KPI stack */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-1">
          <KpiTile
            icon={ShieldCheck}
            value={String(dashboardStats.openAlerts)}
            label="Open Alerts"
            hint="Security problems happening right now that our system is tracking. Critical ones matter most."
            plain={`${dashboardStats.openAlerts} open — ${alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length} need urgent action`}
            glow="rgba(217,168,119,0.16)"
          >
            <div className="space-y-0.5">
              <p>
                Critical <span className="text-critical">{alerts.filter((a) => a.severity === "CRITICAL").length}</span>
              </p>
              <p>
                High <span className="text-orange">{alerts.filter((a) => a.severity === "HIGH").length}</span>
              </p>
              <p>
                Medium <span className="text-warn">{alerts.filter((a) => a.severity === "MEDIUM").length}</span>
              </p>
            </div>
          </KpiTile>
          <Card glow="rgba(53,214,193,0.14)" className="flex flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <VenetianMask className="size-5 text-text-secondary" />
              <p className="text-[12px] text-text-secondary">{dashboardStats.threatsDetected} flagged</p>
            </div>
            <div>
              <p className="dot text-[38px] text-text-primary">HIGH</p>
              <div className="mt-1 flex items-center gap-1">
                <p className="text-[13px] text-text-secondary">Voice Fraud Risk</p>
                <InfoHint text="How likely recent calls are fraudulent or spoofed. HIGH means several calls show synthetic indicators and should be checked." />
              </div>
              <p className="mt-0.5 text-[11px] text-text-disabled">
                {dashboardStats.threatsDetected} calls flagged for review
              </p>
            </div>
          </Card>
          <KpiTile
            icon={Wallet}
            value={`${dashboardStats.verifiedRate}%`}
            label="Verified Calls"
            hint="Share of calls that passed all checks with no spoof indicators. Closer to 100% is better."
            plain={`${dashboardStats.lossesPreventedUsd >= 1000 ? "Prevented $" + (dashboardStats.lossesPreventedUsd / 1000) + "K" : "No major losses"} in fraud this month`}
            glow="rgba(124,108,255,0.16)"
          >
            <div className="space-y-0.5 text-right">
              <p>{dashboardStats.callsToday} calls</p>
              <p>{dashboardStats.falsePositiveRate}% false positives</p>
            </div>
          </KpiTile>
        </div>

        {/* Live Alert Feed */}
        <Card className="relative overflow-hidden lg:col-span-4">
          <div className="absolute inset-0">
            <StreamFeed />
          </div>
          <div className="relative flex h-full flex-col justify-between p-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold">Live Alert Feed</h2>
                <span className="inline-flex items-center gap-1 rounded bg-critical px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  <span className="size-1.5 rounded-full bg-white" style={{ animation: "pulse-ring 1.5s infinite" }} />
                  Live
                </span>
              </div>
              <p className="text-[12px] text-text-secondary">Threats as they happen, in real time</p>
            </div>
            <div className="ml-auto w-full max-w-[220px] rounded-xl border border-line bg-black/70 p-4 backdrop-blur-md">
              <p className="text-[15px] font-semibold">{topAlert.threat}</p>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-text-secondary">
                <Phone className="size-3.5" /> {topAlert.caller}
              </p>
              <p className="font-mono text-[11px] text-text-secondary">{topAlert.phone}</p>
              <div className="mt-3">
                <p className="text-[11px] text-text-secondary">
                  Risk Score <span className="font-semibold text-text-primary">{topAlert.risk}/100</span>
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${topAlert.risk}%` }} />
                </div>
              </div>
              <div className="mt-3 flex gap-3 text-text-secondary">
                <button className="hover:text-critical" aria-label="Block">⊘</button>
                <button className="hover:text-teal" aria-label="Inspect">⌕</button>
                <button className="hover:text-warn" aria-label="Flag">⚑</button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* bottom bento row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* AI Insights */}
        <Card className="p-6 lg:col-span-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-[18px] font-semibold">AI Insights &amp; Recommendations</h2>
              <p className="text-[12px] text-text-secondary">
                Things our models noticed, plus what you can do about them
              </p>
            </div>
            <Radar className="size-4 text-text-secondary" />
          </div>
          <div className="space-y-4">
            {insights.map((ins, i) => (
              <div
                key={ins.title}
                className={`flex items-start justify-between gap-3 pb-4 ${i < insights.length - 1 ? "border-b border-line" : ""}`}
              >
                <div>
                  <p className="text-[14px] font-medium">{ins.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{ins.body}</p>
                </div>
                <Tag level={ins.level}>{ins.level}</Tag>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
            <Sonar value={weeklyRiskTrend[weeklyRiskTrend.length - 1].score} />
            <div className="flex-1">
              <p className="text-[14px] font-medium">CFO Line</p>
              <p className="text-[13px] text-teal">Synthetic Voice Attempts</p>
              <button className="mt-3 rounded-lg border border-teal/40 bg-teal/15 px-4 py-2 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
                Enable Step-up Verification
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                Require a trusted callback before any high-value instruction is followed.
              </p>
            </div>
          </div>
        </Card>

        {/* Protected Lines */}
        <Card className="p-6 lg:col-span-7">
          <div className="mb-4">
            <h2 className="text-[18px] font-semibold">Protected Lines</h2>
            <p className="text-[12px] text-text-secondary">
              Voice channels currently under protection or at risk
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {protectedLines.map((s, i) => (
              <div key={s.name} className="flex flex-col rounded-xl border border-line bg-elev p-4">
                <div className="flex items-center justify-between">
                  <Phone className="size-5 text-text-secondary" />
                  <Tag level={s.tag}>{s.tag}</Tag>
                </div>
                <p className="dot mt-4 text-[36px]">{s.sessions}</p>
                <p className="text-[14px] font-medium">{s.name}</p>
                <p className="text-[11px] text-text-secondary">{s.sub}</p>
                <div className="mt-4 flex-1">
                  {i === 0 ? (
                    <div className="h-16">
                      <Candles />
                    </div>
                  ) : (
                    <div className="space-y-2 pt-4">
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>Line Health</span>
                        <span className="text-text-primary">{s.health}%</span>
                      </div>
                      <TickMeter value={s.health} color={s.color} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}