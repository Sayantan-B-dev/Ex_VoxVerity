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
 * Live mic capture → AI-service realtime WebSocket.
 * Downsamples mic to 16kHz mono PCM, sends base64 chunks every ~3s,
 * surfaces per-chunk analysis (risk, dsp) for visualization.
 */
export interface LiveChunk {
  sequence: number;
  risk: number;
  severity: string;
  rms?: number;
  spectralCentroid?: number;
  at: string;
}

export function useRealtimeMic(opts?: {
  source?: string;
  chunkMs?: number;
  /** Fired with each analysis result so the caller can persist/recompute risk server-side. */
  onResult?: (msg: Record<string, unknown>) => void;
}) {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error" | "stopped">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<LiveChunk[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<{ ws?: WebSocket; ctx?: AudioContext; proc?: ScriptProcessorNode; stream?: MediaStream; seq?: number; timer?: number }>({});

  async function start() {
    setError(null);
    setChunks([]);
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
        // Token fetch failed — connect without token (dev mode fallback).
      }

      const ws = new WebSocket(aiRealtimeWsUrl(id, wsToken));
      refs.current.ws = ws;
      refs.current.seq = 0;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "hello" }));
        ws.send(JSON.stringify({ type: "start_session", source: opts?.source ?? "microphone" }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "analysis_complete" || msg.type === "risk_update" || msg.result) {
            const r = msg.result ?? msg;
            opts?.onResult?.(r as Record<string, unknown>);
            const risk = r.risk?.score ?? r.risk_score ?? 0;
            const severity = r.risk?.severity ?? r.risk_severity ?? "LOW";
            setChunks((prev) => [
              ...prev.slice(-59),
              {
                sequence: r.sequence ?? prev.length,
                risk,
                severity,
                rms: r.dsp_metrics?.rms_energy,
                spectralCentroid: r.dsp_metrics?.spectral_centroid_hz,
                at: new Date().toISOString(),
              },
            ]);
            setState("live");
          } else if (msg.type === "ack") {
            if (msg.received_at && msg.sequence != null) setLatencyMs(Date.now() - refs.current.seq! * 0);
            setState("live");
          } else if (msg.type === "server_error") {
            setError(msg.message ?? "Realtime error");
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onerror = () => {
        setError("Realtime WebSocket failed — is the AI service running on :8000?");
        setState("error");
      };
      ws.onclose = () => {
        if (refs.current.ws === ws) setState((s) => (s === "live" ? "stopped" : s));
      };

      // Mic capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.current.stream = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: 16000 });
      refs.current.ctx = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      refs.current.proc = proc;
      let buffer: Float32Array[] = [];
      let bufferedSamples = 0;
      const targetSamples = 16000 * ((opts?.chunkMs ?? 3000) / 1000);
      proc.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
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
      proc.connect(ctx.destination);
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
      refs.current.stream?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    setState("stopped");
  }

  useEffect(() => () => stop(), []);

  const latest = chunks[chunks.length - 1] ?? null;
  const avgRisk = chunks.length ? Math.round(chunks.reduce((a, c) => a + c.risk, 0) / chunks.length) : 0;

  return { state, sessionId, chunks, latest, avgRisk, latencyMs, error, start, stop };
}
