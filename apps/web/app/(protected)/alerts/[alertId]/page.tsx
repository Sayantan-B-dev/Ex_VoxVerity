import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Check, ChevronRight, Link2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag, TickMeter } from "@/components/primitives";
import { getAlertById, getCallById, getIncidentById, getEvidenceForCall } from "@/lib/data";
import { riskBand, bandTag, timeAgo } from "@/lib/format";
import { acknowledgeAlert } from "@/app/(protected)/alerts/actions";

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ alertId: string }>;
}) {
  const { alertId } = await params;
  const alert = await getAlertById(alertId);
  if (!alert) notFound();

  const [call, incident, evidenceList] = await Promise.all([
    alert.callId ? getCallById(alert.callId) : Promise.resolve(null),
    alert.incidentId ? getIncidentById(alert.incidentId) : Promise.resolve(null),
    alert.callId ? getEvidenceForCall(alert.callId) : Promise.resolve([]),
  ]);
  const evidence = evidenceList[0];

  async function onAcknowledge() {
    "use server";
    await acknowledgeAlert(alertId);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/alerts"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Alerts
      </Link>

      <PageHeader
        crumb="Alerts"
        title={alert.threat}
        subtitle={`${alert.id} · ${timeAgo(alert.time)} · ${alert.caller}`}
        actions={
          <>
            <form action={onAcknowledge}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25"
              >
                <Check className="size-4" /> Acknowledge
              </button>
            </form>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-elev px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary">
              Escalate
            </button>
            <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-purple/50 bg-purple/15 px-4 text-[13px] font-medium text-purple transition-colors hover:bg-purple/25">
              Open Incident
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main alert card */}
        <Card className="p-6 xl:col-span-2">
          <div className="mb-4 flex items-start gap-3">
            <div
              className={`grid size-12 shrink-0 place-items-center rounded-xl ${
                alert.severity === "CRITICAL" ? "bg-critical/15 text-critical" : "bg-orange/15 text-orange"
              }`}
            >
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Tag level={bandTag(riskBand(alert.risk))}>{bandTag(riskBand(alert.risk))}</Tag>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    alert.status === "Escalated" ? "border-purple/50 text-purple" : "border-orange/50 text-orange"
                  }`}
                >
                  {alert.status}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{alert.description}</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-elev p-4">
            <div className="flex items-center justify-between text-[12px] text-text-secondary">
              <span>Risk Score</span>
              <span className="dot text-[16px] text-text-primary">{alert.risk}/100</span>
            </div>
            <div className="mt-2">
              <TickMeter value={alert.risk} color={alert.risk >= 76 ? "#ff3b3b" : "#ff6b35"} />
            </div>
            <p className="mt-3 text-[11px] text-text-disabled">
              Contributing signals: synthetic voice · speaker similarity · prosody — engine
              risk-engine@3.2.0
            </p>
          </div>
        </Card>

        {/* Context */}
        <div className="space-y-4">
          {call && (
            <Link href={`/calls/${call.id}`} className="block">
              <Card className="flex items-center justify-between p-5 transition-colors hover:border-teal/40">
                <div>
                  <p className="text-[12px] text-text-disabled">Linked Call</p>
                  <p className="mt-0.5 text-[14px] font-semibold">{call.id}</p>
                  <p className="text-[12px] text-text-secondary">{call.caller}</p>
                </div>
                <ChevronRight className="size-4 text-text-disabled" />
              </Card>
            </Link>
          )}
          {incident && (
            <Link href={`/incidents/${incident.id}`} className="block">
              <Card className="flex items-center justify-between p-5 transition-colors hover:border-teal/40">
                <div>
                  <p className="text-[12px] text-text-disabled">Linked Incident</p>
                  <p className="mt-0.5 text-[14px] font-semibold">{incident.id}</p>
                  <p className="text-[12px] text-text-secondary">{incident.status}</p>
                </div>
                <ChevronRight className="size-4 text-text-disabled" />
              </Card>
            </Link>
          )}
          {evidence && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-teal" />
                <p className="text-[12px] text-text-disabled">Evidence Package</p>
              </div>
              <p className="mt-2 font-mono text-[11px] break-all text-text-secondary">{evidence.hash}</p>
              <p className="mt-2 text-[11px] text-text-disabled">
                {evidence.algorithm} · {evidence.chainStatus} · {evidence.network}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}