import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/api-auth";
import { getAiAnalyticsDashboard, getAiAnalyticsTrends, getAiPerformance } from "@/lib/ai-service";

/**
 * GET /api/analytics/live — org DB aggregates + AI-service pipeline health.
 * Pages render this when live; fall back to demo when empty/offline.
 */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const [callsRes, dailyRes, threatsRes, healthRes] = await Promise.all([
    ctx.supabase.from("calls").select("risk_score, risk_severity, started_at").eq("organization_id", ctx.orgId).order("started_at", { ascending: false }).limit(500),
    ctx.supabase.from("analytics_daily").select("*").eq("organization_id", ctx.orgId).order("day", { ascending: true }).limit(30),
    ctx.supabase.from("threat_campaigns").select("*").eq("organization_id", ctx.orgId).order("risk", { ascending: false }).limit(20),
    ctx.supabase.from("pipeline_health").select("*").eq("organization_id", ctx.orgId).order("recorded_at", { ascending: false }).limit(1),
  ]);
  const calls = callsRes.data ?? [];
  const dist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const c of calls) {
    const s = (c.risk_severity ?? "LOW").toUpperCase();
    if (s in dist) dist[s as keyof typeof dist]++;
  }
  const [aiDash, aiTrends, aiPerf] = await Promise.all([
    getAiAnalyticsDashboard(),
    getAiAnalyticsTrends(24),
    getAiPerformance(),
  ]);
  return NextResponse.json({
    source: calls.length ? "live" : "demo",
    calls: calls.length,
    distribution: dist,
    avgRisk: calls.length ? Math.round(calls.reduce((a, c) => a + (c.risk_score ?? 0), 0) / calls.length) : 0,
    daily: dailyRes.data ?? [],
    threats: threatsRes.data ?? [],
    pipeline: healthRes.data?.[0] ?? null,
    ai: { dashboard: aiDash, trends: aiTrends, performance: aiPerf },
  });
}
