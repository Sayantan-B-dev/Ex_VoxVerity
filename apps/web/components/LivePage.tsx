"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Check,
  ChartColumn,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  Users,
  X,
} from "lucide-react";
import { Card } from "./primitives";
import LiveMonitoring from "./LiveMonitoring";
import MicPicker from "./MicPicker";
import SelfMonitor from "./SelfMonitor";
import { usePresence } from "@/lib/presence";
import { useCall } from "@/lib/call";
import { useModelPreference } from "@/lib/model-settings";
import { formatDuration } from "@/lib/format";

function useElapsed(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) {
      setS(0);
      return;
    }
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

export default function LivePage() {
  const { data: session } = useSession();
  const selfId = session?.user?.id;
  const { users, loading } = usePresence(selfId);
  const selfName = session?.user?.name ?? session?.user?.email ?? "User";
  const [micDeviceId, setMicDeviceId] = useState("");
  const call = useCall(selfId ? { id: selfId, name: selfName } : undefined, { micDeviceId });
  const audioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<string | undefined>(undefined);
  callIdRef.current = call.callId;

  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [model] = useModelPreference();

  // Per-call chunk log (creator side) → call summary after hangup.
  const [chunkLog, setChunkLog] = useState<Record<string, unknown>[]>([]);
  const logCallIdRef = useRef<string | undefined>(undefined);
  // Voice levels for the speaking indicators (creator monitors the joiner;
  // the joiner monitors their own mic).
  const [peerLevel, setPeerLevel] = useState(0);
  const [selfLevel, setSelfLevel] = useState(0);

  // Keep the hidden audio element bound to the remote stream - the host hears
  // the caller. That same remote stream is what the host's dashboard analyzes
  // (the caller's voice, never the host's own mic).
  useEffect(() => {
    if (audioRef.current && call.remoteStream) audioRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  // Presence reflects call state so others see "in a call".
  useEffect(() => {
    if (!selfId) return;
    fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: call.status === "active" ? "in_call" : "online" }),
    }).catch(() => undefined);
  }, [selfId, call.status]);

  // Every analyzed 3s chunk of the JOINED person's voice (received over WebRTC)
  // → server-side risk write-back + local accumulation for the call summary.
  const onChunk = (msg: Record<string, unknown>) => {
    const callId = callIdRef.current;
    if (!callId) return;
    if (logCallIdRef.current !== callId) {
      logCallIdRef.current = callId;
      setChunkLog([]);
    }
    setChunkLog((prev) => [...prev.slice(-999), msg]);
    void fetch("/api/risk-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: callId, result: msg }),
    }).catch(() => undefined);
  };

  const elapsed = useElapsed(call.status === "active");
  const showRoomControls = call.status === "idle" || call.status === "ended" || call.status === "failed";

  const monitoredSpeaking = (call.isHost ? peerLevel : selfLevel) > 0.03;

  // Roll-up of the analyzed chunks for the post-call summary.
  const summary = useMemo(() => {
    if (!chunkLog.length) return null;
    const num = (v: unknown) => (typeof v === "number" ? v : undefined);
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const risks = chunkLog.map((r) => num((r.risk as { score?: unknown } | undefined)?.score) ?? 0);
    const spoofs = chunkLog
      .map((r) => num((r.spoof_detection as { normalized_score?: unknown } | undefined)?.normalized_score))
      .filter((v): v is number => v != null);
    const sims = chunkLog
      .map((r) => num((r.speaker_verification as { similarity?: unknown } | undefined)?.similarity))
      .filter((v): v is number => v != null);
    const acoustics = chunkLog.map((r) => num(r.acoustic_anomaly)).filter((v): v is number => v != null);
    const highChunks = risks.filter((r) => r >= 51).length;
    return {
      chunks: chunkLog.length,
      avgRisk: avg(risks) ?? 0,
      maxRisk: Math.max(...risks),
      highChunks,
      avgSpoof: avg(spoofs),
      avgSim: sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : null,
      avgAcoustic: avg(acoustics),
    };
  }, [chunkLog]);

  async function copyCode() {
    if (!call.roomCode) return;
    try {
      await navigator.clipboard.writeText(call.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable - user can copy manually */
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* hidden audio element for the caller's voice on the receiver side */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
            <Radio className="size-6 text-teal" /> Live Monitor
          </h1>
          <p className="text-[13px] text-text-secondary">
            Protected browser-to-browser calls. Create a room, share the code, and the person who
            joins gets their voice integrity-checked in real time on your dashboard.
          </p>
        </div>
        {call.status === "active" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-neon/12 px-3 py-1.5 font-mono text-[12px] font-semibold text-neon">
            <span className="size-2 animate-pulse rounded-full bg-neon" />
            {call.isHost
              ? `MONITORING ${(call.peer?.name ?? "THE CALLER").toUpperCase()}'S VOICE`
              : "YOUR VOICE IS BEING ANALYZED"} · {formatDuration(elapsed)}
          </span>
        )}
      </div>

      {/* Room controls */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Phone className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Protected call rooms</h2>
        </div>

        {/* Mic selection - each browser picks its own input device */}
        <div className="mb-4 flex flex-col gap-1.5 rounded-xl border border-line bg-elev px-4 py-3">
          <p className="text-[12px] font-semibold">Your microphone</p>
          <MicPicker value={micDeviceId} onChange={setMicDeviceId} />
          <p className="text-[11px] text-text-disabled">
            Applies when the call starts. Pick distinct mics when testing two browsers on one PC.
          </p>
        </div>

        {showRoomControls && (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create */}
            <div className="rounded-xl border border-line bg-elev p-5">
              <p className="text-[13px] font-semibold">Create a room</p>
              <p className="mt-1 text-[12px] text-text-secondary">
                Spin up a protected room and get a 6-character code to share with the person you want to talk to.
              </p>
              <button
                onClick={() => void call.createRoom()}
                disabled={call.status !== "idle"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                <Phone className="size-4" /> Create room
              </button>
            </div>

            {/* Join */}
            <div className="rounded-xl border border-line bg-elev p-5">
              <p className="text-[13px] font-semibold">Join with code</p>
              <p className="mt-1 text-[12px] text-text-secondary">
                Someone shared a room code with you? Enter it below to join their protected call.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="K7F2P9"
                  className="w-full rounded-lg border border-line bg-black/40 px-3 py-2.5 font-mono text-[14px] uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-text-disabled focus:border-teal/60"
                />
                <button
                  onClick={() => void call.joinRoom(joinCode)}
                  disabled={joinCode.length !== 6 || call.status !== "idle"}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:bg-teal/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Phone className="size-4" /> Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for a peer - show the code (creator) or joining state (joiner) */}
        {call.status === "calling" && (
          <div className="flex flex-col items-center rounded-xl border border-teal/30 bg-teal/5 p-6 text-center">
            {call.isHost ? (
              <>
                <p className="text-[12px] uppercase tracking-widest text-text-secondary">Your room code</p>
                <p className="mt-2 font-mono text-[42px] font-bold leading-none tracking-[0.3em] text-teal">
                  {call.roomCode}
                </p>
                <p className="mt-3 text-[12px] text-text-secondary">
                  Share this code - the caller joins from Live Monitor → “Join with code”, and their
                  voice is integrity-checked on your dashboard.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => void copyCode()}
                    className="inline-flex items-center gap-2 rounded-lg border border-teal/40 bg-teal/15 px-4 py-2 text-[13px] font-semibold text-teal transition-colors hover:bg-teal/25"
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copied" : "Copy code"}
                  </button>
                  <button
                    onClick={call.hangup}
                    className="inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
                  >
                    <PhoneOff className="size-4" /> Cancel room
                  </button>
                </div>
                <p className="mt-4 flex items-center gap-2 text-[12px] text-text-secondary">
                  <Loader2 className="size-3.5 animate-spin text-teal" /> Waiting for someone to join…
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold">Joining room {call.roomCode}…</p>
                <p className="mt-1 flex items-center gap-2 text-[12px] text-text-secondary">
                  <Loader2 className="size-3.5 animate-spin text-teal" /> Connecting to the caller…
                </p>
                <button
                  onClick={call.hangup}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
                >
                  <PhoneOff className="size-4" /> Cancel
                </button>
              </>
            )}
          </div>
        )}

        {(call.status === "failed" || call.status === "ended") && call.error && (
          <p className="mt-4 text-[12px] text-critical">{call.error}</p>
        )}
      </Card>

      {/* Active call - hang up + analysis panel */}
      {call.status === "active" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-teal/15 text-teal">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {call.isHost
                  ? call.peer
                    ? `Monitoring ${call.peer.name}'s call`
                    : "On call - caller connected"
                  : `On call with ${call.peer?.name ?? "room host"}`}
                <span
                  className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    monitoredSpeaking ? "bg-neon/15 text-neon" : "bg-elev text-text-disabled"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${monitoredSpeaking ? "animate-pulse bg-neon" : "bg-text-disabled/50"}`}
                  />
                  {call.isHost
                    ? monitoredSpeaking
                      ? "CALLER SPEAKING"
                      : "CALLER SILENT"
                    : monitoredSpeaking
                      ? "YOU'RE SPEAKING"
                      : "YOU'RE SILENT"}
                </span>
              </p>
              <p className="font-mono text-[12px] text-text-secondary">
                {call.isHost
                  ? `Analyzing the caller's voice in 3s chunks - your own mic only feeds the call, never analyzed.`
                  : "Your voice is being analyzed by the room host in 3s chunks - your mic also feeds the call audio."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={call.toggleMute}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors ${
                call.muted
                  ? "border-warn/60 bg-warn/15 text-warn hover:bg-warn/25"
                  : "border-line bg-elev text-text-primary hover:border-white/25"
              }`}
            >
              {call.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              {call.muted ? "Unmute mic" : "Mute mic"}
            </button>
            <button
              onClick={call.hangup}
              className="inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
            >
              <PhoneOff className="size-4" /> Hang up
            </button>
          </div>
        </Card>
      )}

      {/* Host-side analysis - analyzes the CALLER's voice (their remote WebRTC
          stream), never the host's own microphone. */}
      {call.isHost && call.status === "active" && (
        <LiveMonitoring
          autoStart
          remoteStream={call.remoteStream}
          subjectName={call.peer?.name}
          onChunk={onChunk}
          model={model}
          onLevel={setPeerLevel}
        />
      )}

      {/* Caller self-monitor (limited) - their own mic level only, nothing analyzed here. */}
      {!call.isHost && call.status === "active" && (
        <SelfMonitor stream={call.localStream} onLevel={setSelfLevel} />
      )}

      {/* Call summary after hangup (host side) */}
      {call.isHost && call.status === "ended" && summary && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChartColumn className="size-5 text-teal" />
              <h2 className="text-[17px] font-semibold">Call summary</h2>
              <span className="font-mono text-[11px] text-text-secondary">
                ≈{formatDuration(summary.chunks * 3)} analyzed · {(call.peer?.name ?? "the caller")}&apos;s voice
              </span>
            </div>
            <button
              onClick={() => setChunkLog([])}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <X className="size-3.5" /> Dismiss
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Chunks analyzed", value: String(summary.chunks) },
              {
                label: "Avg risk",
                value: `${summary.avgRisk}/100`,
                tone: summary.avgRisk >= 51 ? "text-critical" : summary.avgRisk >= 26 ? "text-warn" : "text-neon",
              },
              {
                label: "Peak risk",
                value: `${summary.maxRisk}/100`,
                tone: summary.maxRisk >= 51 ? "text-critical" : "text-text-primary",
              },
              { label: "HIGH+ chunks", value: String(summary.highChunks) },
              {
                label: "Avg speaker match",
                value: summary.avgSim != null ? `${(summary.avgSim * 100).toFixed(0)}%` : "no voiceprint",
                tone: summary.avgSim != null && summary.avgSim >= 0.7 ? "text-neon" : "text-text-primary",
              },
              {
                label: "Avg spoof (bona fide)",
                value: summary.avgSpoof != null ? `${summary.avgSpoof}%` : "-",
              },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[11px] uppercase tracking-wide text-text-disabled">{m.label}</p>
                <p className={`mt-0.5 font-mono text-[15px] font-semibold ${m.tone ?? "text-text-primary"}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-text-secondary">
            {summary.avgSim != null && summary.avgSim < 0.7
              ? "The joined person's voice did not match the enrolled voiceprint - flag for review."
              : summary.avgRisk >= 51
                ? "High-risk call - review the alerts and create an incident if needed."
                : "No high-risk signal during this call."}
          </p>
        </Card>
      )}

      {/* Who's online */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Online now</h2>
            <span className="inline-flex items-center gap-1 rounded bg-neon/15 px-1.5 py-0.5 text-[10px] font-semibold text-neon">
              <span className="size-1.5 rounded-full bg-neon" style={{ animation: "pulse-ring 1.5s infinite" }} />
              {users.length} online
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-[12px] text-text-secondary">Checking presence…</p>
        ) : users.length === 0 ? (
          <p className="text-[12px] text-text-secondary">
            No one is online right now. Presence updates every 15 seconds.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const isSelf = u.app_user_id === selfId;
              const initial = (u.name[0] ?? "?").toUpperCase();
              return (
                <div
                  key={u.app_user_id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-elev p-4"
                >
                  <div className="relative">
                    <div className="grid size-10 place-items-center rounded-full border border-teal/40 bg-teal/15 text-sm font-bold text-teal">
                      {initial}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
                        u.status === "in_call" ? "bg-warn" : "bg-neon"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">
                      {u.name} {isSelf && <span className="text-[11px] font-normal text-text-disabled">(you)</span>}
                    </p>
                    <p className="truncate text-[11px] text-text-secondary">
                      {u.role} · {u.status === "in_call" ? "in a call" : "available"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}