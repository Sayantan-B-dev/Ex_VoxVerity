import { Plug, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { getIntegrationsData } from "@/lib/data";

export default async function IntegrationsPage() {
  const { source, integrations } = await getIntegrationsData();
  const connected = integrations.filter((i) => i.connected);
  const available = integrations.filter((i) => !i.connected);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Integrations"
        title="Integrations"
        subtitle={
          source === "demo"
            ? "Connect external services to alerts, evidence, and telephony. Showing demo data."
            : "Connect external services to alerts, evidence, and telephony."
        }
      />

      <Card className="p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Connected Services</h2>
        <div className="space-y-2">
          {connected.map((i) => (
            <div
              key={i.id}
              className="flex flex-col gap-2 rounded-xl border border-line bg-elev p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-card text-teal">
                  <Plug className="size-4" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">{i.name}</p>
                  <p className="text-[12px] text-text-secondary">{i.sync}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tag level="Low">Connected</Tag>
                <button className="rounded-lg border border-line bg-elev px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary">
                  Settings
                </button>
              </div>
            </div>
          ))}
          {connected.length === 0 && <p className="text-[13px] text-text-secondary">No connected services.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Available Integrations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((i) => (
            <div
              key={i.id}
              className="flex flex-col items-center gap-3 rounded-xl border border-line bg-elev p-6 text-center transition-colors hover:border-white/15"
            >
              <div className="grid size-12 place-items-center rounded-xl bg-card text-teal">
                <Plug className="size-5" />
              </div>
              <p className="text-[14px] font-medium">{i.name}</p>
              <p className="text-[12px] leading-relaxed text-text-secondary">{i.description}</p>
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
                <Plus className="size-4" /> Connect
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
