import { Card, Tag } from "@/components/primitives";
import { latencyStats } from "@/lib/demo-data";

const services = [
  { name: "Web Application", status: "Operational", note: "All routes healthy" },
  { name: "Supabase Auth & Database", status: "Operational", note: "RLS enabled on all exposed tables" },
  { name: "AI Service (FastAPI)", status: "Operational", note: `Inference ${latencyStats.modelInferenceMs}ms · model aasist-l@1.4.0` },
  { name: "WebSocket Realtime", status: "Operational", note: `P95 chunk latency ${latencyStats.p95ChunkLatencyMs}ms` },
  { name: "Blockchain Registry (Polygon Amoy)", status: "Degraded", note: "1 pending registration — retrying" },
];

export default function StatusPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">System Status</h1>
        <p className="text-[13px] text-text-secondary">
          Live health of the VoxVerity platform services.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-neon/30 bg-neon/10 p-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon" />
        </span>
        <p className="text-[14px] font-semibold">All systems operational</p>
        <p className="text-[12px] text-text-secondary">· WebSocket uptime {latencyStats.wsUptimePct}% · Queue depth {latencyStats.queueDepth}</p>
      </div>

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.name} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold">{s.name}</p>
              <p className="text-[12px] text-text-secondary">{s.note}</p>
            </div>
            <Tag level={s.status === "Operational" ? "Low" : "High"}>{s.status}</Tag>
          </Card>
        ))}
      </div>
    </div>
  );
}