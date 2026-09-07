import { ShieldAlert, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import Sonar from "@/components/viz/Sonar";
import { getThreatsData } from "@/lib/data";
import { timeAgo } from "@/lib/format";

export default async function ThreatIntelligencePage() {
  const { source, campaigns } = await getThreatsData();
  const maxRisk = Math.max(1, ...campaigns.map((c) => c.risk));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Threats"
        title="Threat Intelligence"
        subtitle={
          source === "demo"
            ? "Campaign patterns and indicators. Showing demo data — connect Supabase for live campaigns."
            : "Campaign patterns and indicators across protected channels."
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <p className="self-start text-[15px] font-semibold">Campaign Pressure</p>
          <Sonar value={maxRisk} />
          <p className="text-center text-[12px] leading-relaxed text-text-secondary">
            {campaigns.length} active campaign{campaigns.length === 1 ? "" : "s"}. Synthetic voice cloning is the dominant attack pattern this
            week.
          </p>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldAlert className="size-5 text-orange" />
                    <p className="text-[15px] font-semibold">{c.name}</p>
                    <Tag level={c.risk >= 76 ? "Critical" : c.risk >= 51 ? "High" : "Medium"}>
                      Risk {c.risk}
                    </Tag>
                  </div>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    {typeof c.id === "string" && c.id.length > 8 ? c.id.slice(0, 8) : c.id} · Attack: {c.attack} · {c.activeSessions} active sessions · last seen{" "}
                    {timeAgo(c.lastSeen)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.indicators.map((ind) => (
                      <span
                        key={ind}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-elev px-2 py-0.5 text-[11px] text-text-secondary"
                      >
                        <MapPin className="size-3 text-teal" /> {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
