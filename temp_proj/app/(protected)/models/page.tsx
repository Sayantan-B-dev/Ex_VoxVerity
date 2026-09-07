import { Bot } from "lucide-react";
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
  { key: "source", header: "Source", render: (m) => <span className="max-w-[260px] truncate text-text-secondary">{m.source}</span> },
  { key: "license", header: "License", render: (m) => <span className="text-text-secondary">{m.license}</span> },
  { key: "status", header: "Status", render: (m) => <Tag level={statusTone[m.status]}>{m.status}</Tag> },
];

export default function ModelsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Models"
        title="Model Registry"
        subtitle="Governance metadata for every model and policy version."
      />

      <Card className="p-6">
        <DataTable columns={columns} rows={models} />
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <Bot className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Every analysis event records the model ID and version used. Model outputs are signals,
          not calibrated probabilities — evaluation notes document known limitations per model.
        </p>
      </Card>
    </div>
  );
}