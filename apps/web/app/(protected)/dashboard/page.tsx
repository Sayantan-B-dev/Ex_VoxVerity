import Link from "next/link";
import { auth } from "@/auth";
import { getDashboardData } from "@/lib/supabase/queries";
import { checkAIServiceHealth } from "@/lib/ai-service";
import { IconMic, IconFolder, IconPhone, IconSearch, IconSettings } from "@/components/icons";

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

// Mock fallback when DB is not connected
const mockStats = { activeSessions: 3, totalAlerts: 3, openIncidents: 2, avgRisk: 42 };
const mockAlerts = [
  { id: "mock-1", severity: "CRITICAL", message: "Risk threshold 85/100 exceeded", acknowledged: false, created_at: new Date(Date.now() - 3600000).toISOString(), call_id: null },
  { id: "mock-2", severity: "HIGH", message: "Synthetic voice signal detected", acknowledged: false, created_at: new Date(Date.now() - 1080000).toISOString(), call_id: null },
  { id: "mock-3", severity: "MEDIUM", message: "Speaker similarity mismatch", acknowledged: true, created_at: new Date(Date.now() - 21600000).toISOString(), call_id: null },
];

export default async function DashboardPage() {
  let data;
  let usingMock = false;

  try {
    const session = await auth();
    const email = session?.user?.email;
    if (email) {
      data = await getDashboardData(email);
    } else {
      usingMock = true;
    }
  } catch {
    usingMock = true;
  }

  if (usingMock || !data) {
    data = { calls: [], alerts: mockAlerts, incidents: [], stats: mockStats };
  }

  const aiHealth = await checkAIServiceHealth();

  const { stats, alerts, incidents, calls } = data;

  const severityBadge: Record<string, string> = {
    LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high", CRITICAL: "badge-critical",
  };

  const kpis = [
    { label: "Active Sessions", value: stats.activeSessions, color: "var(--color-primary)" },
    { label: "Risk Score (Latest)", value: stats.avgRisk, color: "var(--risk-medium)" },
    { label: "Unresolved Alerts", value: stats.totalAlerts, color: "var(--risk-high)" },
    { label: "Open Incidents", value: stats.openIncidents, color: "var(--risk-critical)" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link href="/live" className="btn btn-primary">Start Protection</Link>
      </div>

      {usingMock && (
        <div className="alert alert-info" style={{ marginBottom: "var(--space-6)" }}>
          Showing mock data. Connect Supabase and run migrations for live data.
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: "var(--space-8)" }}>
        {kpis.map((kpi) => (
          <div className="card" key={kpi.label}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>{kpi.label}</p>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* AI Service Status */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: aiHealth.status === "online" ? "var(--color-success)" : aiHealth.status === "not_configured" ? "var(--color-text-muted)" : "var(--color-danger)" }} />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>AI Service</span>
            <span className={`badge ${aiHealth.status === "online" ? "badge-success" : aiHealth.status === "not_configured" ? "badge-low" : "badge-danger"}`}> 
              {aiHealth.status === "online" ? "Online" : aiHealth.status === "not_configured" ? "Not Configured" : "Offline"}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{aiHealth.message}</span>
          </div>
          <Link href="/admin/system" className="btn btn-ghost btn-sm">Details</Link>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Alerts</h3>
            <Link href="/alerts" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {alerts.map((alert: { id: string; severity: string; message: string; acknowledged: boolean; created_at: string }) => (
              <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", opacity: alert.acknowledged ? 0.6 : 1 }}>
                <span className={`badge ${severityBadge[alert.severity]}`}>{alert.severity}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "var(--text-sm)" }}>{alert.message}</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{timeAgo(alert.created_at)}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>No alerts.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Link href="/live" className="btn btn-primary" style={{ justifyContent: "flex-start" }}><IconMic /> Start Live Monitor</Link>
            <Link href="/lab/audio" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}><IconFolder /> Upload Audio to Lab</Link>
            <Link href="/calls" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}><IconPhone /> View All Calls</Link>
            <Link href="/incidents" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}><IconSearch /> Review Incidents</Link>
            <Link href="/settings" className="btn btn-ghost" style={{ justifyContent: "flex-start" }}><IconSettings /> Settings</Link>
          </div>
        </div>
      </div>

      {incidents.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <div className="card-header">
            <h3 className="card-title">Open Incidents</h3>
            <Link href="/incidents" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>ID</th><th>Status</th><th>Risk</th><th>Scope</th><th>Opened</th></tr></thead>
              <tbody>
                {incidents.map((inc: { id: string; status: string; risk_score: number; risk_severity: string; scope: string | null; created_at: string }) => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: "var(--weight-medium)" }}>INC-{inc.id.slice(0, 8)}</td>
                    <td><span className={`badge ${severityBadge[inc.risk_severity] ?? "badge-low"}`}>{inc.status}</span></td>
                    <td><span className={`risk-score risk-score-${inc.risk_severity.toLowerCase()}`} style={{ fontSize: "var(--text-sm)" }}>{inc.risk_score}/100</span></td>
                    <td style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>{inc.scope ?? "—"}</td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{timeAgo(inc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
