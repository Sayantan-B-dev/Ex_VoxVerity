"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDot, Mic } from "lucide-react";
import { Card } from "./primitives";
import Waveform from "./Waveform";

/**
 * Joiner self-monitor (limited by design).
 *
 * Shows only this browser's OWN mic level - a small waveform + speaking state.
 * No risk data, no analysis, nothing sent anywhere: the audio is consumed
 * locally purely to show the person they are being heard. The creator's
 * dashboard does the real analysis of this voice.
 */
export default function SelfMonitor({
  stream,
  onLevel,
}: {
  stream?: MediaStream | null;
  /** Throttled voice level (0-1) for the call-card speaking indicator. */
  onLevel?: (amp: number) => void;
}) {
  const [waveform, setWaveform] = useState<number[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const refs = useRef<{ ctx?: AudioContext; proc?: ScriptProcessorNode; src?: MediaStreamAudioSourceNode }>({});

  useEffect(() => {
    if (!stream) return;
    let stopped = false;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx({ sampleRate: 16000 });
    refs.current.ctx = ctx;
    const src = ctx.createMediaStreamSource(stream);
    refs.current.src = src;
    const proc = ctx.createScriptProcessor(2048, 1, 1);
    refs.current.proc = proc;

    const ampWindow: number[] = [];
    let lastEmit = 0;
    proc.onaudioprocess = (e) => {
      if (stopped) return;
      const input = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);
      const amp = Math.min(1, Math.max(0, rms * 5));
      ampWindow.push(amp);
      if (ampWindow.length > 96) ampWindow.shift();
      setWaveform([...ampWindow]);
      setSpeaking(amp > 0.03);
      const now = Date.now();
      if (onLevel && now - lastEmit > 200) {
        lastEmit = now;
        onLevel(amp);
      }
    };

    src.connect(proc);
    // Not connected to destination: never re-route this mic to the speakers.
    return () => {
      stopped = true;
      try {
        proc.disconnect();
        ctx.close();
      } catch {
        /* noop */
      }
    };
  }, [stream, onLevel]);

  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mic className="size-4 text-teal" />
          <p className="text-[13px] font-semibold">Your mic (self monitor)</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ${
            speaking ? "bg-neon/15 text-neon" : "bg-elev text-text-disabled"
          }`}
        >
          <CircleDot className={`size-3 ${speaking ? "animate-pulse" : ""}`} />
          {speaking ? "SPEAKING" : "SILENT"}
        </span>
      </div>
      <Waveform samples={waveform} live={speaking} />
      <p className="mt-2 text-[11px] text-text-disabled">
        Local only - shows that your voice is being captured. The room host&apos;s dashboard analyzes
        this voice in 3s chunks; nothing extra leaves this browser.
      </p>
    </Card>
  );
}