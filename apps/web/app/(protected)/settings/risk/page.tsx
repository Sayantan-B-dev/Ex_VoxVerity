import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { Btn, Select, Toggle } from "@/components/forms";
import { getRiskPolicyLive } from "@/lib/data";

const tone: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export default async function SettingsRiskPage() {
  const policy = await getRiskPolicyLive();
  const thresholds = policy?.thresholds ?? { low: 25, medium: 50, high: 75 };
  const bands = [
    { band: "LOW", range: `0 – ${thresholds.low}`, action: policy?.band_actions?.LOW ?? "Monitor" },
    { band: "MEDIUM", range: `${thresholds.low + 1} – ${thresholds.medium}`, action: policy?.band_actions?.MEDIUM ?? "Review" },
    { band: "HIGH", range: `${thresholds.medium + 1} – ${thresholds.high}`, action: policy?.band_actions?.HIGH ?? "Alert + verify" },
    { band: "CRITICAL", range: `${thresholds.high + 1} – 100`, action: policy?.band_actions?.CRITICAL ?? "Escalate + incident" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <PageHeader crumb="Settings" title="Risk Policy" subtitle="Scoring bands, thresholds, and detection sensitivity." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Severity Bands</h2>
          </div>
          <div className="space-y-3">
            {bands.map((b) => (
              <div key={b.band} className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3">
                <div className="flex items-center gap-3">
                  <Tag level={tone[b.band]}>{b.band}</Tag>
                  <span className="font-mono text-[13px] text-text-secondary">{b.range}</span>
                </div>
                <span className="text-[12px] text-text-secondary">{b.action}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-[17px] font-semibold">Thresholds & Sensitivity</h2>
            <div className="-my-1">
              <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium">Verification Threshold</p>
                  <p className="text-[12px] text-text-secondary">Risk score that triggers secondary verification</p>
                </div>
                <Select value={String(policy?.verification_threshold ?? 75)} width="120px" options={["60", "65", "70", "75", "80"]} />
              </div>
              <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium">Sensitivity Level</p>
                  <p className="text-[12px] text-text-secondary">Higher sensitivity = more detections, may increase false positives</p>
                </div>
                <Select value={policy?.sensitivity ?? "High (Strict)"} width="180px" options={["Low (Few false positives)", "Medium (Balanced)", "High (Strict)"]} />
              </div>
              <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium">Auto-Escalation</p>
                  <p className="text-[12px] text-text-secondary">Automatically escalate critical alerts to supervisors</p>
                </div>
                <Toggle defaultOn={policy?.auto_escalation ?? true} />
              </div>
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium">Voice Model Version</p>
                  <p className="text-[12px] text-text-secondary">AI model used for synthetic voice detection</p>
                </div>
                <Select value={policy?.model_version ?? "v3.2 (Latest)"} width="180px" options={["v3.0 (Previous)", "v3.1", "v3.2 (Latest)"]} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Btn variant="primary">Save Policy</Btn>
            </div>
          </Card>
          {!policy && (
            <p className="text-[12px] text-text-secondary">
              No active risk policy found - seed data has not been applied.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}