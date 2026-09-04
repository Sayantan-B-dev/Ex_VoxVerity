import { createClient } from "@/lib/supabase/server";

export async function getDashboardData(userEmail: string) {
  const supabase = await createClient();

  // Get user's organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("email", userEmail)
    .single();

  if (!profile?.organization_id) {
    return { calls: [], alerts: [], incidents: [], stats: { activeSessions: 0, totalAlerts: 0, openIncidents: 0, avgRisk: 0 } };
  }

  const orgId = profile.organization_id;

  // Fetch recent calls
  const { data: calls } = await supabase
    .from("calls")
    .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms")
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(5);

  // Fetch recent alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, severity, message, acknowledged, created_at, call_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch open incidents
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, status, risk_score, risk_severity, scope, created_at")
    .eq("organization_id", orgId)
    .in("status", ["OPEN", "INVESTIGATING"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Stats
  const activeSessions = calls?.filter((c) => c.status === "active").length ?? 0;
  const totalAlerts = alerts?.filter((a) => !a.acknowledged).length ?? 0;
  const openIncidents = incidents?.length ?? 0;
  const latestRisk = calls?.[0]?.risk_score ?? 0;

  return {
    calls: calls ?? [],
    alerts: alerts ?? [],
    incidents: incidents ?? [],
    stats: { activeSessions, totalAlerts, openIncidents, avgRisk: latestRisk },
  };
}
