import { BarChart3, Activity } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import Candles from "@/components/viz/Candles";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { getCallsData } from "@/lib/data";
import { getAiPerformance } from "@/lib/ai-service";
import { analyticsDemo } from "@/lib/data";

const columns: Column<(typeof analyticsDemo.volumes)[number]>[] = [
  { key: "week", header: "Week", render: (r) => <span className="font-semibold text-text-primary">{r.week}</span> },
  { key: "synthetic", header: "Synthetic", render: (r) => <span className="text-critical">{r.synthetic}</span> },
  { key: "replay", header: "Replay", render: (r) => <span className="text-orange">{r.replay}</span> },
  { key: "conversion", header: "Conversion", render: (r) => <span className="text-purple">{r.conversion}</span> },
  { key: "natural", header: "Natural", render: (r) => <span className="text-teal">{r.natural}</span> },
];

export default async function AnalyticsPage() {
  const { source, calls } = await getCallsData();
  const perf = await getAiPerformance();

  // Live distribution from real call rows; demo volumes/trend stay as illustrative history.
  const dist = [
    { band: "LOW", count: calls.filter((c) => c.riskLevel === "LOW").length, pct: 0 },
    { band: "MEDIUM", count: calls.filter((c) => c.riskLevel === "MEDIUM").length, pct: 0 },
    { band: "HIGH", count: calls.filter((c) => c.riskLevel === "HIGH").length, pct: 0 },
    { band: "CRITICAL", count: calls.filter((c) => c.riskLevel === "CRITICAL").length, pct: 0 },
  ];
  const total = Math.max(1, calls.length);
  dist.forEach((d) => { d.pct = Math.round((d.count / total) * 100); });

  const distribution = source === "live" ? dist : analyticsDemo.distribution;
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const latency = perf?.metrics
    ? {
        avgChunkLatencyMs: perf.metrics.avg_chunk_ms ?? perf.metrics.avgChunkLatencyMs ?? analyticsDemo.latency.avgChunkLatencyMs,
        p95ChunkLatencyMs: perf.metrics.p95_chunk_ms ?? perf.metrics.p95ChunkLatencyMs ?? analyticsDemo.latency.p95ChunkLatencyMs,
        wsUptimePct: perf.metrics.ws_uptime_pct ?? perf.metrics.wsUptimePct ?? analyticsDemo.latency.wsUptimePct,
        queueDepth: perf.metrics.queue_depth ?? perf.metrics.queueDepth ?? 0,
        modelInferenceMs: perf.metrics.inference_ms ?? perf.metrics.modelInferenceMs ?? analyticsDemo.latency.modelInferenceMs,
      }
    : analyticsDemo.latency;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Analytics"
        title="Analytics"
        subtitle={
          source === "demo"
            ? "Detection volumes, risk distribution, and pipeline health. Showing demo data."
            : `Detection volumes across ${calls.length} live calls · pipeline ${perf ? "online" : "offline"}.`
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Risk distribution — live */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Risk Distribution {source === "live" && <span className="text-[11px] text-teal">· live</span>}</h2>
          </div>
          <div className="space-y-3">
            {distribution.map((r) => (
              <div key={r.band}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-text-secondary">{r.band}</span>
                  <span className="font-mono text-text-primary">{r.count} calls · {r.pct}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.count / maxCount) * 100}%`,
                      background:
                        r.band === "CRITICAL"
                          ? "#ff3b3b"
                          : r.band === "HIGH"
                            ? "#ff6b35"
                            : r.band === "MEDIUM"
                              ? "#ffb800"
                              : "#35d6c1",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly risk trend (illustrative history) */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Weekly Risk Trend</h2>
          </div>
          <div className="flex h-40 items-end gap-3">
            {analyticsDemo.trend.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-text-secondary">{d.score}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${(d.score / 72) * 100}%`,
                    background: d.score >= 60 ? "#ff6b35" : d.score >= 40 ? "#ffb800" : "#35d6c1",
                  }}
                />
                <span className="text-[10px] text-text-disabled">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Detection volumes */}
        <Card className="p-6">
          <h2 className="mb-4 text-[17px] font-semibold">Detection Volumes (last 4 weeks)</h2>
          <DataTable columns={columns} rows={analyticsDemo.volumes} />
        </Card>

        {/* Latency / health — live from AI service when online */}
        <Card className="p-6">
          <h2 className="mb-4 text-[17px] font-semibold">Pipeline Health {perf && <span className="text-[11px] text-teal">· live</span>}</h2>
          <div className="space-y-4">
            {[
              { label: "Avg Chunk Latency", value: `${latency.avgChunkLatencyMs}ms`, pct: 64 },
              { label: "P95 Chunk Latency", value: `${latency.p95ChunkLatencyMs}ms`, pct: 98 },
              { label: "Model Inference", value: `${latency.modelInferenceMs}ms`, pct: 31 },
              { label: "WebSocket Uptime", value: `${latency.wsUptimePct}%`, pct: 99.7 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-text-secondary">{m.label}</span>
                  <span className="font-mono text-text-primary">{m.value}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, m.pct)}%`, background: m.pct > 90 ? "#ff6b35" : "#35d6c1" }}
                  />
                </div>
              </div>
            ))}
            <div className="h-16 rounded-xl border border-line bg-elev p-2">
              <Candles />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
