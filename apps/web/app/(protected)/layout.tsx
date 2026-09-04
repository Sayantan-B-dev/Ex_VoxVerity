"use client";

import { useState } from "react";
import Link from "next/link";
import AuthStatus from "@/components/auth-status";
import {
  IconDashboard, IconMic, IconPhone, IconMicroscope,
  IconAlertTriangle, IconSearch, IconCheck, IconFlask,
  IconChart, IconLinkChain, IconList, IconShield, IconBot,
  IconSettings, IconX, IconMenu, IconBell,
} from "@/components/icons";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout-shell">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 301 }}
          className="mobile-overlay"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-primary)" }}>
            VoxVerity
          </Link>
          <button className="btn btn-ghost btn-sm mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <IconX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link href="/dashboard" className="nav-link" onClick={() => setSidebarOpen(false)}><IconDashboard /> Dashboard</Link>
          <Link href="/live" className="nav-link" onClick={() => setSidebarOpen(false)}><IconMic /> Live Monitor</Link>
          <Link href="/calls" className="nav-link" onClick={() => setSidebarOpen(false)}><IconPhone /> Calls</Link>
          <Link href="/analysis" className="nav-link" onClick={() => setSidebarOpen(false)}><IconMicroscope /> Analysis</Link>
        </nav>

        <div className="sidebar-section-title">Security Operations</div>
        <nav className="sidebar-nav">
          <Link href="/alerts" className="nav-link" onClick={() => setSidebarOpen(false)}><IconAlertTriangle /> Alerts</Link>
          <Link href="/incidents" className="nav-link" onClick={() => setSidebarOpen(false)}><IconSearch /> Incidents</Link>
          <Link href="/verification" className="nav-link" onClick={() => setSidebarOpen(false)}><IconCheck /> Verification</Link>
          <Link href="/lab" className="nav-link" onClick={() => setSidebarOpen(false)}><IconFlask /> Analysis Lab</Link>
        </nav>

        <div className="sidebar-section-title">Intelligence</div>
        <nav className="sidebar-nav">
          <Link href="/analytics" className="nav-link" onClick={() => setSidebarOpen(false)}><IconChart /> Analytics</Link>
          <Link href="/blockchain" className="nav-link" onClick={() => setSidebarOpen(false)}><IconLinkChain /> Evidence</Link>
          <Link href="/audit" className="nav-link" onClick={() => setSidebarOpen(false)}><IconList /> Audit</Link>
          <Link href="/threat-intelligence" className="nav-link" onClick={() => setSidebarOpen(false)}><IconShield /> Threats</Link>
        </nav>

        <div className="sidebar-section-title">Configuration</div>
        <nav className="sidebar-nav">
          <Link href="/integrations" className="nav-link" onClick={() => setSidebarOpen(false)}><IconLinkChain /> Integrations</Link>
          <Link href="/models" className="nav-link" onClick={() => setSidebarOpen(false)}><IconBot /> Models</Link>
          <Link href="/settings" className="nav-link" onClick={() => setSidebarOpen(false)}><IconSettings /> Settings</Link>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border)" }}>
          <div className="sidebar-section-title">Admin</div>
          <nav className="sidebar-nav">
            <Link href="/admin" className="nav-link" onClick={() => setSidebarOpen(false)}><IconShield /> Admin Panel</Link>
          </nav>
        </div>

        <div style={{ paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border)" }}>
          <AuthStatus />
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-3) var(--space-6)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          position: "sticky", top: 0, zIndex: 200,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <button className="btn btn-ghost btn-sm mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <IconMenu />
            </button>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              Organization: Acme Corp
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <button className="btn btn-ghost btn-sm" style={{ position: "relative" }}>
              <IconBell />
              <span style={{
                position: "absolute", top: -2, right: -2,
                width: 16, height: 16, borderRadius: "var(--radius-full)",
                background: "var(--color-danger)", color: "var(--color-text-inverse)",
                fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "var(--weight-bold)",
              }}>3</span>
            </button>
            <AuthStatus />
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
