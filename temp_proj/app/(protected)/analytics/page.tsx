import { BarChart3, Activity } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import Candles from "@/components/viz/Candles";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { weeklyRiskTrend, riskDistribution, detectionVolumes, latencyStats } from "@/lib/demo-data";

const columns: Column<(typeof detectionVolumes)[number]>[] = [
  { key: "week", header: "Week", render: (r) => <span className="font-semibold text-text-primary">{r.week}</span> },
  { key: "synthetic", header: "Synthetic", render: (r) => <span className="text-critical">{r.synthetic}</span> },
  { key: "replay", header: "Replay", render: (r) => <span className="text-orange">{r.replay}</span> },
  { key: "conversion", header: "Conversion", render: (r) => <span className="text-purple">{r.conversion}</span> },
  { key: "natural", header: "Natural", render: (r) => <span className="text-teal">{r.natural}</span> },
];

export default function AnalyticsPage() {
  const maxScore = Math.max(...weeklyRiskTrend.map((d) => d.score));
  const maxCount = Math.max(...riskDistribution.map((d) => d.count));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Analytics"
        title="Analytics"
        subtitle="Detection volumes, risk distribution, and pipeline health."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Weekly risk trend */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Weekly Risk Trend</h2>
          </div>
          <div className="flex h-40 items-end gap-3">
            {weeklyRiskTrend.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-text-secondary">{d.score}</span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${(d.score / maxScore) * 100}%`,
                    background: d.score >= 60 ? "#ff6b35" : d.score >= 40 ? "#ffb800" : "#35d6c1",
                  }}
                />
                <span className="text-[10px] text-text-disabled">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk distribution */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Risk Distribution</h2>
          </div>
          <div className="space-y-3">
            {riskDistribution.map((r) => (
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

        {/* Detection volumes */}
        <Card className="p-6">
          <h2 className="mb-4 text-[17px] font-semibold">Detection Volumes (last 4 weeks)</h2>
          <DataTable columns={columns} rows={detectionVolumes} />
        </Card>

        {/* Latency / health */}
        <Card className="p-6">
          <h2 className="mb-4 text-[17px] font-semibold">Pipeline Health</h2>
          <div className="space-y-4">
            {[
              { label: "Avg Chunk Latency", value: `${latencyStats.avgChunkLatencyMs}ms`, pct: 64 },
              { label: "P95 Chunk Latency", value: `${latencyStats.p95ChunkLatencyMs}ms`, pct: 98 },
              { label: "Model Inference", value: `${latencyStats.modelInferenceMs}ms`, pct: 31 },
              { label: "WebSocket Uptime", value: `${latencyStats.wsUptimePct}%`, pct: 99.7 },
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