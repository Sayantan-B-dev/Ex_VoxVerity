"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Check, ChevronRight, Info, Siren, TriangleAlert } from "lucide-react";
import { Card, Tag, TickMeter } from "./primitives";
import { alerts } from "@/lib/demo-data";
import { riskBand, bandTag, timeAgo } from "@/lib/format";

const iconFor = (severity: string) =>
  severity === "CRITICAL" ? TriangleAlert : severity === "HIGH" ? Siren : Info;

export default function AlertsView() {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
            <Bell className="size-6 text-teal" />
            Security Alerts
          </h1>
          <p className="text-[13px] text-text-secondary">
            Real-time threats detected across protected voice channels.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] font-medium text-critical">
          <span className="size-2 rounded-full bg-critical" style={{ animation: "pulse-ring 1.5s infinite" }} />
          {alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length} unresolved
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => {
          const Icon = iconFor(a.severity);
          const done = acknowledged[a.id] ?? a.status === "Acknowledged";
          return (
            <Card
              key={a.id}
              className={`p-4 transition-opacity ${done ? "opacity-60" : ""}`}
              glow={a.severity === "CRITICAL" ? "rgba(255,59,59,0.08)" : undefined}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    a.severity === "CRITICAL"
                      ? "bg-critical/15 text-critical"
                      : a.severity === "HIGH"
                        ? "bg-orange/15 text-orange"
                        : a.severity === "MEDIUM"
                          ? "bg-warn/15 text-warn"
                          : "bg-teal/15 text-teal"
                  }`}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] text-text-disabled">{a.id}</span>
                    <Tag level={bandTag(riskBand(a.risk))}>{bandTag(riskBand(a.risk))}</Tag>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        a.status === "Escalated"
                          ? "border-purple/50 text-purple"
                          : a.status === "Investigating"
                            ? "border-orange/50 text-orange"
                            : "border-line text-text-secondary"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold">{a.threat}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
                    {a.caller} · {a.phone}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{a.description}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-32">
                      <TickMeter value={a.risk} color={a.risk >= 76 ? "#ff3b3b" : a.risk >= 51 ? "#ff6b35" : "#ffb800"} />
                    </div>
                    <span className="text-[11px] text-text-disabled">{timeAgo(a.time)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {!done && (
                    <button
                      onClick={() => setAcknowledged((m) => ({ ...m, [a.id]: true }))}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-elev px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-teal/50 hover:text-teal"
                    >
                      <Check className="size-3.5" /> Acknowledge
                    </button>
                  )}
                  <Link
                    href={`/alerts/${a.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-teal transition-colors hover:bg-teal/10"
                  >
                    View details <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}