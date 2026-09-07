import Link from "next/link";
import { ArrowLeft, KeyRound, Smartphone } from "lucide-react";
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
      <PageHeader crumb="Settings" title="Security Settings" subtitle="Password, two-factor, and session security." />

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
                  <p className="text-[12px] text-text-secondary">Authenticator App · Enabled</p>
                </div>
              </div>
              <Tag level="Low">Enabled</Tag>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <Btn variant="secondary">Manage 2FA</Btn>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Smartphone className="size-5 text-teal" />
                <div>
                  <p className="text-[14px] font-medium">Active Sessions</p>
                  <p className="text-[12px] text-text-secondary">Currently logged in on 3 devices</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              {["Chrome · Windows · Mumbai, IN", "Firefox · macOS · Bengaluru, IN", "Edge · Windows · Mumbai, IN"].map((d) => (
                <div key={d} className="flex items-center justify-between rounded-lg border border-line bg-elev px-3 py-2">
                  <span className="text-[13px] text-text-primary">{d}</span>
                  <button className="text-[12px] text-critical hover:underline">Revoke</button>
                </div>
              ))}
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