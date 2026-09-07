"use client";

import { useState } from "react";
import {
  Camera,
  Clock,
  Download,
  IdCard,
  KeyRound,
  Lock,
  Pencil,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Card, Tag } from "./primitives";
import { Btn, Field, Input, Select, Toggle } from "./forms";

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-6 ${className ?? ""}`}>
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

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

const security = [
  {
    icon: Lock,
    color: "text-teal",
    title: "Password",
    sub: "Last changed: 45 days ago",
    action: "Change Password",
  },
  {
    icon: KeyRound,
    color: "text-neon",
    title: "Two-Factor Authentication",
    sub: "Authenticator App",
    tag: "Enabled",
    action: "Manage 2FA",
  },
  {
    icon: Smartphone,
    color: "text-purple",
    title: "Active Sessions",
    sub: "Currently logged in on 3 devices",
    action: "View Sessions",
  },
  {
    icon: Clock,
    color: "text-warn",
    title: "Login History",
    sub: "View your recent login activity",
    action: "View History",
  },
  {
    icon: ShieldCheck,
    color: "text-neon",
    title: "Account Status",
    sub: "Active and in Good Standing · Created Sep 4, 2026",
  },
];

export default function ProfileView() {
  const [confirm, setConfirm] = useState("");
  const [modal, setModal] = useState(false);
  const accountEmail = "sayantan@voxverity.io";

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <p className="text-[12px] text-text-secondary">Dashboard / Profile</p>
        <h1 className="text-[26px] font-bold tracking-tight">Profile</h1>
      </div>

      {/* Header card */}
      <Card glow="rgba(53,214,193,0.12)" className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&h=240&fit=crop&auto=format"
              alt="Sayantan Bharati"
              className="size-[120px] rounded-full object-cover ring-[3px] ring-teal"
            />
            <span className="absolute bottom-2 right-2 size-3.5 rounded-full border-2 border-card bg-neon" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <h2 className="text-[24px] font-bold">Sayantan Bharati</h2>
              <span className="rounded-md bg-neon/15 px-2 py-0.5 text-[11px] font-semibold text-neon">
                ACTIVE
              </span>
            </div>
            <p className="mt-1 text-[15px] text-text-secondary">{accountEmail}</p>
            <p className="text-[13px] font-semibold text-teal">Platform Owner · Security Operations</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Btn variant="secondary">
              <Camera className="size-4" /> Change Photo
            </Btn>
            <Btn variant="primary">
              <Pencil className="size-4" /> Edit Profile
            </Btn>
          </div>
        </div>
      </Card>

      {/* Personal information */}
      <SectionCard icon={IdCard} title="Personal Information" subtitle="Update your personal details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <Input defaultValue="Sayantan" />
          </Field>
          <Field label="Last Name">
            <Input defaultValue="Bharati" />
          </Field>
          <Field label="Email Address">
            <Input type="email" defaultValue={accountEmail} />
          </Field>
          <Field label="Phone Number">
            <Input defaultValue="+91 90000 00000" />
          </Field>
          <Field label="Department">
            <Select value="Security Operations" options={["Security Operations", "Fraud", "Compliance", "Engineering"]} />
          </Field>
          <Field label="Job Title">
            <Input defaultValue="Platform Owner" />
          </Field>
          <Field label="Location">
            <Input defaultValue="Mumbai, IN" />
          </Field>
          <div />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="secondary">Cancel</Btn>
          <Btn variant="primary">Save Changes</Btn>
        </div>
      </SectionCard>

      {/* Account security */}
      <SectionCard
        icon={Lock}
        title="Account Security"
        subtitle="Manage your account security and authentication"
      >
        <div className="-my-1">
          {security.map((s) => (
            <Row key={s.title}>
              <div className="flex items-center gap-3">
                <s.icon className={`size-5 ${s.color}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">{s.title}</p>
                    {s.tag && (
                      <span className="rounded bg-neon/15 px-1.5 py-0.5 text-[10px] font-semibold text-neon">
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary">{s.sub}</p>
                </div>
              </div>
              {s.action && <Btn variant="secondary">{s.action}</Btn>}
            </Row>
          ))}
        </div>
      </SectionCard>

      {/* Preferences */}
      <SectionCard icon={SlidersHorizontal} title="Preferences" subtitle="Customize your experience">
        <div className="-my-1">
          {[
            { l: "Language", s: "Select your preferred language", o: ["English", "Spanish", "French", "German", "Japanese", "Chinese"], w: "180px" },
            { l: "Time Zone", s: "Set your local time zone", o: ["UTC +5:30 (IST)", "UTC -8:00 (PST)", "UTC +0:00 (GMT)"], w: "220px" },
            { l: "Date Format", s: "Choose how dates are displayed (e.g., 12/29/2026)", o: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"], w: "180px" },
            { l: "Theme", s: "Dark Mode (Recommended for security)", o: ["Dark", "Light"], w: "160px" },
          ].map((p) => (
            <Row key={p.l}>
              <div>
                <p className="text-[14px] font-medium">{p.l}</p>
                <p className="text-[12px] text-text-secondary">{p.s}</p>
              </div>
              <Select value={p.o[0]} options={p.o} width={p.w} />
            </Row>
          ))}
          <Row>
            <div>
              <p className="text-[14px] font-medium">Email Notifications</p>
              <p className="text-[12px] text-text-secondary">Receive alerts via email</p>
            </div>
            <Toggle defaultOn />
          </Row>
        </div>
      </SectionCard>

      {/* Account actions */}
      <SectionCard
        icon={Download}
        title="Account Actions"
        subtitle="Manage your account data and account status"
        className="mb-8"
      >
        <div className="-my-1">
          <Row>
            <div className="flex items-center gap-3">
              <Download className="size-5 text-teal" />
              <div>
                <p className="text-[14px] font-medium">Download Profile Data</p>
                <p className="text-[12px] text-text-secondary">
                  Export your personal data as CSV for backup or portability
                </p>
              </div>
            </div>
            <Btn variant="secondary">Download Data</Btn>
          </Row>
          <Row>
            <div className="flex items-center gap-3">
              <Trash2 className="size-5 text-critical" />
              <div>
                <p className="text-[14px] font-medium text-critical">Delete Account</p>
                <p className="text-[12px] text-text-secondary">
                  Permanently delete your account and all associated data. This action
                  cannot be undone.
                </p>
              </div>
            </div>
            <Btn variant="danger" onClick={() => setModal(true)}>
              Delete Account
            </Btn>
          </Row>
        </div>
      </SectionCard>

      {/* Delete confirmation modal */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-[500px] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="grid size-12 place-items-center rounded-xl bg-critical/15">
                <TriangleAlert className="size-6 text-critical" />
              </div>
              <button
                onClick={() => setModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="size-5" />
              </button>
            </div>
            <h3 className="text-[22px] font-bold text-critical">Delete Account?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              This will permanently erase your profile, incidents, and all associated
              data. Type your email to confirm.
            </p>
            <div className="mt-4">
              <Input
                placeholder={accountEmail}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                disabled={confirm !== accountEmail}
                className="disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete Account
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}