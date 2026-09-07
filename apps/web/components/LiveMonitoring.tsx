"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDot, Loader2, ShieldQuestion, TriangleAlert, Mic, Square, Table } from "lucide-react";
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

function CircularProgress({ value, color, empty }: { value: number; color: string; empty?: boolean }) {
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
          stroke={empty ? "#2d3b54" : color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={empty ? c : c - (Math.max(0, Math.min(100, value)) / 100) * c}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <span className="absolute font-mono text-[20px] font-bold">{empty ? "-" : `${Math.round(value)}%`}</span>
    </div>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

export default function LiveMonitoring({
  session,
  autoStart,
  onChunk,
  remoteStream,
  subjectName,
  model,
  onLevel,
}: {
  session?: LiveSession;
  /** Start capture automatically on mount (creator side of a live call). */
  autoStart?: boolean;
  /** Fired per analyzed 3s chunk (server write-back in the caller flow). */
  onChunk?: (msg: Record<string, unknown>) => void;
  /** Peer audio (the person who joined) - analyze their voice, not this browser's mic. */
  remoteStream?: MediaStream | null;
  /** Display name of the person whose voice is being analyzed. */
  subjectName?: string;
  /** Client-selected analysis model id (sent with start_session). */
  model?: string;
  /** Live voice level (0-1) for the speaking indicator in the call card. */
  onLevel?: (amp: number) => void;
}) {
  const duration = useDuration(session?.durationSec ?? 0);
  const isRemote = Boolean(remoteStream);
  const subjectLabel = subjectName ?? (isRemote ? "the other person" : undefined);
  const lastLevelEmit = useRef(0);
  const live = useRealtimeMic({
    source: isRemote ? "remote_call_audio" : "microphone",
    stream: remoteStream,
    requireStream: isRemote,
    model,
    onResult: onChunk,
  });

  // Auto-start ONLY once the peer's audio has actually arrived over WebRTC.
  // The moment this component mounts (call active) the remote stream may still
  // be null - starting then would silently fall back to THIS browser's mic and
  // the dashboard would analyze the host's own voice instead of the caller's.
  useEffect(() => {
    if (!autoStart || live.state !== "idle") return;
    if (isRemote && !remoteStream) return; // wait for the caller's audio
    live.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, remoteStream]);
  // Emit the latest waveform amplitude as a throttled voice-level signal so the
  // call card can show a speaking indicator for the analyzed voice.
  useEffect(() => {
    if (!onLevel || !live.waveform.length) return;
    const now = Date.now();
    if (now - lastLevelEmit.current < 200) return;
    lastLevelEmit.current = now;
    onLevel(live.waveform[live.waveform.length - 1]);
  }, [live.waveform, onLevel]);
  const rtAlerts = useSupabaseTable("alerts");
  const isLive = live.state === "live" && live.latest !== null;
  const latest = live.latest;
  const risk = isLive ? latest.risk : session?.risk ?? 0;
  const severity = isLive ? latest.severity : session?.riskLevel ?? "LOW";

  // Real per-signal values from the latest analyzed chunk.
  const spoofScore = isLive ? latest.spoofScore : undefined; // 0-100 bona fide
  const spoofLabel = isLive ? latest.spoofLabel : session?.syntheticLabel ?? undefined;
  const spoofHeuristic = isLive ? latest.spoofFallback : false;
  const humanScore = isLive ? latest.humanScore : undefined; // 0-100 naturalness
  const humanDesc = isLive ? latest.humanDesc : undefined;
  const acoustic = isLive ? latest.acousticAnomaly : undefined; // 0-100 anomaly
  const acousticHistory = live.chunks
    .slice(-8)
    .map((c) => (c.acousticAnomaly ?? 0) / 100);
  const sim = isLive ? latest.speakerSimilarity : session?.speakerSimilarity;
  const simValue = sim ?? 0;

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
              {isLive && isRemote
                ? `Analyzing ${subjectLabel}'s voice`
                : isLive
                  ? "Live microphone capture"
                  : session?.caller ?? "No active session"}
            </h1>
            <p className="font-mono text-[13px] text-text-secondary">
              {isLive && isRemote
                ? `session ${live.sessionId?.slice(0, 8)} · ${subjectLabel} over WebRTC · 16kHz`
                : isLive
                  ? `session ${live.sessionId?.slice(0, 8)} · microphone · 16kHz`
                  : session?.number
                    ? `${session.number} · ${session.context ?? ""}`
                    : isRemote
                      ? "Waiting for the other person's audio stream to arrive…"
                      : "Start live capture to stream microphone audio for 3s-chunk analysis"}
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

      {/* Live capture controls - analyzed audio (mic or peer stream) → AI-service WebSocket */}
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold">{isRemote ? "Realtime voice analysis" : "Realtime capture"}</p>
          <p className="text-[12px] text-text-secondary">
            {live.state === "live"
              ? `Streaming ${isRemote ? `${subjectLabel}'s voice` : "your microphone"} · chunk #${latest?.sequence} · avg risk ${live.avgRisk} · ${live.chunks.length} chunks analyzed`
              : live.state === "connecting"
                ? isRemote
                  ? "Opening AI-service WebSocket for the other person's voice…"
                  : "Requesting microphone and opening AI-service WebSocket…"
                : live.state === "error"
                  ? (live.error ?? "Capture failed")
                  : isRemote
                    ? "Waiting for the other person's audio stream to arrive…"
                    : "Start your microphone to stream audio to the AI service and see live risk."}
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
              <Square className="size-4" /> Stop analysis
            </button>
          ) : isRemote && !remoteStream ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-[12px] text-text-secondary">
              <Loader2 className="size-3.5 animate-spin text-teal" /> waiting for remote audio…
            </span>
          ) : (
            <button
              onClick={live.start}
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              <Mic className="size-4" /> {isRemote ? "Start analysis" : "Start live capture"}
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
            {risk >= 51 ? "ALERT: Possible AI-generated voice detected" : "Monitoring - no high-risk signal right now"}
          </p>
          <p className="text-[13px] text-text-secondary">
            Live risk {risk}/100 ({severity}) - model score, not a probability verdict
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
              {live.chunks.length} live chunks · avg {live.avgRisk} · last {risk}/100
            </p>
          )}
          {isLive && latest?.noSpeech && (
            <p className="font-mono text-[11px] text-text-disabled">last chunk: no speech detected (silence gate)</p>
          )}
        </Card>

        {/* Waveform + metrics */}
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold">Live Waveform</p>
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-teal">
                <CircleDot className="size-3.5" />{" "}
                {isLive ? (isRemote ? `streaming ${subjectLabel}'s voice` : "streaming live mic") : "idle"} · 16kHz
              </span>
            </div>
            <Waveform samples={live.waveform} live={isLive} />
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <MetricCard
              title="Synthetic Voice Signal"
              hint="Anti-spoofing model score for this voice"
            >
              <div className="mb-2 font-mono text-[32px] font-bold text-critical">
                {spoofScore != null ? `${100 - spoofScore}%` : session?.syntheticProbability ?? 0}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-elev/60">
                <div
                  className="h-full rounded-full bg-critical"
                  style={{ width: `${spoofScore != null ? 100 - spoofScore : session?.syntheticProbability ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-text-disabled">
                Label: {spoofLabel ?? "UNCERTAIN"} · model aasist-l@1.4.0
                {spoofHeuristic ? " · heuristic mode (weights not loaded)" : ""}
              </p>
            </MetricCard>

            <MetricCard title="Speaker Similarity" hint="Match to the enrolled voiceprint">
              <div className="flex items-center justify-between">
                <CircularProgress
                  value={simValue * 100}
                  color={simValue >= 0.7 ? bandTone("HIGH") : simValue >= 0.5 ? "#f59e0b" : "#ff3b3b"}
                  empty={sim == null}
                />
                <p className="max-w-[9rem] text-right text-[12px] text-text-secondary">
                  {sim == null
                    ? "No voiceprint enrolled - run scripts/train_voiceprint.py to train one, then the dashboard scores similarity against YOUR voice."
                    : sim >= 0.7
                      ? `Matches the enrolled voiceprint${latest?.speakerName ? ` (${latest.speakerName})` : ""}.`
                      : sim >= 0.5
                        ? "Uncertain - close but below the 70% match threshold."
                        : "Does not match the enrolled voiceprint - possible different speaker."}
                </p>
              </div>
              {latest?.speakerMatch != null && (
                <p className="mt-2 font-mono text-[11px] text-text-secondary">
                  match: {latest.speakerMatch ? "YES" : "NO"} · confidence {latest.speakerConfidence ?? "none"}
                </p>
              )}
            </MetricCard>

            <MetricCard title="Acoustic Anomaly" hint="Abnormal acoustic patterns detected">
              <div className="flex h-24 items-end gap-2">
                {acousticHistory.length
                  ? acousticHistory.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${Math.max(6, h * 100)}%`,
                          background: h > 0.6 ? "#ff3b3b" : "#00d97e",
                          transition: "height 300ms ease",
                        }}
                      />
                    ))
                  : Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex-1 rounded-t bg-elev/60" style={{ height: "6%" }} />
                    ))}
              </div>
              <p className="mt-2 text-[11px] text-text-disabled">
                {acoustic != null ? `Anomaly ${acoustic}/100 · last ${live.chunks.length} chunks` : "Waiting for the first chunk…"}
              </p>
            </MetricCard>

            <MetricCard title="Prosody Anomaly" hint="Pitch, rhythm & stress pattern analysis">
              <div className="flex items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-full bg-warn/12">
                  <ShieldQuestion className="size-6 text-warn" />
                </div>
                <div>
                  <p className="font-mono text-[32px] font-bold leading-none text-warn">
                    {humanScore != null ? 100 - humanScore : session?.prosodyAnomaly ?? 0}
                  </p>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    {humanDesc ?? "Waiting for acoustic analysis…"}
                  </p>
                </div>
              </div>
            </MetricCard>
          </div>
        </div>
      </div>

      {/* All chunks in detail */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Table className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Chunk analysis detail</h2>
          <span className="ml-auto font-mono text-[11px] text-text-secondary">{live.chunks.length} chunks</span>
        </div>
        {live.chunks.length === 0 ? (
          <p className="text-[12px] text-text-secondary">
            No chunks analyzed yet - start live capture to see per-3s analysis.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-elev text-[10px] uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Spoof (bona fide)</th>
                  <th className="px-3 py-2">Speaker</th>
                  <th className="px-3 py-2">Acoustic</th>
                  <th className="px-3 py-2">Human pattern</th>
                  <th className="px-3 py-2">RMS</th>
                  <th className="px-3 py-2">Centroid</th>
                  <th className="px-3 py-2">Latency</th>
                </tr>
              </thead>
              <tbody>
                {[...live.chunks].reverse().map((c) => (
                  <tr key={c.sequence} className="border-t border-line/50 font-mono">
                    <td className="px-3 py-1.5 text-text-secondary">{c.sequence}</td>
                    <td className="px-3 py-1.5 text-text-secondary">{fmtTime(c.at)}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={
                          c.risk >= 51 ? "font-semibold text-critical" : c.risk >= 26 ? "text-warn" : "text-neon"
                        }
                      >
                        {c.risk}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{c.spoofScore != null ? `${c.spoofScore}%` : "-"}</td>
                    <td className="px-3 py-1.5">
                      {c.speakerSimilarity != null ? (
                        <span className={c.speakerMatch ? "text-neon" : "text-warn"}>
                          {(c.speakerSimilarity * 100).toFixed(0)}%{c.noSpeech ? " · silence" : ""}
                        </span>
                      ) : c.noSpeech ? (
                        "- · silence"
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-1.5">{c.acousticAnomaly != null ? `${c.acousticAnomaly}` : "-"}</td>
                    <td className="px-3 py-1.5">{c.humanScore != null ? `${c.humanScore}%` : "-"}</td>
                    <td className="px-3 py-1.5">{c.rms != null ? c.rms.toFixed(3) : "-"}</td>
                    <td className="px-3 py-1.5">{c.spectralCentroid != null ? `${Math.round(c.spectralCentroid)} Hz` : "-"}</td>
                    <td className="px-3 py-1.5">{c.latencyMs != null ? `${c.latencyMs} ms` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Session health footer */}
      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {[
          { label: "Session", value: isLive ? "ACTIVE" : session?.sessionState ?? "IDLE" },
          { label: "Chunk Latency", value: live.latencyMs != null ? `${live.latencyMs}ms` : `${session?.chunkLatencyMs ?? 0}ms` },
          { label: "Chunks Analyzed", value: String(isLive ? live.chunks.length : session?.chunkSequence ?? 0) },
          { label: "Chunk Sequence", value: isLive ? String(latest?.sequence ?? 0) : String(session?.chunkSequence ?? 0) },
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