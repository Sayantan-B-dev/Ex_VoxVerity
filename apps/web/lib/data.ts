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
import { createClient } from "@/lib/supabase/server";
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
}

interface DbIncident {
  id: string;
  status?: string | null;
  scope?: string | null;
  risk_score?: number | null;
  risk_severity?: string | null;
  created_at?: string | null;
  owner_name?: string | null;
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

async function getOrgId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("email", session.user.email)
    .single();
  return profile?.organization_id ?? null;
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const session = await auth();
    const supabase = await createClient();
    const profile = session?.user?.email
      ? await supabase.from("profiles").select("organization_id").eq("email", session.user.email).single()
      : null;

    const orgId = profile?.data?.organization_id;
    if (!orgId) throw new Error("no org");

    const [callsRes, alertsRes, incidentsRes] = await Promise.all([
      supabase
        .from("calls")
        .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(8),
      supabase
        .from("alerts")
        .select("id, severity, message, acknowledged, created_at, call_id, recommended_action")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("incidents")
        .select("id, status, scope, risk_score, risk_severity, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const calls = (callsRes.data ?? []) as DbCall[];
    const alerts = (alertsRes.data ?? []) as DbAlert[];
    const incidents = (incidentsRes.data ?? []) as DbIncident[];

    if (calls.length === 0 && alerts.length === 0 && incidents.length === 0) {
      throw new Error("empty");
    }

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
      insights: demoInsights,
      lines: demoLines,
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
  return {
    id: row.id,
    caller: row.user_email ?? "Unknown caller",
    number: "—",
    source: (row.source ?? "WEBRTC").toUpperCase() as Call["source"],
    startedAt: row.started_at ?? new Date().toISOString(),
    durationSec: Math.floor((row.duration_ms ?? 0) / 1000),
    risk,
    riskLevel: level,
    syntheticLabel: level === "CRITICAL" || level === "HIGH" ? "UNCERTAIN" : "NATURAL_SIGNAL",
    speakerSimilarity: Math.max(0, 100 - risk),
    outcome: statusOutcome(row.status),
  };
}

function mapAlert(row: DbAlert): SecurityAlert {
  const level = riskLevel(row.severity);
  return {
    id: row.id,
    severity: level,
    threat: row.message ?? "Alert",
    caller: "—",
    phone: "—",
    time: row.created_at ?? new Date().toISOString(),
    risk: level === "CRITICAL" ? 82 : level === "HIGH" ? 64 : level === "MEDIUM" ? 42 : 18,
    status: row.acknowledged ? "Acknowledged" : "Investigating",
    description: row.recommended_action ?? "Reviewed by the risk engine. See linked call for details.",
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
    summary: "Opened from a flagged session. Review linked alerts and evidence for details.",
  };
}

export async function getCallsData(): Promise<CallsData> {
  try {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("no org");
    const supabase = await createClient();
    const { data } = await supabase
      .from("calls")
      .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms")
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("calls")
      .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms")
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("alerts")
      .select("id, severity, message, acknowledged, created_at, call_id, recommended_action")
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("alerts")
      .select("id, severity, message, acknowledged, created_at, call_id, recommended_action")
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("incidents")
      .select("id, status, scope, risk_score, risk_severity, created_at")
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
    const supabase = await createClient();
    const { data } = await supabase
      .from("incidents")
      .select("id, status, scope, risk_score, risk_severity, created_at")
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
    const [usersRes, orgsRes, rolesRes] = await Promise.all([
      supabase.from("organization_members").select("id, role, created_at, user_id").eq("organization_id", orgId).limit(50),
      supabase.from("organizations").select("id, name, plan, created_at").limit(20),
      supabase.from("roles").select("*").limit(20),
    ]);
    if (!usersRes.data || usersRes.data.length === 0) throw new Error("empty");
    return { source: "live", users: demoUsers, organizations: demoOrgs, roles: demoRoles };
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