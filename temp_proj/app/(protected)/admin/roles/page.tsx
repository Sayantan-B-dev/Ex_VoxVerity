import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { roles } from "@/lib/demo-data";

export default function AdminRolesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="Roles"
        subtitle="Role definitions and their permission sets."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id} className="p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[15px] font-semibold text-teal">{r.name}</p>
              <Tag level="Medium">{r.id.replace("ROLE-", "")}</Tag>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {r.permissions.map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-line bg-elev px-2 py-0.5 font-mono text-[11px] text-text-secondary"
                >
                  {p}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}