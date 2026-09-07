import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { Btn, Field, Input, Select } from "@/components/forms";

export default function SettingsProfilePage() {
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
          <Field label="First Name"><Input defaultValue="Sayantan" /></Field>
          <Field label="Last Name"><Input defaultValue="Bharati" /></Field>
          <Field label="Email Address"><Input type="email" defaultValue="sayantan@voxverity.io" /></Field>
          <Field label="Phone Number"><Input defaultValue="+91 90000 00000" /></Field>
          <Field label="Department">
            <Select value="Security Operations" options={["Security Operations", "Fraud", "Compliance", "Engineering"]} />
          </Field>
          <Field label="Job Title"><Input defaultValue="Platform Owner" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="secondary">Cancel</Btn>
          <Btn variant="primary">Save Changes</Btn>
        </div>
      </Card>
    </div>
  );
}