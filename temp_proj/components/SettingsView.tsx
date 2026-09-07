"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Bell,
  Database,
  Gauge,
  Info,
  KeyRound,
  MoreHorizontal,
  Network,
  Plug,
  Plus,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Card } from "./primitives";
import { Btn, Checkbox, Field, Input, Select, Toggle } from "./forms";

const tabs = ["General", "Notifications", "Security", "Integrations", "API Keys", "Advanced"];

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
    <>
      <Section icon={Gauge} title="Dashboard Settings" subtitle="Configure your dashboard experience">
        <div className="-my-1">
          <Row label="Default Dashboard View" sub="Which dashboard loads when you login?">
            <Select value="Overview" width="200px" options={["Overview", "Live Monitoring", "Analytics", "Threat Intelligence", "Recent Incidents"]} />
          </Row>
          <Row label="Auto-refresh Interval" sub="Update dashboard data automatically">
            <Select value="5 seconds" width="160px" options={["3 seconds", "5 seconds", "10 seconds", "30 seconds", "1 minute", "Manual Only"]} />
          </Row>
          <Row label="Display Density" sub="Comfortable: more whitespace. Compact: more data per screen.">
            <Select value="Comfortable" width="160px" options={["Comfortable", "Compact"]} />
          </Row>
        </div>
      </Section>
      <Section icon={AlertTriangle} title="Alert Settings" subtitle="Configure how you receive and manage alerts">
        <div className="-my-1">
          <Row label="Alert Severity Threshold" sub="Minimum level to trigger alerts">
            <Select value="High & Above" width="180px" options={["Critical Only", "High & Above", "Medium & Above", "All Alerts"]} />
          </Row>
          <Row label="Auto-Escalation" sub="Automatically escalate critical alerts to supervisors">
            <Toggle defaultOn />
          </Row>
          <Row label="Sound Notifications" sub="Play sound when critical alert arrives">
            <div className="flex items-center gap-3">
              <Btn variant="secondary" className="h-9">Test Sound</Btn>
              <Toggle defaultOn />
            </div>
          </Row>
          <Row label="Notification Duration" sub="How long to show alerts before auto-dismissing">
            <Select value="5 seconds" width="180px" options={["3 seconds", "5 seconds", "10 seconds", "30 seconds", "Never Auto-dismiss"]} />
          </Row>
        </div>
      </Section>
      <Section icon={AudioLines} title="Voice Analysis Preferences" subtitle="Adjust voice analysis and detection settings">
        <div className="-my-1">
          <Row label="Voice Model Version" sub="AI model used for synthetic voice detection">
            <Select value="v3.2 (Latest)" width="180px" options={["v3.0 (Previous)", "v3.1", "v3.2 (Latest)"]} />
          </Row>
          <Row label="Sensitivity Level" sub="Higher sensitivity = more detections, may increase false positives">
            <Select value="High (Strict)" width="180px" options={["Low (Few false positives)", "Medium (Balanced)", "High (Strict)"]} />
          </Row>
          <Row label="Store Voice Samples" sub="Encrypted, GDPR-compliant. Used for continuous model training.">
            <Toggle defaultOn />
          </Row>
        </div>
      </Section>
    </>
  );
}

function Notifications() {
  const channels = [
    { icon: Bell, l: "In-App Notifications", s: "Show notifications in the dashboard", on: true },
    { icon: Bell, l: "Email Notifications", s: "Send email for critical alerts", on: true },
    { icon: Bell, l: "SMS Notifications (Enterprise)", s: "Send SMS for critical incidents", on: false },
    { icon: Plug, l: "Webhook / API Notifications", s: "Send to external system", on: false },
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
      <Section icon={AlertTriangle} title="Notification Rules" subtitle="Set up custom notification rules">
        <div className="space-y-3">
          {[
            { n: "Critical Alerts", c: "Severity = Critical", a: "Email + SMS + In-App" },
            { n: "Voice Clone Detections", c: "Detection Type = Clone", a: "Email + In-App" },
          ].map((r) => (
            <div key={r.n} className="flex flex-col gap-2 rounded-xl border border-line bg-elev p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-medium">{r.n}</p>
                <p className="text-[12px] text-text-secondary">
                  {r.c} · <span className="text-teal">{r.a}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Btn variant="secondary" className="h-9">Edit</Btn>
                <Btn variant="secondary" className="h-9">Delete</Btn>
              </div>
            </div>
          ))}
          <Btn variant="primary">
            <Plus className="size-4" /> Add Custom Rule
          </Btn>
        </div>
      </Section>
    </>
  );
}

function Security() {
  return (
    <>
      <Section icon={Network} title="IP Whitelist" subtitle="Restrict access to known IP addresses">
        <Row label="IP Whitelist Enabled" sub="Only whitelisted addresses can access the platform">
          <Toggle />
        </Row>
        <div className="mt-4 space-y-2">
          {["192.168.1.100", "10.0.0.0/24", "203.0.113.45"].map((ip) => (
            <div key={ip} className="flex items-center justify-between rounded-lg border border-line bg-elev px-3 py-2">
              <span className="font-mono text-[13px]">{ip}</span>
              <div className="flex gap-2">
                <Btn variant="secondary" className="h-8 px-3">Edit</Btn>
                <Btn variant="secondary" className="h-8 px-3">Delete</Btn>
              </div>
            </div>
          ))}
          <p className="text-[12px] text-neon">Current IP: 203.0.113.45 ✓ Whitelisted</p>
          <Btn variant="primary"><Plus className="size-4" /> Add New IP Address</Btn>
        </div>
      </Section>
      <Section icon={ShieldCheck} title="Session Security" subtitle="Manage session timeouts and security">
        <div className="-my-1">
          <Row label="Session Timeout" sub="Auto-logout after inactivity">
            <Select value="15 minutes" width="180px" options={["5 minutes", "10 minutes", "15 minutes", "30 minutes", "Never timeout"]} />
          </Row>
          <Row label="Require Re-authentication" sub="Enter password when changing security settings">
            <Toggle defaultOn />
          </Row>
          <Row label="Concurrent Sessions" sub="Max number of simultaneous logins">
            <Select value="5 sessions" width="180px" options={["1 session", "2 sessions", "5 sessions", "10 sessions", "Unlimited"]} />
          </Row>
        </div>
      </Section>
      <Section icon={KeyRound} title="API Security" subtitle="Manage API keys and tokens">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[13px]">Active API Keys: <span className="font-semibold text-teal">3</span></span>
          <span className="text-[13px]">Inactive API Keys: <span className="font-semibold text-text-secondary">1</span></span>
          <Btn variant="primary" className="ml-auto">Go to API Keys Tab →</Btn>
        </div>
      </Section>
    </>
  );
}

function Integrations() {
  const connected = [
    { n: "Slack", s: "Connected: vox-secops · synced 5 min ago", btn: "Disconnect" },
    { n: "Splunk", s: "Connected: instance.splunk.com · Active", btn: "Settings →" },
    { n: "PagerDuty", s: "Not connected · Send critical alerts to on-call", btn: "Connect →" },
  ];
  const available = ["Microsoft Teams", "Google Workspace", "Jira", "ServiceNow", "Datadog", "AWS CloudWatch"];
  return (
    <>
      <Section icon={Plug} title="Connected Services" subtitle="Manage connected external services">
        <div className="space-y-2">
          {connected.map((c) => (
            <div key={c.n} className="flex flex-col gap-2 rounded-xl border border-line bg-elev p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-card text-teal">
                  <Plug className="size-4" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">{c.n}</p>
                  <p className="text-[12px] text-text-secondary">{c.s}</p>
                </div>
              </div>
              <Btn variant="secondary" className="h-9">{c.btn}</Btn>
            </div>
          ))}
        </div>
      </Section>
      <Section icon={Plus} title="Connect More Services" subtitle="Available integrations">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((a) => (
            <div key={a} className="flex flex-col items-center gap-3 rounded-xl border border-line bg-elev p-6 text-center transition-colors hover:border-white/15">
              <div className="grid size-12 place-items-center rounded-xl bg-card text-teal">
                <Plug className="size-5" />
              </div>
              <p className="text-[14px] font-medium">{a}</p>
              <Btn variant="primary" className="h-9"><Plus className="size-4" /> Connect</Btn>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ApiKeys() {
  const keys = [
    { n: "Production API", c: "60 days ago", u: "2 hours ago" },
    { n: "Testing", c: "30 days ago", u: "1 day ago" },
    { n: "Webhook Handler", c: "15 days ago", u: "Never" },
  ];
  return (
    <>
      <Section icon={KeyRound} title="Active API Keys" subtitle="Your active API keys for programmatic access">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-text-secondary">
                <th className="pb-3 font-medium">Key Name</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium">Last Used</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.n} className="border-t border-line">
                  <td className="py-3 font-medium">{k.n}</td>
                  <td className="py-3 text-text-secondary">{k.c}</td>
                  <td className="py-3 text-text-secondary">{k.u}</td>
                  <td className="py-3 text-right">
                    <button className="text-text-secondary hover:text-text-primary">
                      <MoreHorizontal className="ml-auto size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section icon={Plus} title="Create New API Key" subtitle="Generate a new API key">
        <div className="space-y-5">
          <Field label="Key Name">
            <Input placeholder="e.g., 'Production API', 'Bot Token'" />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium">Permissions (select at least one)</p>
            <div className="grid grid-cols-2 gap-3">
              {["Read Calls", "Write Alerts", "Read Analysis", "Delete Calls", "Read Incidents", "Admin Access"].map((p) => (
                <Checkbox key={p} label={p} />
              ))}
            </div>
          </div>
          <Field label="Expiration">
            <Select value="30 days" width="180px" options={["Never expires", "7 days", "30 days", "90 days", "1 year"]} />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary">Cancel</Btn>
            <Btn variant="primary">Create Key</Btn>
          </div>
        </div>
      </Section>
    </>
  );
}

function Advanced() {
  const info: [string, string][] = [
    ["Platform Version", "v2.4.1"],
    ["Database Version", "PostgreSQL 14.5"],
    ["API Version", "v3.0"],
    ["Last Updated", "2 days ago"],
    ["Uptime", "45 days 12 hours"],
    ["Browser", "Chrome 120"],
    ["Timezone", "UTC +5:30"],
    ["Language", "English (US)"],
  ];
  return (
    <>
      <Section icon={Terminal} title="Debug & Diagnostics" subtitle="System diagnostics and debug options">
        <div className="-my-1">
          <Row label="Enable Debug Mode" sub="Logs detailed system information (reduces performance)">
            <Toggle />
          </Row>
          <Row label="Enable Development Mode" sub="Access experimental features and beta components">
            <Toggle />
          </Row>
          <Row label="Clear Application Cache" sub="Remove cached data to free space">
            <Btn variant="secondary" className="h-9">Clear Cache</Btn>
          </Row>
          <Row label="Download Debug Logs" sub="Export system logs for troubleshooting">
            <Btn variant="secondary" className="h-9">Download Logs</Btn>
          </Row>
        </div>
      </Section>
      <Section icon={Database} title="Data Management" subtitle="Manage stored data and retention policies">
        <div className="-my-1">
          <Row label="Data Retention Period" sub="Keep incident and call data for X days">
            <Select value="90 days" width="160px" options={["30 days", "60 days", "90 days", "180 days", "1 year", "Indefinite"]} />
          </Row>
          <div className="border-b border-line py-4">
            <div className="flex items-center justify-between text-[13px]">
              <p className="font-medium">Storage Usage</p>
              <span className="text-text-secondary">Used: 2.3 GB / 10 GB · 23%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-teal" style={{ width: "23%" }} />
            </div>
          </div>
          <Row label="Auto-Archive Old Data" sub="Automatically archive data older than retention period">
            <Toggle />
          </Row>
        </div>
      </Section>
      <Section icon={Info} title="System Information" subtitle="System and version information">
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-line py-2">
              <span className="text-[13px] text-text-secondary">{k}</span>
              <span className="font-mono text-[13px]">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Btn variant="primary">Check for Updates</Btn>
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
        {tab === "Integrations" && <Integrations />}
        {tab === "API Keys" && <ApiKeys />}
        {tab === "Advanced" && <Advanced />}
      </div>
    </div>
  );
}