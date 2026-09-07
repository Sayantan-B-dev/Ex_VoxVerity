"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Globe, ShieldCheck, AlertTriangle, Link2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import RiskMeter from "@/components/RiskMeter";
import { calls, alerts, incidents, evidenceRecords } from "@/lib/demo-data";
import { riskBand, bandTag, formatDuration, timeAgo } from "@/lib/format";

export default function CallDetailPage() {
  const params = useParams<{ callId: string }>();
  const call = calls.find((c) => c.id === params.callId);
  if (!call) notFound();

  const alert = alerts.find((a) => a.id === call.alertId);
  const incident = incidents.find((i) => i.id === call.incidentId);
  const evidence = evidenceRecords.find((e) => e.callId === call.id);

  const metrics = [
    { label: "Synthetic Voice Signal", value: call.syntheticLabel.replace(/_/g, " "), tone: call.risk >= 76 ? "text-critical" : call.risk >= 51 ? "text-orange" : "text-teal" },
    { label: "Speaker Similarity", value: `${call.speakerSimilarity}%`, tone: call.speakerSimilarity >= 80 ? "text-teal" : "text-warn" },
    { label: "Duration", value: formatDuration(call.durationSec), tone: "text-text-primary" },
    { label: "Source", value: call.source, tone: "text-text-primary" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/calls"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Flagged Calls
      </Link>

      <PageHeader
        crumb="Calls"
        title={call.caller}
        subtitle={`${call.id} · ${call.number}`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Risk + identity */}
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <p className="self-start text-[15px] font-semibold">Risk Assessment</p>
          <RiskMeter value={call.risk} size={200} centerValue={String(call.risk)} centerLabel="risk score" />
          <Tag level={bandTag(riskBand(call.risk))}>{bandTag(riskBand(call.risk))}</Tag>
          <p className="text-center text-[12px] leading-relaxed text-text-secondary">
            Outcome: <span className="font-medium text-text-primary">{call.outcome}</span> ·{" "}
            {timeAgo(call.startedAt)}
          </p>
        </Card>

        {/* Details */}
        <Card className="p-6 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Phone className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Call Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-line bg-elev p-4">
                <p className="text-[11px] uppercase tracking-wide text-text-disabled">{m.label}</p>
                <p className={`mt-1 font-mono text-[16px] font-semibold ${m.tone}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {alert && (
              <Link href={`/alerts/${alert.id}`} className="flex items-center justify-between rounded-xl border border-line bg-elev p-4 transition-colors hover:border-teal/40">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="size-5 text-orange" />
                  <div>
                    <p className="text-[14px] font-medium">{alert.threat}</p>
                    <p className="text-[12px] text-text-secondary">Linked alert {alert.id}</p>
                  </div>
                </div>
                <span className="text-[12px] text-teal">View →</span>
              </Link>
            )}
            {incident && (
              <Link href={`/incidents/${incident.id}`} className="flex items-center justify-between rounded-xl border border-line bg-elev p-4 transition-colors hover:border-teal/40">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-purple" />
                  <div>
                    <p className="text-[14px] font-medium">{incident.id} · {incident.scope}</p>
                    <p className="text-[12px] text-text-secondary">Linked incident · {incident.status}</p>
                  </div>
                </div>
                <span className="text-[12px] text-teal">View →</span>
              </Link>
            )}
            {evidence && (
              <div className="flex items-center justify-between rounded-xl border border-line bg-elev p-4">
                <div className="flex items-center gap-3">
                  <Link2 className="size-5 text-teal" />
                  <div>
                    <p className="text-[14px] font-medium">{evidence.id} · {evidence.chainStatus}</p>
                    <p className="font-mono text-[11px] text-text-disabled">{evidence.hash.slice(0, 40)}…</p>
                  </div>
                </div>
                <Link href="/blockchain" className="text-[12px] text-teal">Evidence →</Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}