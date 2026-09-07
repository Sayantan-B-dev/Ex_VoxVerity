"use client";

import { useEffect, useMemo, useState } from "react";

const COUNT = 64;

export default function Waveform({ live }: { live?: number[] }) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: COUNT }, () => 0.3),
  );

  // Real risk levels drive the bars directly (no extra render cycle).
  const rendered = useMemo(() => {
    if (live && live.length) {
      return Array.from({ length: COUNT }, (_, i) => {
        const v = live[i % live.length] ?? 0.3;
        return 0.12 + Math.min(1, v) * 0.88;
      });
    }
    return bars;
  }, [live, bars]);

  useEffect(() => {
    if (live && live.length) return; // live mode: no animation timer
    const id = setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const wave = Math.sin(Date.now() / 220 + i / 3) * 0.5 + 0.5;
          return 0.12 + wave * (0.4 + Math.random() * 0.55);
        }),
      );
    }, 90);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div className="relative flex h-[120px] items-center gap-[3px] overflow-hidden rounded-lg bg-[repeating-linear-gradient(90deg,transparent,transparent_23px,rgba(255,255,255,0.03)_24px)] px-4">
      {rendered.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h * 100}%`,
            background: "linear-gradient(180deg,#33b1ff,#0099ff)",
            transition: "height 90ms linear",
          }}
        />
      ))}
    </div>
  );
}
