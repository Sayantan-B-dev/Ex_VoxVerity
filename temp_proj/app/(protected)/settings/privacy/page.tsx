import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { Btn, Select, Toggle } from "@/components/forms";

export default function SettingsPrivacyPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <PageHeader crumb="Settings" title="Privacy Settings" subtitle="Data minimization and retention controls." />

      <Card className="max-w-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Data & Retention</h2>
        </div>
        <div className="-my-1">
          <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium">Data Retention Period</p>
              <p className="text-[12px] text-text-secondary">Keep incident and call metadata for X days</p>
            </div>
            <Select value="90 days" width="160px" options={["30 days", "60 days", "90 days", "180 days", "1 year", "Indefinite"]} />
          </div>
          <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium">Store Voice Samples</p>
              <p className="text-[12px] text-text-secondary">Encrypted, used for continuous model training. Raw audio is processed in memory by default.</p>
            </div>
            <Toggle defaultOn />
          </div>
          <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium">Auto-Archive Old Data</p>
              <p className="text-[12px] text-text-secondary">Automatically archive data older than retention period</p>
            </div>
            <Toggle />
          </div>
          <div className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium">Capture Consent Prompt</p>
              <p className="text-[12px] text-text-secondary">Always show explicit browser permission before any capture</p>
            </div>
            <Toggle defaultOn />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary">Save Changes</Btn>
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <ShieldCheck className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          VoxVerity never stores raw audio or biometric embeddings on-chain, and never exposes
          service-role keys or private signing keys to the browser.
        </p>
      </Card>
    </div>
  );
}