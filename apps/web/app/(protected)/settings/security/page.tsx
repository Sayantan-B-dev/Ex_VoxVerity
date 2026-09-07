import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { Btn, Field, Input, Toggle } from "@/components/forms";

export default function SettingsSecurityPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <PageHeader crumb="Settings" title="Security Settings" subtitle="Password and authentication options." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-[17px] font-semibold">Change Password</h2>
          <div className="space-y-4">
            <Field label="Current Password"><Input type="password" placeholder="••••••••" /></Field>
            <Field label="New Password"><Input type="password" placeholder="••••••••" /></Field>
            <Field label="Confirm New Password"><Input type="password" placeholder="••••••••" /></Field>
            <Btn variant="primary">Update Password</Btn>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <KeyRound className="size-5 text-teal" />
                <div>
                  <p className="text-[14px] font-medium">Two-Factor Authentication</p>
                  <p className="text-[12px] text-text-secondary">Time-based one-time passwords via authenticator app</p>
                </div>
              </div>
              <Tag level="Medium">Not configured</Tag>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <Btn variant="secondary">Set up 2FA</Btn>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium">Require Re-authentication</p>
                <p className="text-[12px] text-text-secondary">Enter password when changing security settings</p>
              </div>
              <Toggle defaultOn />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}