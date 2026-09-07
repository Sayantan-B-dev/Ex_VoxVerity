"use client";

import { useState } from "react";
import { Check, Edit3, IdCard, X } from "lucide-react";
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

function EditField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="rounded-xl border border-teal/30 bg-elev px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-text-disabled">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="mt-1 w-full bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-disabled focus:placeholder:text-text-secondary"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-elev px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-text-disabled">{label}</p>
      <p className="mt-0.5 text-[14px] font-medium text-text-primary">{value || "—"}</p>
    </div>
  );
}

export default function ProfileView({ profile }: { profile: ProfileProps | null }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");

  const name = profile?.name ?? "—";
  const email = profile?.email ?? "—";
  const role = profile?.role ?? "operator";
  const initial = (firstName?.[0] ?? name[0] ?? "U").toUpperCase();
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : name;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`.trim(),
          phone,
          department,
          job_title: jobTitle,
          location,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save profile.");
        return;
      }
      setEditing(false);
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhone(profile?.phone ?? "");
    setDepartment(profile?.department ?? "");
    setJobTitle(profile?.job_title ?? "");
    setLocation(profile?.location ?? "");
    setEditing(false);
    setError("");
  }

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
            <h2 className="text-[24px] font-bold">{displayName}</h2>
            <p className="mt-1 text-[15px] text-text-secondary">{email}</p>
            <p className="text-[13px] font-semibold text-teal">{role}</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-hover"
                >
                  <X className="size-3.5" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-70"
                >
                  {saving ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 py-2 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25"
              >
                <Edit3 className="size-3.5" /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-2 text-[13px] text-critical">
          {error}
        </p>
      )}

      <SectionCard icon={IdCard} title="Personal Information" subtitle="Details stored in your profile">
        {editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditField label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <EditField label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
            <ReadOnlyField label="Email" value={email} />
            <EditField label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+1 (555) 000-0142" />
            <EditField label="Department" value={department} onChange={setDepartment} placeholder="e.g. Security Operations" />
            <EditField label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Security Analyst" />
            <EditField label="Location" value={location} onChange={setLocation} placeholder="e.g. New York, NY" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label="First Name" value={profile?.first_name ?? ""} />
            <ReadOnlyField label="Last Name" value={profile?.last_name ?? ""} />
            <ReadOnlyField label="Email" value={email} />
            <ReadOnlyField label="Phone" value={profile?.phone ?? ""} />
            <ReadOnlyField label="Department" value={profile?.department ?? ""} />
            <ReadOnlyField label="Job Title" value={profile?.job_title ?? ""} />
            <ReadOnlyField label="Location" value={profile?.location ?? ""} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}