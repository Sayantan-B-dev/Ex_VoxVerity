"use client";

import { useEffect, useState } from "react";
import { CircleDot, ShieldQuestion, TriangleAlert, Mic, Square } from "lucide-react";
import { Card } from "./primitives";
import RiskMeter from "./RiskMeter";
import Waveform from "./Waveform";
import type { LiveSession } from "@/lib/types";
import { formatDuration, bandTag, bandTone, riskBand } from "@/lib/format";
import { useRealtimeMic, useSupabaseTable } from "@/lib/realtime";

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
  autoStart,
  onChunk,
}: {
  session?: LiveSession;
  /** Start mic capture automatically on mount (caller side of a live call). */
  autoStart?: boolean;
  /** Fired per analyzed 3s chunk (server write-back in the caller flow). */
  onChunk?: (msg: Record<string, unknown>) => void;
}) {
  const duration = useDuration(session?.durationSec ?? 0);
  const acoustic = [0.4, 0.6, 0.9, 0.5, 0.95, 0.3, 0.85, 0.45];
  const live = useRealtimeMic({ source: "microphone", onResult: onChunk });

  useEffect(() => {
    if (autoStart && live.state === "idle") {
      live.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  const rtAlerts = useSupabaseTable("alerts");
  const isLive = live.state === "live" && live.latest;
  const risk = isLive ? live.latest!.risk : session?.risk ?? 0;
  const severity = isLive ? live.latest!.severity : session?.riskLevel ?? "LOW";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Call header */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {session?.caller ? (
              <>
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=96&h=96&fit=crop&auto=format"
                  alt={session.caller}
                  className="size-12 rounded-full bg-hover object-cover ring-1 ring-white/15"
                />
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-neon" />
              </>
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-elev text-text-secondary">
                <Mic className="size-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">
              {isLive ? "Live microphone capture" : session?.caller ?? "No active session"}
            </h1>
            <p className="font-mono text-[13px] text-text-secondary">
              {isLive
                ? `session ${live.sessionId?.slice(0, 8)} · microphone · 16kHz`
                : session?.number
                  ? `${session.number} · ${session.context ?? ""}`
                  : "Start live capture to stream caller audio for 3s-chunk analysis"}
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
            {isLive ? "LIVE" : session?.captureState ?? "OFF"}
          </span>
        </div>
      </Card>

      {/* Live capture controls — real mic → AI-service WebSocket */}
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold">Realtime capture</p>
          <p className="text-[12px] text-text-secondary">
            {live.state === "live"
              ? `Streaming chunk #${live.latest?.sequence} · avg risk ${live.avgRisk} · ${live.chunks.length} chunks analyzed`
              : live.state === "connecting"
                ? "Requesting microphone and opening AI-service WebSocket…"
                : live.state === "error"
                  ? (live.error ?? "Capture failed")
                  : "Start your microphone to stream caller audio to the AI service and see live risk."}
          </p>
          {rtAlerts.connected && (
            <p className="mt-1 font-mono text-[11px] text-teal">supabase realtime: connected (alerts)</p>
          )}
          {rtAlerts.last && (
            <p className="mt-1 font-mono text-[11px] text-text-secondary">
              realtime event: {rtAlerts.last.event} on alerts
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {live.state === "live" || live.state === "connecting" ? (
            <button
              onClick={live.stop}
              className="inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
            >
              <Square className="size-4" /> Stop capture
            </button>
          ) : (
            <button
              onClick={live.start}
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              <Mic className="size-4" /> Start live capture
            </button>
          )}
        </div>
      </Card>

      {/* Threat banner */}
      <div
        className="flex flex-col gap-4 rounded-lg border-l-4 border-critical bg-[#2d1f1f] p-5 md:flex-row md:items-center"
        style={{ animation: "pulse-ring 3s ease-in-out infinite" }}
      >
        <TriangleAlert className="size-6 shrink-0 text-critical" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold">
            {risk >= 51 ? "ALERT: Possible AI-generated voice detected" : "Monitoring — no high-risk signal right now"}
          </p>
          <p className="text-[13px] text-text-secondary">
            Live risk {risk}/100 ({severity}) — model score, not a probability verdict
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
          <RiskMeter value={risk} />
          <p className="text-center text-[12px] text-text-secondary">
            {bandTag(riskBand(risk))} risk · composite of 4 detection signals
          </p>
          {isLive && (
            <p className="font-mono text-[11px] text-text-secondary">
              {live.chunks.length} live chunks · avg {live.avgRisk}
            </p>
          )}
        </Card>

        {/* Waveform + metrics */}
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold">Live Waveform</p>
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-teal">
                <CircleDot className="size-3.5" /> {isLive ? "streaming live mic" : "idle"} · 16kHz
              </span>
            </div>
            <Waveform live={isLive ? live.chunks.map((c) => c.risk / 100) : undefined} />
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <MetricCard
              title="Synthetic Voice Signal"
              hint="Anti-spoofing model score for this voice"
            >
              <div className="mb-2 font-mono text-[32px] font-bold text-critical">
                {isLive ? live.latest!.risk : session?.syntheticProbability ?? 0}%
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-elev/60">
                <div
                  className="h-full rounded-full bg-critical"
                  style={{ width: `${isLive ? live.latest!.risk : session?.syntheticProbability ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-text-disabled">
                Label: {session?.syntheticLabel ?? "UNCERTAIN"} · model aasist-l@1.4.0
              </p>
            </MetricCard>

            <MetricCard title="Speaker Similarity" hint="Match to known speaker profile">
              <div className="flex items-center justify-between">
                <CircularProgress value={session?.speakerSimilarity ?? 0} color={bandTone("HIGH")} />
                <p className="max-w-[9rem] text-right text-[12px] text-text-secondary">
                  Below the 80% trust threshold — flagged as mismatch.
                </p>
              </div>
            </MetricCard>

            <MetricCard title="Acoustic Anomaly" hint="Abnormal acoustic patterns detected">
              <div className="flex h-24 items-end gap-2">
                {(isLive ? live.chunks.slice(-8).map((c) => c.risk / 100) : acoustic).map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${Math.max(8, h * 100)}%`,
                      background: h > 0.8 ? "#ff3b3b" : "#00d97e",
                      transition: "height 300ms ease",
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
                    {session?.prosodyAnomaly ?? 0}
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
          { label: "Session", value: isLive ? "ACTIVE" : session?.sessionState ?? "IDLE" },
          { label: "Chunk Latency", value: live.latencyMs != null ? `${live.latencyMs}ms` : `${session?.chunkLatencyMs ?? 0}ms` },
          { label: "Queue Depth", value: String(session?.queueDepth ?? 0) },
          { label: "Chunk Sequence", value: isLive ? String(live.latest?.sequence ?? 0) : String(session?.chunkSequence ?? 0) },
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