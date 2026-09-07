"use client";

import { useState } from "react";
import {
  Activity,
  Bell,
  Gauge,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Card, InfoHint, Tag, TickMeter } from "./primitives";
import type { DashboardData } from "@/lib/data";
import { useSupabaseTable } from "@/lib/realtime";
import { riskBand, bandTag, timeAgo } from "@/lib/format";

function KpiTile({
  icon: Icon,
  value,
  label,
  hint,
  tone,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="flex items-start justify-between">
        <Icon className="size-5 text-text-secondary" />
      </div>
      <div>
        <p className={`dot text-[38px] ${tone ?? "text-text-primary"}`}>{value}</p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-text-secondary">
          {label}
          {hint && <InfoHint text={hint} />}
        </p>
      </div>
    </Card>
  );
}

export default function Dashboard({ calls, alerts, incidents }: DashboardData) {
  const [showWelcome, setShowWelcome] = useState(true);
  const rt = useSupabaseTable("analysis_results");

  const openAlerts = alerts.filter((a) => a.status !== "Acknowledged").length;
  const flaggedCalls = calls.filter((c) => c.risk >= 51).length;
  const avgRisk = calls.length ? Math.round(calls.reduce((a, c) => a + c.risk, 0) / calls.length) : 0;
  const liveChunk = rt.last?.row as
    | { risk_score?: number; risk_severity?: string; chunk_sequence?: number; created_at?: string }
    | undefined;

  return (
    <div className="animate-fade-in space-y-4">
      {showWelcome && (
        <div className="flex items-start gap-3 rounded-2xl border border-teal/30 bg-teal/10 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal/20 text-teal">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold">Voice integrity, live</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
              Caller voice is split into 3-second chunks, scored by the AI service, and every
              chunk risk lands here in real time. Scores are model outputs, not probability
              verdicts.
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss"
            className="shrink-0 text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-text-secondary">
            Live risk across active and recent calls.
            {rt.connected && (
              <span className="ml-2 rounded bg-teal/15 px-1.5 py-0.5 font-mono text-[11px] text-teal">
                realtime connected
              </span>
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] font-medium text-critical">
          <span className="size-2 rounded-full bg-critical" style={{ animation: "pulse-ring 1.5s infinite" }} />
          {flaggedCalls} flagged calls
        </span>
      </div>

      {/* KPI row — all computed from SQL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={Phone}
          value={String(calls.length)}
          label="Recent Calls"
          hint="Sessions recorded for this organization."
        />
        <KpiTile
          icon={Bell}
          value={String(openAlerts)}
          label="Open Alerts"
          hint="Alerts not yet acknowledged."
          tone={openAlerts > 0 ? "text-warn" : undefined}
        />
        <KpiTile
          icon={ShieldAlert}
          value={String(flaggedCalls)}
          label="Flagged Calls"
          hint="Calls with risk score 51 or higher."
          tone={flaggedCalls > 0 ? "text-critical" : undefined}
        />
        <KpiTile
          icon={Gauge}
          value={String(avgRisk)}
          label="Avg Risk (recent)"
          hint="Average risk score of the most recent calls."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Live chunk feed */}
        <Card className="xl:col-span-5">
          <div className="flex h-full flex-col p-6">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-teal" />
              <h2 className="text-[18px] font-semibold">Live Risk Feed</h2>
              <span className="inline-flex items-center gap-1 rounded bg-critical px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <span className="size-1.5 rounded-full bg-white" style={{ animation: "pulse-ring 1.5s infinite" }} />
                Live
              </span>
            </div>
            <p className="mt-1 text-[12px] text-text-secondary">
              Per-3s-chunk risk scores as the AI service analyzes caller voice.
            </p>
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {liveChunk ? (
                <div className="rounded-xl border border-line bg-elev p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[12px] text-text-disabled">
                      chunk #{liveChunk.chunk_sequence ?? "—"}
                    </p>
                    <Tag level={bandTag(riskBand(liveChunk.risk_score ?? 0))}>
                      {bandTag(riskBand(liveChunk.risk_score ?? 0))}
                    </Tag>
                  </div>
                  <p className="mt-2 font-mono text-[28px] font-bold text-text-primary">
                    {liveChunk.risk_score ?? 0}
                    <span className="text-[14px] text-text-disabled">/100</span>
                  </p>
                  <div className="mt-2">
                    <TickMeter
                      value={liveChunk.risk_score ?? 0}
                      color={(liveChunk.risk_score ?? 0) >= 76 ? "#ff3b3b" : (liveChunk.risk_score ?? 0) >= 51 ? "#ff6b35" : "#ffb800"}
                    />
                  </div>
                  {liveChunk.created_at && (
                    <p className="mt-2 font-mono text-[11px] text-text-disabled">{timeAgo(liveChunk.created_at)}</p>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-text-secondary">
                  No live chunks yet — start a call from Live Monitor to stream caller audio.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Recent calls + alerts */}
        <div className="space-y-4 xl:col-span-7">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Recent Calls</h2>
              <span className="font-mono text-[11px] text-text-disabled">{calls.length} shown</span>
            </div>
            <div className="space-y-2">
              {calls.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{c.caller}</p>
                    <p className="font-mono text-[11px] text-text-disabled">{c.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[14px] font-semibold">{c.risk}</span>
                    <div className="w-20">
                      <TickMeter value={c.risk} color={c.risk >= 76 ? "#ff3b3b" : c.risk >= 51 ? "#ff6b35" : "#ffb800"} />
                    </div>
                    <Tag level={bandTag(riskBand(c.risk))}>{bandTag(riskBand(c.risk))}</Tag>
                  </div>
                </div>
              ))}
              {calls.length === 0 && <p className="text-[12px] text-text-secondary">No calls recorded yet.</p>}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">Open Alerts</h2>
              <span className="font-mono text-[11px] text-text-disabled">{openAlerts} unresolved</span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{a.threat}</p>
                    <p className="text-[11px] text-text-disabled">{a.caller}</p>
                  </div>
                  <Tag level={bandTag(riskBand(a.risk))}>{a.status}</Tag>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-[12px] text-text-secondary">No alerts right now.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="flex items-center gap-3 border-teal/30 bg-teal/10 p-4">
        <ShieldCheck className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Risk scores are model outputs (AASIST-L anti-spoofing, ECAPA-TDNN speaker similarity),
          not calibrated probabilities. High-risk calls are flagged for human review.
        </p>
      </Card>
    </div>
  );
}