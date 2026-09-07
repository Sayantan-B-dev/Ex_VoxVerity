import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// A small "?" with a plain-language explanation on hover/focus — helps newcomers.
export function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        tabIndex={0}
        aria-label={text}
        className="text-text-disabled transition-colors hover:text-teal focus:text-teal focus:outline-none"
      >
        <HelpCircle className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 rounded-lg border border-line bg-elev px-3 py-2 text-[12px] leading-relaxed text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function Card({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-line bg-card transition-colors duration-200 hover:border-white/15",
        className,
      )}
      style={
        glow
          ? { background: `radial-gradient(120% 100% at 100% 0%, ${glow}, #0c1118 60%)` }
          : undefined
      }
    >
      {children}
    </div>
  );
}

const levelStyles: Record<string, string> = {
  Critical: "border-critical/50 text-critical",
  High: "border-orange/50 text-orange",
  Medium: "border-line text-text-secondary",
  Low: "border-teal/40 text-teal",
  "At Risk": "border-purple/50 bg-purple/15 text-purple",
};

export function Tag({ level, children }: { level?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        levelStyles[level ?? "Medium"] ?? "border-line text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}

// Segmented tick meter used in "Impacted Systems"
export function TickMeter({ value, color = "#35d6c1" }: { value: number; color?: string }) {
  const total = 28;
  const on = Math.round((value / 100) * total);
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-3 w-[3px] rounded-[1px]"
          style={{ background: i < on ? color : "#1c2430" }}
        />
      ))}
    </div>
  );
}

export function riskColor(v: number) {
  if (v >= 90) return "#7c6cff";
  if (v >= 70) return "#ff6b35";
  if (v >= 40) return "#ffb800";
  return "#35d6c1";
}