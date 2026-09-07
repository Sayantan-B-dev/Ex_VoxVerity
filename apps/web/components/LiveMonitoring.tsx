"use client";

import { useEffect, useState } from "react";
import { CircleDot, ShieldQuestion, TriangleAlert } from "lucide-react";
import { Card } from "./primitives";
import RiskMeter from "./RiskMeter";
import Waveform from "./Waveform";
import type { LiveSession } from "@/lib/demo-data";
import { formatDuration, bandTag, bandTone } from "@/lib/format";

function useDuration(initial: number) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return formatDuration(s);
}

function MetricCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mb-4 text-[12px] text-text-secondary">{hint}</p>
      {children}
    </Card>
  );
}

function CircularProgress({ value, color }: { value: number; color: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-24 place-items-center">
      <svg className="size-24 -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#2d3b54" strokeWidth={8} />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <span className="absolute font-mono text-[20px] font-bold">{value}%</span>
    </div>
  );
}

export default function LiveMonitoring({
  session,
  source,
}: {
  session: LiveSession;
  source?: string;
}) {
  const duration = useDuration(session.durationSec);
  const acoustic = [0.4, 0.6, 0.9, 0.5, 0.95, 0.3, 0.85, 0.45];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Call header */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=96&h=96&fit=crop&auto=format"
              alt={session.caller}
              className="size-12 rounded-full bg-hover object-cover ring-1 ring-white/15"
            />
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-neon" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">
              {session.caller}
            </h1>
            <p className="font-mono text-[13px] text-text-secondary">
              {session.number} · {session.context}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Duration</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums">{duration}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-neon/12 px-3 py-1.5 text-[13px] font-semibold text-neon">
            <span className="size-2 animate-pulse rounded-full bg-neon" />
            {session.captureState}
          </span>
        </div>
      </Card>

      {source === "demo" && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-[12px] text-warn">
          Visualization mode — the realtime WebSocket client to the AI service is the next
          backend link (see FRONTEND_MERGE_PLAN.md gap report).
        </div>
      )}

      {/* Threat banner */}
      <div
        className="flex flex-col gap-4 rounded-lg border-l-4 border-critical bg-[#2d1f1f] p-5 md:flex-row md:items-center"
        style={{ animation: "pulse-ring 3s ease-in-out infinite" }}
      >
        <TriangleAlert className="size-6 shrink-0 text-critical" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold">
            ALERT: Possible AI-generated voice detected
          </p>
          <p className="text-[13px] text-text-secondary">
            Speaker profile mismatch at {session.speakerSimilarity}% · synthetic signal
            rising — model score, not a probability verdict
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-teal px-4 py-2 text-[13px] font-medium text-white transition-transform hover:scale-[1.02]">
            Verify Caller
          </button>
          <button className="rounded-md border border-white/20 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-hover">
            Escalate
          </button>
          <button className="rounded-md border border-white/20 px-4 py-2 text-[13px] font-medium transition-colors hover:bg-hover">
            Create Incident
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Risk meter hero */}
        <Card className="flex flex-col items-center justify-center gap-2 p-6 xl:col-span-1">
          <p className="self-start text-[15px] font-semibold">Live Risk Assessment</p>
          <RiskMeter value={session.risk} />
          <p className="text-center text-[12px] text-text-secondary">
            {bandTag(session.riskLevel)} risk · composite of 4 detection signals
          </p>
        </Card>

        {/* Waveform + metrics */}
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold">Live Waveform</p>
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-teal">
                <CircleDot className="size-3.5" /> streaming · {session.source} · 16kHz
              </span>
            </div>
            <Waveform />
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <MetricCard
              title="Synthetic Voice Signal"
              hint="Anti-spoofing model score for this voice"
            >
              <div className="mb-2 font-mono text-[32px] font-bold text-critical">
                {session.syntheticProbability}%
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-elev/60">
                <div
                  className="h-full rounded-full bg-critical"
                  style={{ width: `${session.syntheticProbability}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-text-disabled">
                Label: {session.syntheticLabel} · model aasist-l@1.4.0
              </p>
            </MetricCard>

            <MetricCard title="Speaker Similarity" hint="Match to known speaker profile">
              <div className="flex items-center justify-between">
                <CircularProgress value={session.speakerSimilarity} color={bandTone("HIGH")} />
                <p className="max-w-[9rem] text-right text-[12px] text-text-secondary">
                  Below the 80% trust threshold — flagged as mismatch.
                </p>
              </div>
            </MetricCard>

            <MetricCard title="Acoustic Anomaly" hint="Abnormal acoustic patterns detected">
              <div className="flex h-24 items-end gap-2">
                {acoustic.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h * 100}%`,
                      background: h > 0.8 ? "#ff3b3b" : "#00d97e",
                    }}
                  />
                ))}
              </div>
            </MetricCard>

            <MetricCard title="Prosody Anomaly" hint="Pitch, rhythm & stress pattern analysis">
              <div className="flex items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-full bg-warn/12">
                  <ShieldQuestion className="size-6 text-warn" />
                </div>
                <div>
                  <p className="font-mono text-[32px] font-bold leading-none text-warn">
                    {session.prosodyAnomaly}
                  </p>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    Elevated — unnatural cadence detected
                  </p>
                </div>
              </div>
            </MetricCard>
          </div>
        </div>
      </div>

      {/* Session health footer */}
      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {[
          { label: "Session", value: session.sessionState },
          { label: "Chunk Latency", value: `${session.chunkLatencyMs}ms` },
          { label: "Queue Depth", value: String(session.queueDepth) },
          { label: "Chunk Sequence", value: String(session.chunkSequence) },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[11px] uppercase tracking-wide text-text-disabled">{m.label}</p>
            <p className="mt-0.5 font-mono text-[15px] font-semibold text-text-primary">{m.value}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}