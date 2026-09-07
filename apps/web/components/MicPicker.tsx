"use client";

import { useEffect, useState } from "react";
import { Mic, RefreshCw } from "lucide-react";

interface MicDevice {
  deviceId: string;
  label: string;
}

/**
 * Microphone selector for THIS browser. Each side of a call picks its own
 * device - essential when testing two browsers on the same machine (both would
 * otherwise grab the same default mic). The picked deviceId is used when the
 * call's getUserMedia runs, so it applies to the next call/join.
 */
export default function MicPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (deviceId: string) => void;
}) {
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  async function scan(unlock = false) {
    setScanning(true);
    try {
      // Device labels are only exposed after mic permission. Grab the mic for
      // a moment and stop it - labels stay unlocked for the session.
      if (unlock || devices.length === 0) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          /* permission denied - show what we can */
        }
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone (unlabeled)" }));
      setDevices(mics);
    } catch {
      setDevices([]);
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Mic className="size-4 text-teal" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[280px] rounded-lg border border-line bg-elev px-3 py-2 text-[12px] text-text-primary outline-none focus:border-teal/60"
        title="Microphone for this browser"
      >
        <option value="">System default microphone</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => void scan(true)}
        disabled={scanning}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[11px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
        title="Refresh microphone list"
      >
        <RefreshCw className={`size-3.5 ${scanning ? "animate-spin" : ""}`} /> Refresh
      </button>
      {devices.length === 0 && !scanning && (
        <span className="text-[11px] text-text-disabled">No microphones detected.</span>
      )}
    </div>
  );
}