"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, AudioLines, Bell, Cpu, Gauge, MicVocal } from "lucide-react";
import { Card } from "./primitives";
import { Btn, Select, Toggle } from "./forms";
import { MODEL_OPTIONS, useModelPreference } from "@/lib/model-settings";
import { getVoiceprintStatus, type VoiceprintStatus } from "@/lib/ai-service";

const tabs = ["General", "Notifications", "Security", "Model"];

function Section({
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

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] text-text-secondary">{sub}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function General() {
  return (
    <Section icon={Gauge} title="Dashboard Settings" subtitle="Configure your dashboard experience">
      <div className="-my-1">
        <Row label="Auto-refresh Interval" sub="Update dashboard data automatically">
          <Select value="5 seconds" width="160px" options={["3 seconds", "5 seconds", "10 seconds", "30 seconds", "1 minute", "Manual Only"]} />
        </Row>
      </div>
    </Section>
  );
}

function Notifications() {
  const channels = [
    { l: "In-App Notifications", s: "Show notifications in the dashboard", on: true },
    { l: "Email Notifications", s: "Send email for critical alerts", on: true },
  ];
  return (
    <>
      <Section icon={Bell} title="Channel Preferences" subtitle="Choose how to receive notifications">
        <div className="-my-1">
          {channels.map((c) => (
            <Row key={c.l} label={c.l} sub={c.s}>
              <Toggle defaultOn={c.on} />
            </Row>
          ))}
        </div>
      </Section>
      <Section icon={AlertTriangle} title="Alert Settings" subtitle="Configure alert behavior">
        <div className="-my-1">
          <Row label="Alert Severity Threshold" sub="Minimum level to trigger alerts">
            <Select value="High & Above" width="180px" options={["Critical Only", "High & Above", "Medium & Above", "All Alerts"]} />
          </Row>
          <Row label="Auto-Escalation" sub="Automatically escalate critical alerts to supervisors">
            <Toggle defaultOn />
          </Row>
          <Row label="Sound Notifications" sub="Play sound when a critical alert arrives">
            <Toggle defaultOn />
          </Row>
        </div>
      </Section>
      <Section icon={AudioLines} title="Voice Analysis Preferences" subtitle="Adjust voice analysis settings">
        <div className="-my-1">
          <Row label="Voice Model Version" sub="AI model used for synthetic voice detection">
            <Select value="v3.2 (Latest)" width="180px" options={["v3.0 (Previous)", "v3.1", "v3.2 (Latest)"]} />
          </Row>
          <Row label="Sensitivity Level" sub="Higher sensitivity = more detections, may increase false positives">
            <Select value="High (Strict)" width="180px" options={["Low (Few false positives)", "Medium (Balanced)", "High (Strict)"]} />
          </Row>
        </div>
      </Section>
    </>
  );
}

function Security() {
  return (
    <Section icon={AlertTriangle} title="Session Security" subtitle="Manage session timeouts">
      <div className="-my-1">
        <Row label="Session Timeout" sub="Auto-logout after inactivity">
          <Select value="15 minutes" width="180px" options={["5 minutes", "10 minutes", "15 minutes", "30 minutes", "Never timeout"]} />
        </Row>
        <Row label="Require Re-authentication" sub="Enter password when changing security settings">
          <Toggle defaultOn />
        </Row>
      </div>
      <div className="mt-5 flex justify-end">
        <Btn variant="primary">Save Changes</Btn>
      </div>
    </Section>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function ModelSettings() {
  const [model, setModel] = useModelPreference();
  const [vp, setVp] = useState<VoiceprintStatus | null>(null);
  const [vpLoading, setVpLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVoiceprintStatus()
      .then((s) => {
        if (!cancelled) {
          setVp(s);
          setVpLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setVpLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Section icon={Cpu} title="Analysis Model" subtitle="Model used for every realtime chunk (sent with each session)">
        <div className="-my-1">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`flex w-full items-start justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                model === m.id
                  ? "border-teal/60 bg-teal/10"
                  : "border-line bg-transparent hover:border-white/20"
              }`}
            >
              <div>
                <p className="text-[14px] font-medium">{m.label}</p>
                <p className="text-[12px] text-text-secondary">{m.hint}</p>
              </div>
              <span
                className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                  model === m.id ? "border-teal bg-teal" : "border-line"
                }`}
              >
                {model === m.id && <span className="size-1.5 rounded-full bg-black" />}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-text-secondary">
          Saved per browser (localStorage) — no database writes. The chosen model is applied to new
          realtime sessions immediately.
        </p>
      </Section>

      <Section icon={MicVocal} title="Your Voiceprint" subtitle="Speaker similarity is scored against this enrolled voice">
        {vpLoading ? (
          <p className="text-[12px] text-text-secondary">Checking voiceprint status…</p>
        ) : vp?.enrolled ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Name", value: vp.name ?? "default" },
              { label: "Segments", value: String(vp.chunk_count ?? 0) },
              { label: "Speech duration", value: `${vp.duration_s ?? 0}s` },
              { label: "Trained", value: fmtDate(vp.created_at) },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[11px] uppercase tracking-wide text-text-disabled">{m.label}</p>
                <p className="mt-0.5 font-mono text-[14px] font-semibold text-text-primary">{m.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-secondary">
            No voiceprint enrolled. Train one with the local trainer app:
          </p>
        )}
        <div className="mt-4 rounded-lg border border-line bg-elev p-3">
          <p className="font-mono text-[11px] text-text-secondary">
            cd services/ai-service && python scripts/train_voiceprint.py
          </p>
          <p className="mt-1 text-[11px] text-text-disabled">
            Records ~1 minute of your voice (or short parts), trains an ECAPA-TDNN voiceprint live,
            and saves it to model_artifacts/voiceprints/. The AI service picks it up immediately. The
            voiceprint stays on this machine — never uploaded or stored on-chain.
          </p>
        </div>
      </Section>
    </>
  );
}

export default function SettingsView() {
  const [tab, setTab] = useState("General");
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <p className="text-[12px] text-text-secondary">Dashboard / Settings</p>
        <h1 className="text-[26px] font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex gap-6 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 pb-3 text-[14px] transition-colors ${
              tab === t
                ? "border-teal font-semibold text-teal"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-8">
        {tab === "General" && <General />}
        {tab === "Notifications" && <Notifications />}
        {tab === "Security" && <Security />}
        {tab === "Model" && <ModelSettings />}
      </div>
    </div>
  );
}