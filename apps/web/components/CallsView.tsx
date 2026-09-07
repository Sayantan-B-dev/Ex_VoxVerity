"use client";

import { useState } from "react";
import { Gauge, Phone, Search, ShieldAlert, VenetianMask } from "lucide-react";
import { Card, InfoHint, Tag, TickMeter } from "./primitives";
import type { Call } from "@/lib/types";
import { riskBand, bandTag } from "@/lib/format";

function Stat({
  icon: Icon,
  value,
  label,
  hint,
  glow,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  hint?: string;
  glow: string;
}) {
  return (
    <Card glow={glow} className="p-5">
      <Icon className="size-5 text-text-secondary" />
      <p className="dot mt-4 text-[38px] text-text-primary">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-[13px] text-text-secondary">
        {label}
        {hint && <InfoHint text={hint} />}
      </p>
    </Card>
  );
}

export default function CallsView({ calls }: { calls: Call[] }) {
  const flagged = calls.filter((c) => c.risk >= 51);
  const avgRisk = calls.length ? Math.round(calls.reduce((a, c) => a + c.risk, 0) / calls.length) : 0;
  const highRisk = calls.filter((c) => c.risk >= 76).length;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
            <VenetianMask className="size-6 text-teal" />
            Calls
          </h1>
          <p className="text-[13px] text-text-secondary">
            Recent sessions with per-chunk risk scores from the analysis pipeline.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] font-medium text-critical">
          <span className="size-2 rounded-full bg-critical" style={{ animation: "pulse-ring 1.5s infinite" }} />
          {flagged.length} need urgent review
        </span>
      </div>

      {/* Stats computed from SQL calls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          icon={Phone}
          value={String(calls.length)}
          label="Total Sessions"
          hint="Calls recorded for this organization."
          glow="rgba(53,214,193,0.14)"
        />
        <Stat
          icon={ShieldAlert}
          value={String(flagged.length)}
          label="Flagged"
          hint="Calls with risk score 51 or higher."
          glow="rgba(255,107,53,0.16)"
        />
        <Stat
          icon={Gauge}
          value={String(avgRisk)}
          label="Average Risk"
          hint="Mean risk score across all sessions."
          glow="rgba(124,108,255,0.16)"
        />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold">Recent Sessions</h2>
            <p className="text-[12px] text-text-secondary">
              {highRisk > 0 ? `${highRisk} critical-risk session${highRisk > 1 ? "s" : ""} - review first.` : "All sessions within normal risk bands."}
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-elev px-3 py-2 text-[13px] text-text-secondary sm:flex">
            <Search className="size-4" /> Search
          </div>
        </div>

        <div className="space-y-2.5">
          {calls.map((c) => (
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
                  {c.syntheticLabel.replace(/_/g, " ")} · {c.outcome}
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
            </div>
          ))}
          {calls.length === 0 && (
            <Card className="p-8 text-center text-[13px] text-text-secondary">
              No calls recorded yet - start one from Live Monitor.
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}