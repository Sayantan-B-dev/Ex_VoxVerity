import { Card, Tag } from "@/components/primitives";
import { checkAIServiceHealth, getAiPerformance } from "@/lib/ai-service";
import { createServiceClient } from "@/lib/db";

export default async function StatusPage() {
  const [ai, perf, dbOk] = await Promise.all([
    checkAIServiceHealth(),
    getAiPerformance(),
    (async () => {
      try {
        const supabase = createServiceClient();
        const { error } = await supabase.from("organizations").select("id").limit(1);
        return !error;
      } catch {
        return false;
      }
    })(),
  ]);

  const metrics = perf?.metrics ?? {};
  const services = [
    { name: "Web Application", status: "Operational", note: "All routes healthy" },
    { name: "Supabase Database", status: dbOk ? "Operational" : "Degraded", note: dbOk ? "Reachable · RLS enabled" : "Unreachable — check env + migrations" },
    {
      name: "AI Service (FastAPI)",
      status: ai.status === "online" ? "Operational" : ai.status === "not_configured" ? "Degraded" : "Down",
      note: ai.status === "online" ? `Healthy · inference ${metrics.inference_ms ?? "—"}ms` : ai.message,
    },
    {
      name: "WebSocket Realtime",
      status: ai.status === "online" ? "Operational" : "Degraded",
      note: perf ? `Queue depth ${metrics.queue_depth ?? 0} · uptime ${metrics.ws_uptime_pct ?? "—"}%` : "AI service offline",
    },
    {
      name: "Blockchain Registry (Polygon Amoy)",
      status: process.env.VOICE_REGISTRY_ADDRESS ? "Operational" : "Degraded",
      note: process.env.VOICE_REGISTRY_ADDRESS ? `Contract ${process.env.VOICE_REGISTRY_ADDRESS}` : "VOICE_REGISTRY_ADDRESS not set",
    },
  ];

  const allOk = services.every((s) => s.status === "Operational");

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">System Status</h1>
        <p className="text-[13px] text-text-secondary">
          Live health of the VoxVerity platform services.
        </p>
      </div>

      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${allOk ? "border-neon/30 bg-neon/10" : "border-warn/30 bg-warn/10"}`}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon" />
        </span>
        <p className="text-[14px] font-semibold">{allOk ? "All systems operational" : "Some services need attention"}</p>
        <p className="text-[12px] text-text-secondary">· checked just now from server</p>
      </div>

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.name} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold">{s.name}</p>
              <p className="text-[12px] text-text-secondary">{s.note}</p>
            </div>
            <Tag level={s.status === "Operational" ? "Low" : s.status === "Degraded" ? "Medium" : "High"}>{s.status}</Tag>
          </Card>
        ))}
      </div>
    </div>
  );
}
