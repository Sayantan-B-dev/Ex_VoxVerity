"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to a Supabase table in realtime (postgres_changes).
 * Uses anon key (read policies from migration 003). Returns latest payload.
 */
export function useSupabaseTable<T = Record<string, unknown>>(
  table: string,
  opts?: { event?: "*" | "INSERT" | "UPDATE" | "DELETE"; filter?: string }
) {
  const [last, setLast] = useState<{ event: string; row: T } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`vox-${table}`)
        .on(
          // @ts-expect-error supabase-ssr typing for postgres_changes filter
          "postgres_changes",
          {
            event: opts?.event ?? "*",
            schema: "public",
            table,
            ...(opts?.filter ? { filter: opts.filter } : {}),
          },
          (payload: { eventType: string; new: T }) =>
            setLast({ event: payload.eventType, row: payload.new })
        )
        .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    } catch {
      // Initial state is already disconnected; nothing to set here.
    }
    return () => {
      try {
        channel?.unsubscribe();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  return { last, connected };
}

/**
 * One analyzed 3s chunk with the full per-signal metrics the AI service
 * returns in its `analysis_complete` payload.
 */
export interface LiveChunk {
  sequence: number;
  risk: number;
  severity: string;
  at: string;
  /** 0-100 bona fide score (higher = more natural). */
  spoofScore?: number;
  spoofLabel?: string;
  /** true when the anti-spoof model weights are not loaded (heuristic mode). */
  spoofFallback?: boolean;
  /** 0-100 acoustic naturalness (higher = more natural). */
  humanScore?: number;
  humanDesc?: string;
  humanQuality?: string;
  /** 0-100 acoustic anomaly (higher = more anomalous). */
  acousticAnomaly?: number;
  /** 0-1 cosine similarity to the enrolled voiceprint. */
  speakerSimilarity?: number;
  speakerMatch?: boolean;
  speakerConfidence?: string;
  speakerName?: string;
  /** true when the chunk contained no speech (silence gate). */
  noSpeech?: boolean;
  dsp?: Record<string, number>;
  rms?: number;
  spectralCentroid?: number;
  latencyMs?: number;
}

/** Deterministic acoustic-anomaly mirror of the AI-service risk engine. */
function computeAcousticAnomaly(
  dsp: Record<string, number> | undefined,
  quality: Record<string, unknown> | undefined
): number | undefined {
  if (!dsp || Object.keys(dsp).length === 0) return undefined;
  let score = 0;
  let factors = 0;
  if (quality?.clipping_detected) { score += 80; factors += 1; }
  if (quality?.low_energy) { score += 60; factors += 1; }
  const silence = dsp.silence_ratio ?? 0;
  if (silence > 0.8) { score += 70; factors += 1; }
  else if (silence > 0.6) { score += 40; factors += 1; }
  if (quality?.very_short) { score += 50; factors += 1; }
  const dr = dsp.dynamic_range_db ?? 0;
  if (dr > 50 || dr < 5) { score += 40; factors += 1; }
  if (factors === 0) return 10;
  return Math.min(100, Math.round(score / factors));
}

/**
 * Live audio capture → AI-service realtime WebSocket.
 * Downsamples audio to 16kHz mono PCM, sends base64 chunks every ~3s, surfaces
 * the full per-chunk analysis (risk, spoof, human pattern, acoustic anomaly,
 * dsp) plus a rolling buffer of REAL amplitudes for the waveform.
 *
 * By default it captures this browser's microphone. Pass `stream` (e.g. the
 * peer's WebRTC remote stream) to analyze someone else's voice instead - the
 * dashboard side of a call analyzes the person who joined, not the creator.
 */
export function useRealtimeMic(opts?: {
  source?: string;
  chunkMs?: number;
  /** External audio source to analyze instead of this browser's mic. */
  stream?: MediaStream | null;
  /** When true, `stream` is mandatory - never fall back to this browser's mic. */
  requireStream?: boolean;
  /** Client-selected analysis model (sent with start_session). */
  model?: string;
  /** Fired with each analysis result so the caller can persist/recompute risk server-side. */
  onResult?: (msg: Record<string, unknown>) => void;
}) {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error" | "stopped">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<LiveChunk[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  /** Rolling real-amplitude buffer (0..1) for the live waveform. */
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<{
    ws?: WebSocket;
    ctx?: AudioContext;
    proc?: ScriptProcessorNode;
    stream?: MediaStream;
    /** True when `stream` was provided externally (peer audio) - never stop its tracks. */
    external?: boolean;
    seq?: number;
    sentAt?: Map<number, number>;
  }>({});

  async function start() {
    setError(null);
    setChunks([]);
    setWaveform([]);
    setState("connecting");
    try {
      const { aiRealtimeWsUrl, floatToPcm16Base64 } = await import("@/lib/ai-service");
      const id = crypto.randomUUID();
      setSessionId(id);

      // Fetch a short-lived WS auth token from the Next.js server.
      let wsToken = "";
      try {
        const tokRes = await fetch("/api/ws-token", { method: "POST" });
        if (tokRes.ok) {
          const tokData = await tokRes.json();
          wsToken = tokData.token ?? "";
        }
      } catch {
        // Token fetch failed - connect without token (dev mode fallback).
      }

      const ws = new WebSocket(aiRealtimeWsUrl(id, wsToken));
      refs.current.ws = ws;
      refs.current.seq = 0;
      refs.current.sentAt = new Map();

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "hello" }));
        ws.send(JSON.stringify({ type: "start_session", source: opts?.source ?? "microphone", model: opts?.model ?? "aasist_voiceprint" }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "analysis_complete" && msg.result) {
            const r = msg.result;
            opts?.onResult?.(r as Record<string, unknown>);

            const risk = r.risk?.score ?? r.risk_score ?? 0;
            const severity = r.risk?.severity ?? r.risk_severity ?? "LOW";
            const dsp = (r.dsp_metrics ?? {}) as Record<string, number>;
            const spoof = r.spoof_detection as
              | { normalized_score?: number; severity_label?: string; fallback?: boolean }
              | undefined;
            const human = r.human_pattern as
              | { score?: number; description?: string; quality?: string }
              | undefined;
            const acoustic =
              (r.acoustic_anomaly as number | undefined) ??
              computeAcousticAnomaly(dsp, r.quality_flags as Record<string, unknown> | undefined);
            const spk = r.speaker_verification as
              | { similarity?: number; match?: boolean; confidence?: string; enrolled_name?: string }
              | undefined;
            const noSpeech = r.no_speech === true;

            const seq = r.sequence as number | undefined;
            const latency =
              seq != null && refs.current.sentAt?.has(seq)
                ? Date.now() - (refs.current.sentAt.get(seq) ?? Date.now())
                : undefined;
            if (latency != null) setLatencyMs(latency);

            setChunks((prev) => [
              ...prev.slice(-199),
              {
                sequence: seq ?? prev.length + 1,
                risk,
                severity,
                at: new Date().toISOString(),
                spoofScore: spoof?.normalized_score,
                spoofLabel: spoof?.severity_label,
                spoofFallback: spoof?.fallback,
                humanScore: human?.score,
                humanDesc: human?.description,
                humanQuality: human?.quality,
                acousticAnomaly: acoustic,
                speakerSimilarity: spk?.similarity,
                speakerMatch: spk?.match,
                speakerConfidence: spk?.confidence,
                speakerName: spk?.enrolled_name,
                noSpeech,
                dsp,
                rms: dsp.rms_energy,
                spectralCentroid: dsp.spectral_centroid_hz,
                latencyMs: latency,
              },
            ]);
            setState("live");
          } else if (msg.type === "ack") {
            const seq = msg.sequence as number | undefined;
            if (seq != null && refs.current.sentAt?.has(seq)) {
              setLatencyMs(Date.now() - (refs.current.sentAt.get(seq) ?? Date.now()));
            }
            setState("live");
          } else if (msg.type === "server_error") {
            setError(msg.message ?? "Realtime error");
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onerror = () => {
        setError("Realtime WebSocket failed - is the AI service running on :8000?");
        setState("error");
      };
      ws.onclose = () => {
        if (refs.current.ws === ws) setState((s) => (s === "live" ? "stopped" : s));
      };

      // Audio source: this browser's mic, or an external stream (peer voice).
      const external = opts?.stream ?? null;
      if (!external) {
        if (opts?.requireStream) {
          // Never analyze this browser's mic when a peer stream is required.
          setError("The caller's audio stream is not available yet - waiting…");
          setState("error");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        refs.current.stream = stream;
        refs.current.external = false;
      } else {
        refs.current.stream = external;
        refs.current.external = true;
      }
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 16000 });
      refs.current.ctx = ctx;
      const src = ctx.createMediaStreamSource(refs.current.stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      refs.current.proc = proc;
      let buffer: Float32Array[] = [];
      let bufferedSamples = 0;
      const targetSamples = 16000 * ((opts?.chunkMs ?? 3000) / 1000);

      // Rolling real-amplitude buffer: one RMS point per ~64ms of audio.
      const ampWindow: number[] = [];

      proc.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);

        // Real waveform amplitude (RMS of this 256ms buffer slice).
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        const amp = Math.min(1, Math.max(0, rms * 5)); // scale to visible range
        ampWindow.push(amp);
        if (ampWindow.length > 180) ampWindow.shift(); // ~11s of history
        setWaveform([...ampWindow]);

        buffer.push(new Float32Array(input));
        bufferedSamples += input.length;
        if (bufferedSamples >= targetSamples && ws.readyState === WebSocket.OPEN) {
          const out = new Float32Array(bufferedSamples);
          let off = 0;
          for (const b of buffer) {
            out.set(b, off);
            off += b.length;
          }
          buffer = [];
          bufferedSamples = 0;
          const seq = (refs.current.seq = (refs.current.seq ?? 0) + 1);
          refs.current.sentAt?.set(seq, Date.now());
          ws.send(
            JSON.stringify({
              type: "audio_chunk",
              sequence: seq,
              audio_b64: floatToPcm16Base64(out),
              encoding: "pcm_s16le",
              sample_rate: 16000,
            })
          );
        }
      };
      src.connect(proc);
      // Only route the local mic to speakers (monitor path). External peer audio
      // is already played by the <audio> element - routing it again would double it.
      if (!refs.current.external) proc.connect(ctx.destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start capture");
      setState("error");
    }
  }

  function stop() {
    try {
      refs.current.ws?.send(JSON.stringify({ type: "stop_session" }));
      refs.current.ws?.close();
    } catch {
      /* noop */
    }
    try {
      refs.current.proc?.disconnect();
      refs.current.ctx?.close();
      // Never stop external stream tracks - they belong to the peer call and the
      // <audio> element still needs them (useCall's cleanup handles stopping).
      if (!refs.current.external) {
        refs.current.stream?.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* noop */
    }
    setState("stopped");
  }

  useEffect(() => () => stop(), []);

  const latest = chunks[chunks.length - 1] ?? null;
  const avgRisk = chunks.length ? Math.round(chunks.reduce((a, c) => a + c.risk, 0) / chunks.length) : 0;

  return { state, sessionId, chunks, latest, avgRisk, latencyMs, waveform, error, start, stop };
}