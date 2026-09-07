"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-text-primary">{label}</span>
      {hint && <span className="mt-0.5 block text-[12px] text-text-secondary">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function Input({
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-lg border bg-elev px-3 text-[14px] text-text-primary placeholder:text-text-disabled outline-none transition-colors",
        error
          ? "border-critical focus:ring-2 focus:ring-critical/25"
          : "border-line focus:border-teal/60 focus:ring-2 focus:ring-teal/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  value,
  options,
  onChange,
  width,
}: {
  value: string;
  options: string[];
  onChange?: (v: string) => void;
  width?: string;
}) {
  return (
    <div className="relative inline-block" style={{ width: width ?? "100%" }}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-line bg-elev pl-3 pr-9 text-[14px] text-text-primary outline-none transition-colors focus:border-teal/60 focus:ring-2 focus:ring-teal/20"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}

export function Toggle({
  defaultOn = false,
  onChange,
}: {
  defaultOn?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => {
        setOn(!on);
        onChange?.(!on);
      }}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-teal" : "bg-text-disabled/50",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => setOn(!on)}
      className="flex items-center gap-2.5 text-[13px] text-text-primary"
    >
      <span
        className={cx(
          "grid size-5 place-items-center rounded border transition-colors",
          on ? "border-teal bg-teal text-black" : "border-line bg-elev",
        )}
      >
        {on && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

export function Btn({
  variant = "secondary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "border-teal/40 bg-teal/15 text-teal hover:bg-teal/25",
    secondary: "border-line bg-elev text-text-secondary hover:text-text-primary",
    danger: "border-critical/50 bg-critical/15 text-critical hover:bg-critical/25",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-4 text-[13px] font-medium transition-colors",
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}