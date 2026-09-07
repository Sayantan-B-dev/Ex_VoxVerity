"use client";

import { useState } from "react";
import {
  VenetianMask,
  Globe,
  Gauge,
  Repeat,
  UserX,
  Check,
  Ban,
  Search,
  ArrowUpRight,
  Volume2,
} from "lucide-react";
import { Card, InfoHint, Tag, TickMeter } from "./primitives";
import RiskMeter from "./RiskMeter";
import Candles from "./viz/Candles";
import type { Call } from "@/lib/demo-data";
import { riskBand, bandTag } from "@/lib/format";

type Decision = "pending" | "verified" | "dismissed";

const spoofTypes = [
  { icon: Volume2, name: "Synthetic clone", count: 41, share: 41, color: "#ff6b35" },
  { icon: Repeat, name: "Replay", count: 24, share: 24, color: "#ff3b3b" },
  { icon: UserX, name: "Speaker mismatch", count: 19, share: 19, color: "#7c6cff" },
  { icon: Globe, name: "Voice conversion", count: 16, share: 16, color: "#d9a877" },
];

function Stat({
  icon: Icon,
  value,
  label,
  hint,
  sub,
  glow,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  hint?: string;
  sub?: string;
  glow: string;
}) {
  return (
    <Card glow={glow} className="p-5">
      <div className="flex items-start justify-between">
        <Icon className="size-5 text-text-secondary" />
        {sub && <span className="text-[12px] text-text-secondary">{sub}</span>}
      </div>
      <p className="dot mt-4 text-[38px] text-text-primary">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-[13px] text-text-secondary">
        {label}
        {hint && <InfoHint text={hint} />}
      </p>
    </Card>
  );
}

export default function CallsView({
  calls,
  stats,
  source,
}: {
  calls: Call[];
  stats: {
    currentProtection: number;
    threatsDetected: number;
    lossesPreventedUsd: number;
    falsePositiveRate: number;
  };
  source?: string;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const flagged = calls;
  const decide = (id: string, decision: Decision) =>
    setDecisions((d) => ({ ...d, [id]: decision }));

  return (
    <div className="animate-fade-in space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
            <VenetianMask className="size-6 text-teal" />
            Calls
          </h1>
          <p className="text-[13px] text-text-secondary">
            Recent sessions and flagged calls — verify the safe ones, dismiss the rest.
            {source === "demo" && (
              <span className="ml-2 rounded bg-warn/15 px-1.5 py-0.5 text-[11px] text-warn">
                demo data — connect Supabase for live calls
              </span>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] font-medium text-critical">
          <span className="size-2 rounded-full bg-critical" style={{ animation: "pulse-ring 1.5s infinite" }} />
          {flagged.filter((c) => c.risk >= 51).length} need urgent review
        </span>
      </div>

      {/* top row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* pressure meter */}
        <Card className="flex flex-col items-center justify-center p-6 lg:col-span-4">
          <div className="mb-2 flex items-center gap-1.5 self-start">
            <h2 className="text-[18px] font-semibold">Call Risk Pressure</h2>
            <InfoHint text="How intense suspicious call activity is right now versus a normal day. Higher means more suspicious activity than usual." />
          </div>
          <RiskMeter
            value={stats.currentProtection}
            size={200}
            centerValue={String(stats.currentProtection)}
            centerLabel="high pressure"
          />
          <p className="mt-3 text-center text-[12px] leading-relaxed text-text-secondary">
            <span className="font-semibold text-warn">In plain terms:</span> suspicious call
            activity is{" "}
            <span className="font-semibold text-text-primary">2.3× </span> higher than your
            typical day, mostly synthetic-voice attempts on executive lines.
          </p>
        </Card>

        {/* stat tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
          <Stat
            icon={Gauge}
            value={String(stats.threatsDetected)}
            label="Flagged today"
            hint="Calls our system paused because they looked risky. They wait here until reviewed."
            sub="+18 vs yesterday"
            glow="rgba(255,107,53,0.16)"
          />
          <Stat
            icon={Ban}
            value={`$${Math.round(stats.lossesPreventedUsd / 1000)}K`}
            label="Losses prevented"
            hint="Money we stopped from leaving by blocking fraudulent call instructions this month."
            sub="this month"
            glow="rgba(53,214,193,0.16)"
          />
          <Stat
            icon={Check}
            value={`${stats.falsePositiveRate}%`}
            label="False-positive rate"
            hint="How often we flag a genuine call by mistake. Lower is better — we aim under 1%."
            sub="last 30 days"
            glow="rgba(124,108,255,0.16)"
          />
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-[13px] font-medium text-text-secondary">Flagged volume · 24h</p>
              <InfoHint text="How many calls were flagged each hour over the last day. Tall bars mean busy fraud periods." />
            </div>
            <div className="h-20">
              <Candles />
            </div>
          </Card>
        </div>
      </div>

      {/* main row: calls + spoof types */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-semibold">Recent Sessions</h2>
              <p className="text-[12px] text-text-secondary">
                Review each one — verify if it looks genuine, dismiss if it doesn&apos;t.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-line bg-elev px-3 py-2 text-[13px] text-text-secondary sm:flex">
              <Search className="size-4" /> Search
            </div>
          </div>

          <div className="space-y-2.5">
            {flagged.map((c) => {
              const decision = decisions[c.id] ?? "pending";
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 rounded-xl border border-line bg-elev p-4 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-text-secondary">{c.id}</span>
                      <Tag level={bandTag(riskBand(c.risk))}>{bandTag(riskBand(c.risk))}</Tag>
                      <span className="text-[11px] text-text-disabled">{c.source}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
                      {c.caller}
                      <span className="text-[12px] font-normal text-text-secondary">· {c.number}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-secondary">
                      <Globe className="size-3.5" /> {c.syntheticLabel.replace(/_/g, " ")} · {c.outcome}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1">
                    <div className="w-28">
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>Risk</span>
                        <span className="dot text-[13px] text-text-primary">{c.risk}</span>
                      </div>
                      <div className="mt-1">
                        <TickMeter value={c.risk} color={c.risk >= 76 ? "#ff3b3b" : c.risk >= 51 ? "#ff6b35" : "#ffb800"} />
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {decision !== "pending" ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[12px] font-medium ${
                          decision === "verified" ? "bg-teal/15 text-teal" : "bg-critical/15 text-critical"
                        }`}
                      >
                        {decision === "verified" ? <Check className="size-3.5" /> : <Ban className="size-3.5" />}
                        {decision === "verified" ? "Verified" : "Dismissed"}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => decide(c.id, "verified")}
                          className="grid size-9 place-items-center rounded-lg border border-line text-text-secondary transition-colors hover:border-teal/50 hover:text-teal"
                          aria-label="Verify call"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          onClick={() => decide(c.id, "dismissed")}
                          className="grid size-9 place-items-center rounded-lg border border-line text-text-secondary transition-colors hover:border-critical/50 hover:text-critical"
                          aria-label="Dismiss call"
                        >
                          <Ban className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* spoof types breakdown */}
        <Card className="p-6 lg:col-span-4">
          <div className="mb-4 flex items-center gap-1.5">
            <h2 className="text-[18px] font-semibold">Spoof Types</h2>
            <InfoHint text="The kinds of spoofing we're seeing most, so you know where the biggest risks are coming from." />
          </div>
          <div className="space-y-4">
            {spoofTypes.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <f.icon className="size-4 text-text-secondary" />
                    {f.name}
                  </span>
                  <span className="dot text-[14px] text-text-primary">{f.count}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.share}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-teal/30 bg-teal/10 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-teal">
              <ArrowUpRight className="size-4" /> Suggested action
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              Synthetic clones are climbing. Turning on step-up verification for executive lines
              could cut successful impersonation by an estimated 30%.
            </p>
            <button className="mt-3 w-full rounded-lg border border-teal/40 bg-teal/15 py-2 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
              Enable step-up verification
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}