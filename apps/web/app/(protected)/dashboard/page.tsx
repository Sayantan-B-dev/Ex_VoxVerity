import Link from "next/link";
import { IconMic, IconFolder, IconPhone, IconSearch, IconSettings } from "@/components/icons";

const mockKpis = [
  { label: "Active Sessions", value: "3", trend: "+2 today", color: "var(--color-primary)" },
  { label: "Risk Score (Latest)", value: "42", trend: "MEDIUM", color: "var(--risk-medium)" },
  { label: "Alerts (24h)", value: "7", trend: "3 unresolved", color: "var(--risk-high)" },
  { label: "Open Incidents", value: "2", trend: "1 critical", color: "var(--risk-critical)" },
];

const recentAlerts = [
  { id: "a1", severity: "HIGH", message: "Synthetic voice signal detected on session #1042", time: "2 min ago" },
  { id: "a2", severity: "MEDIUM", message: "Speaker similarity mismatch on session #1041", time: "18 min ago" },
  { id: "a3", severity: "CRITICAL", message: "Risk threshold 85/100 exceeded on session #1039", time: "1 hr ago" },
];

const severityColor: Record<string, string> = {
  LOW: "badge-low",
  MEDIUM: "badge-medium",
  HIGH: "badge-high",
  CRITICAL: "badge-critical",
};

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link href="/live" className="btn btn-primary">Start Protection</Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-8)" }}>
        {mockKpis.map((kpi) => (
          <div className="card" key={kpi.label}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: kpi.color }}>
              {kpi.value}
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              {kpi.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-2">
        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Alerts</h3>
            <Link href="/alerts" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {recentAlerts.map((alert) => (
              <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <span className={`badge ${severityColor[alert.severity]}`}>{alert.severity}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "var(--text-sm)" }}>{alert.message}</p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
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

      {/* Open Incidents */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="card-header">
          <h3 className="card-title">Open Incidents</h3>
          <Link href="/incidents" className="btn btn-ghost btn-sm">View all</Link>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Session</th>
                <th>Risk</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INC-1039</td>
                <td><span className="badge badge-critical">OPEN</span></td>
                <td>#1039</td>
                <td><span className="risk-score risk-score-critical" style={{ fontSize: "var(--text-sm)" }}>85/100</span></td>
                <td>1 hr ago</td>
              </tr>
              <tr>
                <td>INC-1041</td>
                <td><span className="badge badge-high">INVESTIGATING</span></td>
                <td>#1041</td>
                <td><span className="risk-score risk-score-high" style={{ fontSize: "var(--text-sm)" }}>62/100</span></td>
                <td>2 hr ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
