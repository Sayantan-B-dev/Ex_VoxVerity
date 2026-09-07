import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import { latencyStats, liveSession } from "@/lib/demo-data";

const services = [
  { name: "Web Application", status: "Operational" },
  { name: "Supabase Auth & Database", status: "Operational" },
  { name: "AI Service (FastAPI)", status: "Operational" },
  { name: "WebSocket Realtime", status: "Operational" },
  { name: "Blockchain Registry (Polygon Amoy)", status: "Degraded" },
];

const info: [string, string][] = [
  ["Platform Version", "v2.4.1"],
  ["Node Runtime", "24 LTS"],
  ["Next.js", "16.3.4"],
  ["Model Inference", `${latencyStats.modelInferenceMs}ms`],
  ["Chunk Latency (P95)", `${latencyStats.p95ChunkLatencyMs}ms`],
  ["WebSocket Uptime", `${latencyStats.wsUptimePct}%`],
  ["Active Session Model", liveSession.modelVersion],
  ["Last Updated", "2 days ago"],
];

export default function AdminSystemPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="System Diagnostics"
        subtitle="Service health, versions, and pipeline telemetry."
      />

      <Card className="p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Service Health</h2>
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3">
              <span className="text-[14px] font-medium">{s.name}</span>
              <Tag level={s.status === "Operational" ? "Low" : "High"}>{s.status}</Tag>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Versions & Telemetry</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {info.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-line py-2">
              <span className="text-[13px] text-text-secondary">{k}</span>
              <span className="font-mono text-[13px] text-text-primary">{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}