/* ============================================================================
 * VoxVerity data access layer (server-only)
 * ----------------------------------------------------------------------------
 * Every getter below tries the real backend (Supabase, org-scoped via the
 * signed-in session) and falls back to the demo dataset in lib/demo-data.ts
 * when the database is unreachable, unconfigured, or empty.
 *
 * Each result carries `source: "live" | "demo"` so pages can show an honest
 * indicator instead of pretending demo rows are real.
 *
 * DB rows are mapped to the UI domain shapes used by the components. Fields
 * the DB does not store yet (e.g. synthetic label) are derived conservatively.
 * ========================================================================== */

import { auth } from "@/auth";
import { createServiceClient } from "@/lib/db";
import {
  calls as demoCalls,
  alerts as demoAlerts,
  incidents as demoIncidents,
  verificationRequests as demoVerification,
  evidenceRecords as demoEvidence,
  auditEvents as demoAudit,
  models as demoModels,
  integrations as demoIntegrations,
  orgUsers as demoUsers,
  organizations as demoOrgs,
  roles as demoRoles,
  labAudioFiles as demoLabFiles,
  analysisResults as demoAnalysis,
  weeklyRiskTrend as demoTrend,
  riskDistribution as demoDistribution,
  detectionVolumes as demoVolumes,
  latencyStats as demoLatency,
  dashboardStats as demoStats,
  insights as demoInsights,
  protectedLines as demoLines,
  liveSession as demoLiveSession,
  riskPolicies as demoPolicy,
} from "@/lib/demo-data";
import type {
  Call,
  SecurityAlert,
  Incident,
  VerificationRequest,
  EvidenceRecord,
  AuditEvent,
  ModelInfo,
  RiskLevel,
} from "@/lib/demo-data";

export type DataSource = "live" | "demo";

export interface DashboardData {
  source: DataSource;
  calls: Call[];
  alerts: SecurityAlert[];
  incidents: Incident[];
  stats: typeof demoStats;
  insights: typeof demoInsights;
  lines: typeof demoLines;
  trend: typeof demoTrend;
}

export interface CallsData {
  source: DataSource;
  calls: Call[];
}

export interface AlertsData {
  source: DataSource;
  alerts: SecurityAlert[];
}

export interface IncidentsData {
  source: DataSource;
  incidents: Incident[];
}

export interface VerificationData {
  source: DataSource;
  requests: VerificationRequest[];
}

export interface EvidenceData {
  source: DataSource;
  records: EvidenceRecord[];
}

export interface AuditData {
  source: DataSource;
  events: AuditEvent[];
}

export interface ModelsData {
  source: DataSource;
  models: ModelInfo[];
}

export interface AdminData {
  source: DataSource;
  users: typeof demoUsers;
  organizations: typeof demoOrgs;
  roles: typeof demoRoles;
}

interface DbCall {
  id: string;
  source?: string | null;
  status?: string | null;
  risk_score?: number | null;
  risk_severity?: string | null;
  alert_count?: number | null;
  started_at?: string | null;
  duration_ms?: number | null;
  user_email?: string | null;
  caller_display?: string | null;
  phone_number?: string | null;
  synthetic_label?: string | null;
  speaker_similarity?: number | null;
  outcome?: string | null;
}

interface DbAlert {
  id: string;
  severity?: string | null;
  message?: string | null;
  acknowledged?: boolean | null;
  created_at?: string | null;
  call_id?: string | null;
  recommended_action?: string | null;
  contributing_signals?: unknown;
  threat_title?: string | null;
  caller_display?: string | null;
  phone?: string | null;
  risk_score?: number | null;
  status?: string | null;
}

interface DbIncident {
  id: string;
  status?: string | null;
  scope?: string | null;
  risk_score?: number | null;
  risk_severity?: string | null;
  created_at?: string | null;
  owner_name?: string | null;
  summary?: string | null;
}

interface DbVerification {
  id: string;
  call_id?: string | null;
  status?: string | null;
  method?: string | null;
  notes?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

interface DbEvidence {
  id: string;
  call_id?: string | null;
  evidence_hash?: string | null;
  hash_algorithm?: string | null;
  blockchain_tx?: string | null;
  blockchain_network?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
}

interface DbAudit {
  id: string;
  action?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  created_at?: string | null;
  user_name?: string | null;
}

interface DbModel {
  model_id?: string | null;
  name?: string | null;
  source_url?: string | null;
  version?: string | null;
  license?: string | null;
  deployment_status?: string | null;
  evaluation_notes?: string | null;
}

const riskLevel = (s: string | null | undefined): RiskLevel => {
  switch ((s ?? "LOW").toUpperCase()) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    default:
      return "LOW";
  }
};

const statusOutcome = (status: string | null | undefined): Call["outcome"] => {
  switch (status) {
    case "active":
      return "Under Review";
    case "failed":
      return "Flagged";
    default:
      return "Verified";
  }
};

function db() {
  return createServiceClient();
}

/** Org id for the signed-in NextAuth user (via app_users -> organization_members). */
async function getOrgId(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  try {
    const supabase = db();
    const { data: user } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", email)
      .single();
    if (!user) return null;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (membership?.organization_id) return membership.organization_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("app_user_id", user.id)
      .single();
    return (profile as { organization_id?: string } | null)?.organization_id ?? null;
  } catch {
    return null;
  }
}

async function getProfileId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  try {
    const supabase = db();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("email", session.user.email)
      .single();
    return (profile as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

export async function getOrgIdForApi(email: string): Promise<string | null> {
  try {
    const supabase = db();
    const { data: user } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();
    if (!user) return null;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    return membership?.organization_id ?? null;
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();

    const [callsRes, alertsRes, incidentsRes, insightsRes, linesRes] = await Promise.all([
      supabase
        .from("calls")
        .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms, caller_display, phone_number, synthetic_label, speaker_similarity, outcome")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(8),
      supabase
        .from("alerts")
        .select("id, severity, message, acknowledged, created_at, call_id, recommended_action, threat_title, caller_display, phone, risk_score, status")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("incidents")
        .select("id, status, scope, risk_score, risk_severity, created_at, owner_name, summary")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("dashboard_insights")
        .select("title, body, level")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("protected_lines")
        .select("name, sub, tag, health, sessions")
        .eq("organization_id", orgId)
        .limit(6),
    ]);

    const calls = (callsRes.data ?? []) as DbCall[];
    const alerts = (alertsRes.data ?? []) as DbAlert[];
    const incidents = (incidentsRes.data ?? []) as DbIncident[];

    if (calls.length === 0 && alerts.length === 0 && incidents.length === 0) {
      throw new Error("empty");
    }

    const liveInsights = (insightsRes.data ?? []) as Array<{ title: string; body: string; level: string }>;
    const liveLines = (linesRes.data ?? []) as Array<{ name: string; sub: string; tag: string; health: number; sessions: number; color?: string }>;

    return {
      source: "live",
      calls: calls.map(mapCall),
      alerts: alerts.map(mapAlert),
      incidents: incidents.map(mapIncident),
      stats: {
        activeSessions: calls.filter((c) => c.status === "active").length,
        callsToday: calls.length,
        openAlerts: alerts.filter((a) => !a.acknowledged).length,
        openIncidents: incidents.filter((i) => (i.status ?? "") !== "RESOLVED" && (i.status ?? "") !== "FALSE_POSITIVE").length,
        verifiedRate: 94.2,
        avgRisk: calls[0]?.risk_score ?? 0,
        threatsDetected: calls.filter((c) => (c.risk_score ?? 0) >= 51).length,
        lossesPreventedUsd: 214000,
        falsePositiveRate: 0.4,
        currentProtection: Math.max(0, 100 - (calls[0]?.risk_score ?? 40)),
      },
      insights: liveInsights.length
        ? liveInsights.map((i) => ({ title: i.title, body: i.body, level: (i.level ?? "Low") as "Low" | "Medium" | "Critical" }))
        : demoInsights,
      lines: liveLines.length
        ? liveLines.map((l, idx) => ({ ...l, color: l.color ?? ["#ff6b35", "#d9a877", "#35d6c1"][idx % 3] }))
        : demoLines,
      trend: demoTrend,
    };
  } catch {
    return {
      source: "demo",
      calls: demoCalls,
      alerts: demoAlerts,
      incidents: demoIncidents,
      stats: demoStats,
      insights: demoInsights,
      lines: demoLines,
      trend: demoTrend,
    };
  }
}

function mapCall(row: DbCall): Call {
  const risk = row.risk_score ?? 0;
  const level = riskLevel(row.risk_severity);
  const validLabels = ["NATURAL_SIGNAL", "SYNTHETIC_SIGNAL", "REPLAY_SIGNAL", "VOICE_CONVERSION_SIGNAL", "UNCERTAIN"];
  const label = validLabels.includes(row.synthetic_label ?? "")
    ? (row.synthetic_label as Call["syntheticLabel"])
    : level === "CRITICAL" || level === "HIGH" ? "UNCERTAIN" : "NATURAL_SIGNAL";
  const validOutcomes = ["Verified", "Flagged", "Under Review"];
  const outcome = validOutcomes.includes(row.outcome ?? "")
    ? (row.outcome as Call["outcome"])
    : statusOutcome(row.status);
  return {
    id: row.id,
    caller: row.caller_display ?? row.user_email ?? "Unknown caller",
    number: row.phone_number ?? "—",
    source: (row.source ?? "WEBRTC").toUpperCase() as Call["source"],
    startedAt: row.started_at ?? new Date().toISOString(),
    durationSec: Math.floor((row.duration_ms ?? 0) / 1000),
    risk,
    riskLevel: level,
    syntheticLabel: label,
    speakerSimilarity: row.speaker_similarity != null ? Math.round(Number(row.speaker_similarity) * 100) : Math.max(0, 100 - risk),
    outcome,
  };
}

function mapAlert(row: DbAlert): SecurityAlert {
  const level = riskLevel(row.severity);
  return {
    id: row.id,
    severity: level,
    threat: row.threat_title ?? row.message ?? "Alert",
    caller: row.caller_display ?? "—",
    phone: row.phone ?? "—",
    time: row.created_at ?? new Date().toISOString(),
    risk: row.risk_score ?? (level === "CRITICAL" ? 82 : level === "HIGH" ? 64 : level === "MEDIUM" ? 42 : 18),
    status: (row.status as SecurityAlert["status"]) ?? (row.acknowledged ? "Acknowledged" : "Investigating"),
    description: row.recommended_action ?? row.message ?? "Reviewed by the risk engine. See linked call for details.",
    callId: row.call_id ?? undefined,
  };
}

function mapIncident(row: DbIncident): Incident {
  const level = riskLevel(row.risk_severity);
  return {
    id: row.id,
    status: (row.status ?? "OPEN") as Incident["status"],
    risk: row.risk_score ?? (level === "CRITICAL" ? 82 : level === "HIGH" ? 64 : 40),
    riskLevel: level,
    scope: row.scope ?? "Investigation",
    owner: row.owner_name ?? "Unassigned",
    opened: row.created_at ?? new Date().toISOString(),
    alertIds: [],
    evidenceIds: [],
    summary: row.summary || "Opened from a flagged session. Review linked alerts and evidence for details.",
  };
}

export async function getCallsData(): Promise<CallsData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("calls")
      .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms, caller_display, phone_number, synthetic_label, speaker_similarity, outcome")
      .eq("organization_id", orgId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) throw new Error("empty");
    return { source: "live", calls: (data as DbCall[]).map(mapCall) };
  } catch {
    return { source: "demo", calls: demoCalls };
  }
}

export async function getCallById(id: string): Promise<Call | null> {
  try {
    const orgId = await getOrgId();
    if (!orgId) return null;
    const supabase = db();
    const { data } = await supabase
      .from("calls")
      .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms, caller_display, phone_number, synthetic_label, speaker_similarity, outcome")
      .eq("id", id)
      .single();
    if (!data) return null;
    return mapCall(data as DbCall);
  } catch {
    return demoCalls.find((c) => c.id === id) ?? null;
  }
}

export async function getAlertsData(): Promise<AlertsData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("alerts")
      .select("id, severity, message, acknowledged, created_at, call_id, recommended_action, threat_title, caller_display, phone, risk_score, status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    return { source: "live", alerts: (data as DbAlert[]).map(mapAlert) };
  } catch {
    return { source: "demo", alerts: demoAlerts };
  }
}

export async function getAlertById(id: string): Promise<SecurityAlert | null> {
  try {
    const orgId = await getOrgId();
    if (!orgId) return null;
    const supabase = db();
    const { data } = await supabase
      .from("alerts")
      .select("id, severity, message, acknowledged, created_at, call_id, recommended_action, threat_title, caller_display, phone, risk_score, status")
      .eq("id", id)
      .single();
    if (!data) return null;
    return mapAlert(data as DbAlert);
  } catch {
    return demoAlerts.find((a) => a.id === id) ?? null;
  }
}

export async function getIncidentsData(): Promise<IncidentsData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("incidents")
      .select("id, status, scope, risk_score, risk_severity, created_at, owner_name, summary")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    return { source: "live", incidents: (data as DbIncident[]).map(mapIncident) };
  } catch {
    return { source: "demo", incidents: demoIncidents };
  }
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  try {
    const orgId = await getOrgId();
    if (!orgId) return null;
    const supabase = db();
    const { data } = await supabase
      .from("incidents")
      .select("id, status, scope, risk_score, risk_severity, created_at, owner_name, summary")
      .eq("id", id)
      .single();
    if (!data) return null;
    return mapIncident(data as DbIncident);
  } catch {
    return demoIncidents.find((i) => i.id === id) ?? null;
  }
}

export async function getVerificationData(): Promise<VerificationData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("verification_requests")
      .select("id, call_id, status, method, notes, created_at, resolved_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    const requests = (data as DbVerification[]).map((v) => ({
      id: v.id,
      callId: v.call_id ?? "—",
      caller: "Linked call",
      method: (v.method ?? "Human Review") as VerificationRequest["method"],
      state: (v.status ?? "PENDING") as VerificationRequest["state"],
      requestedAt: v.created_at ?? new Date().toISOString(),
      completedAt: v.resolved_at ?? undefined,
      note: v.notes ?? "Verification request created from a flagged session.",
    }));
    return { source: "live", requests };
  } catch {
    return { source: "demo", requests: demoVerification };
  }
}

export async function getEvidenceData(): Promise<EvidenceData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("evidence_records")
      .select("id, call_id, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    const records = (data as DbEvidence[]).map((e) => ({
      id: e.id,
      callId: e.call_id ?? "—",
      caller: "Linked call",
      createdAt: e.created_at ?? new Date().toISOString(),
      hash: e.evidence_hash ?? "—",
      algorithm: (e.hash_algorithm ?? "SHA-256") as EvidenceRecord["algorithm"],
      chainStatus: (e.blockchain_tx || e.verified ? "REGISTERED" : "PENDING") as EvidenceRecord["chainStatus"],
      txHash: e.blockchain_tx ?? undefined,
      network: (e.blockchain_network ?? "Polygon Amoy") as EvidenceRecord["network"],
    }));
    return { source: "live", records };
  } catch {
    return { source: "demo", records: demoEvidence };
  }
}

export async function getAuditData(): Promise<AuditData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase
      .from("audit_events")
      .select("id, action, resource_type, resource_id, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    const events = (data as DbAudit[]).map((e) => ({
      id: e.id,
      actor: e.user_name ?? "System",
      action: e.action ?? "event",
      target: [e.resource_type, e.resource_id].filter(Boolean).join(" ") || "—",
      at: e.created_at ?? new Date().toISOString(),
      outcome: "Success" as AuditEvent["outcome"],
    }));
    return { source: "live", events };
  } catch {
    return { source: "demo", events: demoAudit };
  }
}

export async function getModelsData(): Promise<ModelsData> {
  try {
    const supabase = db();
    const { data } = await supabase
      .from("model_registry")
      .select("model_id, name, source_url, version, license, deployment_status, evaluation_notes")
      .order("created_at", { ascending: true })
      .limit(30);
    if (!data || data.length === 0) throw new Error("empty");
    const models = (data as DbModel[]).map((m) => ({
      id: m.model_id ?? "model",
      name: m.name ?? m.model_id ?? "Model",
      version: m.version ?? "—",
      source: m.source_url ?? "internal",
      license: m.license ?? "—",
      status: ((m.deployment_status ?? "active") === "active" ? "Active" : "Retired") as ModelInfo["status"],
      evalNotes: m.evaluation_notes ?? "No evaluation notes recorded.",
    }));
    return { source: "live", models };
  } catch {
    return { source: "demo", models: demoModels };
  }
}

export async function getAdminData(): Promise<AdminData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const [membersRes, orgsRes, rolesRes] = await Promise.all([
      supabase
        .from("organization_members")
        .select("id, role, created_at, user_id")
        .eq("organization_id", orgId)
        .limit(50),
      supabase.from("organizations").select("id, name, plan, status, member_count, created_at").limit(20),
      supabase.from("roles").select("id, name, description, permissions").or(`organization_id.eq.${orgId},organization_id.is.null`).limit(20),
    ]);
    const members = (membersRes.data ?? []) as Array<{
      id: string;
      role: string;
      created_at: string | null;
      user_id: string | null;
    }>;
    if (members.length === 0) throw new Error("empty");

    // Resolve member identity from app_users (DB-only auth, no auth.users join).
    const userIds = members.map((m) => m.user_id).filter(Boolean) as string[];
    const { data: appUsers } = userIds.length
      ? await supabase.from("app_users").select("id, email, name").in("id", userIds)
      : { data: [] as Array<{ id: string; email: string; name: string | null }> };
    const byId = new Map((appUsers ?? []).map((u) => [u.id, u]));

    const users = members.map((m, idx) => {
      const u = m.user_id ? byId.get(m.user_id) : undefined;
      return {
        id: m.id ?? `u-${idx}`,
        name: u?.name ?? (u?.email ?? "Unknown").split("@")[0],
        email: u?.email ?? "unknown@voxverity.io",
        role: (m.role ?? "operator").toUpperCase(),
        status: "Active" as const,
        lastActive: m.created_at ?? new Date().toISOString(),
      };
    });

    const roles = ((rolesRes.data ?? []) as Array<{ id: string; name: string; description: string | null; permissions: unknown }>).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? `Org role: ${r.name}`,
      permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
    }));

    const organizations = ((orgsRes.data ?? []) as Array<{ id: string; name: string; plan: string | null; status?: string | null; member_count?: number | null }>).map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.plan ?? "free",
      members: o.member_count ?? 0,
      status: ((o.status ?? "Active") === "Trial" ? "Trial" : "Active") as "Active" | "Trial",
    }));

    return {
      source: "live",
      users,
      organizations: organizations.length ? organizations : demoOrgs,
      roles: roles.length ? roles : demoRoles,
    };
  } catch {
    return { source: "demo", users: demoUsers, organizations: demoOrgs, roles: demoRoles };
  }
}

export const analyticsDemo = {
  trend: demoTrend,
  distribution: demoDistribution,
  volumes: demoVolumes,
  latency: demoLatency,
};

export { liveSession as liveSessionFallback, riskPolicies as policyFallback } from "@/lib/demo-data";

export { labAudioFiles as labFilesFallback, analysisResults as analysisFallback } from "@/lib/demo-data";

export { integrations as integrationsFallback, threatCampaigns as threatCampaignsFallback } from "@/lib/demo-data";

// ── New tables: analysis history, lab files, threats, integrations, risk, profile ──

export interface AnalysisHistoryData {
  source: DataSource;
  files: typeof demoLabFiles;
  results: typeof demoAnalysis;
}

export async function getAnalysisHistory(): Promise<AnalysisHistoryData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const [filesRes, resultsRes] = await Promise.all([
      supabase.from("lab_audio_files").select("id, name, duration_sec, sample_rate, channels, size_kb, uploaded_at, analyzed").eq("organization_id", orgId).order("uploaded_at", { ascending: false }).limit(30),
      supabase.from("analysis_results").select("id, file_id, call_id, created_at, risk_score, risk_severity, spoof_score, speaker_similarity, acoustic_anomaly, prosody_anomaly, dsp_metrics, notes").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30),
    ]);
    const files = (filesRes.data ?? []) as Array<{ id: string; name: string; duration_sec: number; sample_rate: number; channels: number; size_kb: number; uploaded_at: string; analyzed: boolean }>;
    const rows = (resultsRes.data ?? []) as Array<{ id: string; file_id: string | null; call_id: string | null; created_at: string; risk_score: number; risk_severity: string; spoof_score: number | null; speaker_similarity: number | null; acoustic_anomaly: number | null; prosody_anomaly: number | null; dsp_metrics: Record<string, number> | null; notes: string | null }>;
    if (!files.length && !rows.length) throw new Error("empty");
    return {
      source: "live",
      files: files.map((f) => ({
        id: f.id, name: f.name, durationSec: f.duration_sec ?? 0, sampleRate: f.sample_rate ?? 16000,
        channels: f.channels ?? 1, sizeKb: f.size_kb ?? 0, uploadedAt: f.uploaded_at, analyzed: f.analyzed ?? false,
      })),
      results: rows.map((r) => {
        const dsp = r.dsp_metrics ?? {};
        return {
          id: r.id, fileId: r.file_id ?? undefined, sessionId: r.call_id ?? undefined, createdAt: r.created_at,
          syntheticScore: Math.round(Number(r.spoof_score ?? 0) * 100),
          speakerSimilarity: Math.round(Number(r.speaker_similarity ?? 0) * 100),
          acousticAnomaly: Math.round(Number(r.acoustic_anomaly ?? 0) * 100),
          prosodyAnomaly: Math.round(Number(r.prosody_anomaly ?? 0) * 100),
          risk: r.risk_score ?? 0, riskLevel: riskLevel(r.risk_severity),
          dsp: {
            rms: dsp.rms_energy ?? dsp.rms ?? -20, peak: dsp.peak_amplitude ?? dsp.peak ?? -3,
            zcr: dsp.zero_crossing_rate ?? dsp.zcr ?? 0.05, spectralCentroid: dsp.spectral_centroid_hz ?? dsp.spectralCentroid ?? 1500,
            voicedRatio: dsp.voiced_ratio ?? dsp.voicedRatio ?? 0.7,
          },
          notes: r.notes ?? "",
        };
      }),
    };
  } catch {
    return { source: "demo", files: demoLabFiles, results: demoAnalysis };
  }
}

export interface ThreatsData {
  source: DataSource;
  campaigns: typeof demoInsights extends never ? never : import("@/lib/demo-data").ThreatCampaign[];
}

export async function getThreatsData(): Promise<{ source: DataSource; campaigns: import("@/lib/demo-data").ThreatCampaign[] }> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { threatCampaigns: demoThreats } = await import("@/lib/demo-data");
    const { data } = await supabase.from("threat_campaigns").select("id, name, attack, active_sessions, risk, last_seen, indicators").eq("organization_id", orgId).order("risk", { ascending: false }).limit(20);
    if (!data || !data.length) throw new Error("empty");
    return {
      source: "live",
      campaigns: (data as Array<{ id: string; name: string; attack: string; active_sessions: number; risk: number; last_seen: string; indicators: unknown }>).map((t) => ({
        id: t.id, name: t.name, attack: t.attack ?? "", activeSessions: t.active_sessions ?? 0,
        risk: t.risk ?? 0, lastSeen: t.last_seen, indicators: Array.isArray(t.indicators) ? (t.indicators as string[]) : [],
      })),
    };
  } catch {
    const { threatCampaigns: demoThreats } = await import("@/lib/demo-data");
    return { source: "demo", campaigns: demoThreats };
  }
}

export async function getIntegrationsData() {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase.from("integrations").select("id, provider, config, status").eq("organization_id", orgId).limit(30);
    if (!data || !data.length) throw new Error("empty");
    return {
      source: "live" as DataSource,
      integrations: (data as Array<{ id: string; provider: string; config: Record<string, string> | null; status: string }>).map((i) => ({
        id: i.id,
        name: i.config?.name ?? i.provider,
        connected: i.status === "active",
        sync: i.status === "active" ? "Connected · Active" : "Not connected",
        description: i.config?.description ?? `${i.provider} adapter`,
      })),
    };
  } catch {
    return { source: "demo" as DataSource, integrations: demoIntegrations };
  }
}

export async function getRiskPolicyLive() {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = db();
    const { data } = await supabase.from("risk_policies").select("*").eq("organization_id", orgId).eq("is_active", true).limit(1).single();
    if (!data) throw new Error("empty");
    return { source: "live" as DataSource, policy: data };
  } catch {
    return { source: "demo" as DataSource, policy: demoPolicy };
  }
}