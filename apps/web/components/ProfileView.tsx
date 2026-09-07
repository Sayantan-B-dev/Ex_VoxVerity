"use client";

import { IdCard } from "lucide-react";
import { Card } from "./primitives";

export interface ProfileProps {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  job_title: string;
  location: string;
  first_name: string;
  last_name: string;
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-elev text-teal">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <p className="text-[12px] text-text-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function ProfileView({ profile }: { profile: ProfileProps | null }) {
  const name = profile?.name ?? "—";
  const email = profile?.email ?? "—";
  const role = profile?.role ?? "operator";
  const initial = (name[0] ?? "U").toUpperCase();

  const fields: { label: string; value: string }[] = [
    { label: "First Name", value: profile?.first_name ?? "—" },
    { label: "Last Name", value: profile?.last_name ?? "—" },
    { label: "Email", value: email },
    { label: "Phone", value: profile?.phone || "—" },
    { label: "Department", value: profile?.department || "—" },
    { label: "Job Title", value: profile?.job_title || "—" },
    { label: "Location", value: profile?.location || "—" },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <p className="text-[12px] text-text-secondary">Dashboard / Profile</p>
        <h1 className="text-[26px] font-bold tracking-tight">Profile</h1>
      </div>

      <Card glow="rgba(53,214,193,0.12)" className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="grid size-[96px] place-items-center rounded-full border border-teal/40 bg-teal/15 text-[36px] font-bold text-teal">
            {initial}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-[24px] font-bold">{name}</h2>
            <p className="mt-1 text-[15px] text-text-secondary">{email}</p>
            <p className="text-[13px] font-semibold text-teal">{role}</p>
          </div>
        </div>
      </Card>

      <SectionCard icon={IdCard} title="Personal Information" subtitle="Details stored in your profile">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label} className="rounded-xl border border-line bg-elev px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-disabled">{f.label}</p>
              <p className="mt-0.5 text-[14px] font-medium text-text-primary">{f.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}