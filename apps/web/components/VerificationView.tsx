"use client";

import { useState } from "react";
import { CheckCheck, Check, Phone, X } from "lucide-react";
import PageHeader from "./PageHeader";
import { Card, Tag } from "./primitives";
import type { VerificationRequest } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

const stateTone: Record<string, string> = {
  PENDING: "High",
  CONFIRMED: "Low",
  REJECTED: "Critical",
  ESCALATED: "Medium",
  EXPIRED: "Medium",
};

export default function VerificationView({
  requests,
  source,
}: {
  requests: VerificationRequest[];
  source?: string;
}) {
  const [states, setStates] = useState<Record<string, string>>(
    Object.fromEntries(requests.map((r) => [r.id, r.state]))
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/verification/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setStates((m) => ({ ...m, [id]: status }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Verification"
        title="Secondary Verification"
        subtitle={
          source === "demo"
            ? "Independent confirmation for high-risk calls. Showing demo data — connect Supabase for live requests."
            : "Independent confirmation for high-risk calls — trusted callback, org confirmation, or human review."
        }
      />

      <div className="space-y-3">
        {requests.map((v) => {
          const state = states[v.id] ?? v.state;
          const pending = state === "PENDING";
          return (
            <Card key={v.id} className={`p-5 ${!pending ? "opacity-70" : ""}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] text-text-disabled">{v.id}</span>
                    <Tag level={stateTone[state]}>{state}</Tag>
                    <span className="text-[12px] text-text-secondary">{v.method}</span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold">{v.caller}</p>
                  <p className="text-[12px] text-text-secondary">
                    Call {v.callId} · requested {timeAgo(v.requestedAt)}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{v.note}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {pending ? (
                    <>
                      <button
                        onClick={() => decide(v.id, "CONFIRMED")}
                        disabled={busy === v.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-3.5 py-2 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25 disabled:opacity-60"
                      >
                        <Check className="size-4" /> Confirm
                      </button>
                      <button
                        onClick={() => decide(v.id, "REJECTED")}
                        disabled={busy === v.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-critical/50 bg-critical/15 px-3.5 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/25 disabled:opacity-60"
                      >
                        <X className="size-4" /> Reject
                      </button>
                      <button
                        onClick={() => decide(v.id, "ESCALATED")}
                        disabled={busy === v.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-elev px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
                      >
                        <Phone className="size-4" /> Escalate
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-elev px-3.5 py-2 text-[13px] text-text-secondary">
                      <CheckCheck className="size-4 text-teal" /> Decided: {state}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {requests.length === 0 && (
          <Card className="p-8 text-center text-[13px] text-text-secondary">
            No verification requests.
          </Card>
        )}
      </div>
    </div>
  );
}