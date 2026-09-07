import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { orgUsers } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

const statusTone: Record<string, string> = {
  Active: "Low",
  Invited: "Medium",
  Suspended: "High",
};

const columns: Column<(typeof orgUsers)[number]>[] = [
  {
    key: "name",
    header: "User",
    render: (u) => (
      <div>
        <p className="font-medium text-text-primary">{u.name}</p>
        <p className="text-[11px] text-text-disabled">{u.email}</p>
      </div>
    ),
  },
  { key: "role", header: "Role", render: (u) => <span className="font-mono text-teal">{u.role}</span> },
  { key: "status", header: "Status", render: (u) => <Tag level={statusTone[u.status]}>{u.status}</Tag> },
  { key: "active", header: "Last Active", render: (u) => <span className="text-text-secondary">{timeAgo(u.lastActive)}</span> },
];

export default function AdminUsersPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="Users"
        subtitle="Organization members and their roles."
      />
      <Card className="p-6">
        <DataTable columns={columns} rows={orgUsers} />
      </Card>
    </div>
  );
}