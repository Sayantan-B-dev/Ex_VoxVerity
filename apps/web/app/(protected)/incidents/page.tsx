import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { getIncidentsData } from "@/lib/data";
import { timeAgo } from "@/lib/format";

const statusTone: Record<string, string> = {
  OPEN: "Medium",
  INVESTIGATING: "High",
  CONTAINED: "High",
  RESOLVED: "Low",
  FALSE_POSITIVE: "Low",
};

export default async function IncidentsPage() {
  const incidents = await getIncidentsData();

  const columns: Column<(typeof incidents)[number]>[] = [
    {
      key: "id",
      header: "Incident",
      render: (i) => <span className="font-mono font-semibold text-teal">{i.id}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <Tag level={statusTone[i.status]}>{i.status}</Tag>,
    },
    {
      key: "scope",
      header: "Scope",
      render: (i) => (
        <div>
          <p className="max-w-[360px] truncate font-medium text-text-primary">{i.scope}</p>
          <p className="text-[11px] text-text-disabled">Owner: {i.owner}</p>
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      render: (i) => <span className="font-mono text-text-primary">{i.risk}/100</span>,
    },
    {
      key: "opened",
      header: "Opened",
      render: (i) => <span className="text-text-secondary">{timeAgo(i.opened)}</span>,
    },
    {
      key: "open",
      header: "",
      render: (i) => (
        <Link href={`/incidents/${i.id}`} className="inline-flex items-center text-teal hover:underline">
          Open <ChevronRight className="size-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Incidents"
        title="Incidents"
        subtitle="Investigation containers linked to alerts, calls, and evidence."
      />

      <Card className="p-6">
        <DataTable columns={columns} rows={incidents} />
      </Card>
    </div>
  );
}