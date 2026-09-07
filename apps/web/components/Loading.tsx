"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const steps = [
  "Initializing secure session",
  "Loading threat models",
  "Syncing live telemetry",
  "Calibrating risk engine",
];

export default function Loading({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => {
        if (p >= 100) {
          clearInterval(id);
          if (onDone) setTimeout(onDone, 350);
          return 100;
        }
        return Math.min(100, p + Math.random() * 9 + 4);
      });
    }, 130);
    return () => clearInterval(id);
  }, [onDone]);

  const step = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));

  return (
    <div className="relative grid h-full min-h-[60vh] place-items-center overflow-hidden bg-black text-text-primary">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(53,214,193,0.14), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <div className="relative grid size-24 place-items-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-teal/20 border-t-teal"
            style={{ animation: "sonar 1s linear infinite" }}
          />
          <Image
            src="/brand/voxverity/voxverity-symbol.png"
            alt="VoxVerity logo"
            width={36}
            height={36}
            className="size-9 object-contain"
            priority
          />
        </div>

        <h1 className="mt-6 text-[22px] font-bold tracking-tight">VOXVERITY</h1>
        <p className="text-[12px] uppercase tracking-[0.3em] text-text-secondary">
          Voice Integrity Platform
        </p>

        <div className="mt-8 w-64">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-teal transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-text-secondary">
            <span>{steps[step]}…</span>
            <span className="dot text-[14px] text-teal">{Math.round(pct)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}