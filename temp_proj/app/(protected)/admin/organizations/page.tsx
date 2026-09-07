import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { organizations } from "@/lib/demo-data";

const columns: Column<(typeof organizations)[number]>[] = [
  { key: "id", header: "ID", render: (o) => <span className="font-mono text-teal">{o.id}</span> },
  { key: "name", header: "Organization", render: (o) => <span className="font-semibold text-text-primary">{o.name}</span> },
  { key: "plan", header: "Plan", render: (o) => <span className="text-text-secondary">{o.plan}</span> },
  { key: "members", header: "Members", render: (o) => <span className="font-mono text-text-primary">{o.members}</span> },
  { key: "status", header: "Status", render: (o) => <Tag level={o.status === "Active" ? "Low" : "Medium"}>{o.status}</Tag> },
];

export default function AdminOrganizationsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="Organizations"
        subtitle="Tenant boundaries. Every table is organization-scoped with RLS."
      />
      <Card className="p-6">
        <DataTable columns={columns} rows={organizations} />
      </Card>
    </div>
  );
}