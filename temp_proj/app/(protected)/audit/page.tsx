import { ScrollText, Download } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { auditEvents } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

const outcomeTone: Record<string, string> = {
  Success: "Low",
  Denied: "Critical",
  Failed: "High",
};

const columns: Column<(typeof auditEvents)[number]>[] = [
  { key: "id", header: "Event", render: (e) => <span className="font-mono text-text-disabled">{e.id}</span> },
  { key: "actor", header: "Actor", render: (e) => <span className="font-medium text-text-primary">{e.actor}</span> },
  { key: "action", header: "Action", render: (e) => <span className="font-mono text-teal">{e.action}</span> },
  { key: "target", header: "Target", render: (e) => <span className="text-text-secondary">{e.target}</span> },
  {
    key: "outcome",
    header: "Outcome",
    render: (e) => <Tag level={outcomeTone[e.outcome]}>{e.outcome}</Tag>,
  },
  { key: "at", header: "Time", render: (e) => <span className="text-text-secondary">{timeAgo(e.at)}</span> },
];

export default function AuditPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Audit"
        title="Audit Trail"
        subtitle="Security-relevant actions across the platform."
        actions={
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-elev px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary">
            <Download className="size-4" /> Export
          </button>
        }
      />

      <Card className="p-6">
        <DataTable columns={columns} rows={auditEvents} />
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <ScrollText className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Audit events never contain raw audio, access tokens, or passwords. Logs reference
          session/record IDs only.
        </p>
      </Card>
    </div>
  );
}