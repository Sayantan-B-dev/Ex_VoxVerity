import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { models } from "@/lib/demo-data";

const statusTone: Record<string, string> = {
  Active: "Low",
  Evaluating: "Medium",
  Retired: "High",
};

const columns: Column<(typeof models)[number]>[] = [
  { key: "id", header: "ID", render: (m) => <span className="font-mono text-teal">{m.id}</span> },
  { key: "name", header: "Model", render: (m) => <span className="font-semibold text-text-primary">{m.name}</span> },
  { key: "version", header: "Version", render: (m) => <span className="font-mono text-text-secondary">{m.version}</span> },
  { key: "license", header: "License", render: (m) => <span className="text-text-secondary">{m.license}</span> },
  { key: "status", header: "Status", render: (m) => <Tag level={statusTone[m.status]}>{m.status}</Tag> },
  {
    key: "notes",
    header: "Evaluation Notes",
    render: (m) => <span className="max-w-[280px] truncate text-[12px] text-text-secondary">{m.evalNotes}</span>,
  },
];

export default function AdminModelsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="Model Governance"
        subtitle="Registry of models, versions, licenses, and evaluation notes."
      />
      <Card className="p-6">
        <DataTable columns={columns} rows={models} />
      </Card>
    </div>
  );
}