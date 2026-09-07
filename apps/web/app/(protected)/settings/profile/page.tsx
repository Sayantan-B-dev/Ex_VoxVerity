import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { Btn, Field, Input } from "@/components/forms";
import { getProfileData } from "@/lib/data";

export default async function SettingsProfilePage() {
  const profile = await getProfileData();

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <PageHeader crumb="Settings" title="Profile Settings" subtitle="Your account identity details." />
      <Card className="max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name"><Input defaultValue={profile?.first_name ?? ""} /></Field>
          <Field label="Last Name"><Input defaultValue={profile?.last_name ?? ""} /></Field>
          <Field label="Email Address"><Input type="email" defaultValue={profile?.email ?? ""} /></Field>
          <Field label="Phone Number"><Input defaultValue={profile?.phone ?? ""} /></Field>
          <Field label="Department"><Input defaultValue={profile?.department ?? ""} /></Field>
          <Field label="Job Title"><Input defaultValue={profile?.job_title ?? ""} /></Field>
        </div>
        {!profile && (
          <p className="mt-4 text-[12px] text-text-secondary">
            Profile not found - seed data has not been applied.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="secondary">Cancel</Btn>
          <Btn variant="primary">Save Changes</Btn>
        </div>
      </Card>
    </div>
  );
}