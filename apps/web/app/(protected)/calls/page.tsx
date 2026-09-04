"use client";

import { useState } from "react";
import Link from "next/link";

const mockCalls = [
  { id: "1042", source: "WebRTC", user: "alice@acme.com", duration: "4:32", risk: 42, severity: "MEDIUM", alert: false, time: "2 min ago" },
  { id: "1041", source: "WebRTC", user: "bob@acme.com", duration: "12:08", risk: 62, severity: "HIGH", alert: true, time: "18 min ago" },
  { id: "1039", source: "Microphone", user: "carol@acme.com", duration: "2:15", risk: 85, severity: "CRITICAL", alert: true, time: "1 hr ago" },
  { id: "1038", source: "WebRTC", user: "dave@acme.com", duration: "8:44", risk: 18, severity: "LOW", alert: false, time: "2 hr ago" },
  { id: "1035", source: "WebRTC", user: "alice@acme.com", duration: "6:21", risk: 31, severity: "MEDIUM", alert: false, time: "3 hr ago" },
  { id: "1032", source: "Microphone", user: "eve@acme.com", duration: "1:58", risk: 12, severity: "LOW", alert: false, time: "5 hr ago" },
  { id: "1030", source: "WebRTC", user: "bob@acme.com", duration: "15:02", risk: 71, severity: "HIGH", alert: true, time: "6 hr ago" },
  { id: "1028", source: "WebRTC", user: "frank@acme.com", duration: "3:47", risk: 8, severity: "LOW", alert: false, time: "8 hr ago" },
];

const severityBadge: Record<string, string> = {
  LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high", CRITICAL: "badge-critical",
};

export default function CallsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = mockCalls.filter((c) => {
    if (filter !== "all" && c.severity !== filter) return false;
    if (search && !c.user.includes(search) && !c.id.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Calls</h1>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="Search by user or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {["all", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Source</th>
              <th>User</th>
              <th>Duration</th>
              <th>Risk</th>
              <th>Alert</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((call) => (
              <tr key={call.id}>
                <td style={{ fontWeight: "var(--weight-medium)" }}>#{call.id}</td>
                <td>{call.source}</td>
                <td>{call.user}</td>
                <td>{call.duration}</td>
                <td>
                  <span className={`risk-score risk-score-${call.severity.toLowerCase()}`} style={{ fontSize: "var(--text-sm)" }}>
                    {call.risk}/100
                  </span>
                </td>
                <td>
                  {call.alert ? (
                    <span className="badge badge-danger">ALERT</span>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }}>—</span>
                  )}
                </td>
                <td style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{call.time}</td>
                <td>
                  <Link href={`/calls/${call.id}`} className="btn btn-ghost btn-sm">View</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
                  No calls match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
