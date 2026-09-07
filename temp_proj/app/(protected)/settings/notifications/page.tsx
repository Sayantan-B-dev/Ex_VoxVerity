import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { Btn, Toggle } from "@/components/forms";

const channels = [
  { l: "In-App Notifications", s: "Show notifications in the dashboard", on: true },
  { l: "Email Notifications", s: "Send email for critical alerts", on: true },
  { l: "SMS Notifications (Enterprise)", s: "Send SMS for critical incidents", on: false },
  { l: "Webhook / API Notifications", s: "Send to external system", on: false },
];

export default function SettingsNotificationsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <PageHeader crumb="Settings" title="Notification Settings" subtitle="Choose how and when you are notified." />

      <Card className="max-w-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Channel Preferences</h2>
        </div>
        <div className="-my-1">
          {channels.map((c) => (
            <div
              key={c.l}
              className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-[14px] font-medium">{c.l}</p>
                <p className="text-[12px] text-text-secondary">{c.s}</p>
              </div>
              <Toggle defaultOn={c.on} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary">Save Changes</Btn>
        </div>
      </Card>
    </div>
  );
}