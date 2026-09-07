"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// A small "?" with a plain-language explanation on hover/focus/click - helps newcomers.
// Rendered via portal so it escapes `overflow-hidden` ancestors (e.g. Card)
// and always floats above surrounding content.
export function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const [placed, setPlaced] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  const updatePos = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const tipW = tipRef.current?.offsetWidth ?? 208;
    const tipH = tipRef.current?.offsetHeight ?? 64;
    const margin = 8;
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
    let top = r.bottom + margin;
    if (top + tipH > window.innerHeight - margin) {
      top = Math.max(margin, r.top - tipH - margin);
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }
    updatePos();
    // Re-measure after the tooltip has laid out so clamping uses real size.
    const raf = requestAnimationFrame(() => {
      updatePos();
      setPlaced(true);
    });
    const onScroll = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={text}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="text-text-disabled transition-colors hover:text-teal focus:text-teal focus:outline-none"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {open &&
        createPortal(
          <span
            ref={tipRef}
            id={tipId}
            role="tooltip"
            style={{ top: pos.top, left: pos.left, visibility: placed ? "visible" : "hidden" }}
            className="fixed z-[100] w-52 max-w-[calc(100vw-16px)] rounded-lg border border-line bg-elev px-3 py-2 text-[12px] leading-relaxed text-text-secondary shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}

// Centered confirmation popup (Escape/backdrop to cancel, Enter to confirm).
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-2xl"
      >
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        {body && <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{body}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line bg-elev px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="rounded-lg border border-critical/50 bg-critical/15 px-4 py-2 text-[13px] font-semibold text-critical transition-colors hover:bg-critical/25"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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