"use client";

import { useEffect, useState } from "react";

// Segmented radial tick gauge (Kyntra-style): a full ring of thin ticks
// colored red -> amber -> green, with the portion up to `value` lit and
// the remainder dimmed. Center shows the headline number.
export default function RiskMeter({
  value,
  size = 260,
  centerValue,
  centerLabel,
}: {
  value: number;
  size?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const ticks = 68;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setLit(value), 150);
    return () => clearTimeout(t);
  }, [value]);

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 6;
  const inner = outer - 16;
  const gapDeg = 62; // gap at the bottom
  const span = 360 - gapDeg;
  const start = 90 + gapDeg / 2;

  // color ramp across the arc: green -> yellow -> orange -> red as risk grows
  const colorAt = (p: number) => {
    // p 0..1 along arc == 0..100 risk
    const hue = 145 - p * 145; // 145(green) -> 0(red)
    return `hsl(${hue} 85% 55%)`;
  };

  const activeCount = Math.round((lit / 100) * ticks);

  const rad = (d: number) => (d * Math.PI) / 180;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        {Array.from({ length: ticks }).map((_, i) => {
          const p = i / (ticks - 1);
          const ang = start + p * span;
          const x1 = cx + inner * Math.cos(rad(ang));
          const y1 = cy + inner * Math.sin(rad(ang));
          const x2 = cx + outer * Math.cos(rad(ang));
          const y2 = cy + outer * Math.sin(rad(ang));
          const on = i < activeCount;
          const color = colorAt(p);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={on ? 1 : 0.14}
              style={{
                transition: "opacity 500ms ease",
                transitionDelay: `${i * 8}ms`,
                filter: on ? `drop-shadow(0 0 3px ${color})` : "none",
              }}
            />
          );
        })}
        {/* quadrant marker dots */}
        {[0, 0.5, 1].map((p, i) => {
          const ang = start + p * span;
          const r = outer + 8;
          return (
            <circle
              key={i}
              cx={cx + r * Math.cos(rad(ang))}
              cy={cy + r * Math.sin(rad(ang))}
              r={2.4}
              fill={colorAt(p)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="dot text-[46px] leading-none text-text-primary">
          {centerValue ?? value}
        </span>
        <span className="mt-1 text-[12px] uppercase tracking-[0.18em] text-text-secondary">
          {centerLabel ?? "Risk Score"}
        </span>
      </div>
    </div>
  );
}