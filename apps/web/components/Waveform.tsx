"use client";

import { useMemo } from "react";

const COUNT = 96;

/**
 * Real-amplitude waveform. `samples` is a rolling buffer of 0..1 mic
 * amplitudes (RMS per ~64ms frame) from the capture pipeline. When no samples
 * exist the bar sits on a flat baseline — no fabricated animation.
 */
export default function Waveform({ samples, live }: { samples?: number[]; live?: boolean }) {
  const rendered = useMemo(() => {
    if (samples && samples.length) {
      // Map the rolling buffer onto the bar count, keeping the most recent.
      return Array.from({ length: COUNT }, (_, i) => {
        const idx = samples.length - COUNT + i;
        const v = idx >= 0 ? samples[idx] ?? 0 : 0;
        return 0.06 + Math.min(1, v) * 0.9;
      });
    }
    return Array.from({ length: COUNT }, () => 0.06);
  }, [samples]);

  return (
    <div className="relative flex h-[120px] items-center gap-[3px] overflow-hidden rounded-lg bg-[repeating-linear-gradient(90deg,transparent,transparent_23px,rgba(255,255,255,0.03)_24px)] px-4">
      {rendered.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h * 100}%`,
            background: live
              ? "linear-gradient(180deg,#33b1ff,#0099ff)"
              : "linear-gradient(180deg,#33b1ff55,#0099ff33)",
            transition: "height 90ms linear",
          }}
        />
      ))}
    </div>
  );
}