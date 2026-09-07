"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Link2, ScanSearch } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { incidents, alerts, evidenceRecords } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

const statusTone: Record<string, string> = {
  OPEN: "Medium",
  INVESTIGATING: "High",
  CONTAINED: "High",
  RESOLVED: "Low",
  FALSE_POSITIVE: "Low",
};

export default function IncidentDetailPage() {
  const params = useParams<{ incidentId: string }>();
  const incident = incidents.find((i) => i.id === params.incidentId);
  if (!incident) notFound();

  const linkedAlerts = alerts.filter((a) => incident.alertIds.includes(a.id));
  const linkedEvidence = evidenceRecords.filter((e) => incident.evidenceIds.includes(e.id));

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Incidents
      </Link>

      <PageHeader
        crumb="Incidents"
        title={incident.id}
        subtitle={`Opened ${timeAgo(incident.opened)} · Owner: ${incident.owner}`}
        actions={
          <>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
              Add Note
            </button>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-purple/50 bg-purple/15 px-4 text-[13px] font-medium text-purple transition-colors hover:bg-purple/25">
              Mark Resolved
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">Summary</h2>
            <Tag level={statusTone[incident.status]}>{incident.status}</Tag>
          </div>
          <p className="mt-3 text-[13px] font-medium text-text-primary">{incident.scope}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{incident.summary}</p>
          <div className="mt-4 rounded-xl border border-line bg-elev p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-disabled">Risk Score</p>
            <p className="mt-1 font-mono text-[22px] font-bold text-text-primary">{incident.risk}/100</p>
          </div>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ScanSearch className="size-5 text-teal" />
              <h2 className="text-[17px] font-semibold">Linked Alerts</h2>
            </div>
            <div className="space-y-2">
              {linkedAlerts.map((a) => (
                <Link
                  key={a.id}
                  href={`/alerts/${a.id}`}
                  className="flex items-center justify-between rounded-xl border border-line bg-elev p-4 transition-colors hover:border-teal/40"
                >
                  <div>
                    <p className="text-[14px] font-medium">{a.threat}</p>
                    <p className="text-[12px] text-text-secondary">{a.id} · {a.caller}</p>
                  </div>
                  <ChevronRight className="size-4 text-text-disabled" />
                </Link>
              ))}
              {linkedAlerts.length === 0 && (
                <p className="text-[13px] text-text-secondary">No linked alerts.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="size-5 text-teal" />
              <h2 className="text-[17px] font-semibold">Evidence Packages</h2>
            </div>
            <div className="space-y-2">
              {linkedEvidence.map((e) => (
                <div key={e.id} className="rounded-xl border border-line bg-elev p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium">{e.id}</p>
                    <Tag level={e.chainStatus === "REGISTERED" ? "Low" : "High"}>{e.chainStatus}</Tag>
                  </div>
                  <p className="mt-1 font-mono text-[11px] break-all text-text-disabled">{e.hash}</p>
                </div>
              ))}
              {linkedEvidence.length === 0 && (
                <p className="text-[13px] text-text-secondary">No evidence generated yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}