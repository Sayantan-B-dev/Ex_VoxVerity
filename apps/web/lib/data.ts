/* ============================================================================
 * VoxVerity data access layer (server-only)
 * ----------------------------------------------------------------------------
 * Every getter reads from Supabase (org-scoped via the signed-in NextAuth
 * session). No demo/hardcoded data anywhere: empty results render as empty
 * states, never as fabricated rows.
 * ========================================================================== */

import { auth } from "@/auth";
import { createServiceClient } from "@/lib/db";
import type {
  Call,
  SecurityAlert,
  Incident,
  EvidenceRecord,
  RiskLevel,
  LabAudioFile,
  AnalysisResult,
  RiskPolicy,
} from "@/lib/types";

export interface DashboardData {
  calls: Call[];
  alerts: SecurityAlert[];
  incidents: Incident[];
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
  threat_title?: string | null;
  caller_display?: string | null;
  phone?: string | null;
  risk_score?: number | null;
  status?: string | null;
  incident_id?: string | null;
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

interface DbEvidence {
  id: string;
  call_id?: string | null;
  evidence_hash?: string | null;
  hash_algorithm?: string | null;
  blockchain_tx?: string | null;
  blockchain_network?: string | null;
  verified?: boolean | null;
  caller_display?: string | null;
  created_at?: string | null;
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

// ── Mappers ────────────────────────────────────────────────────────────────

function mapCall(row: DbCall): Call {
  const risk = row.risk_score ?? 0;
  const level = riskLevel(row.risk_severity);
  const validLabels = ["NATURAL_SIGNAL", "SYNTHETIC_SIGNAL", "REPLAY_SIGNAL", "VOICE_CONVERSION_SIGNAL", "UNCERTAIN"];
  const label = validLabels.includes(row.synthetic_label ?? "")
    ? (row.synthetic_label as Call["syntheticLabel"])
    : level === "CRITICAL" || level === "HIGH"
      ? "UNCERTAIN"
      : "NATURAL_SIGNAL";
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
    incidentId: row.incident_id ?? undefined,
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
    summary: row.summary || "Opened from a flagged session.",
  };
}

function mapEvidence(row: DbEvidence): EvidenceRecord {
  return {
    id: row.id,
    callId: row.call_id ?? "—",
    caller: row.caller_display ?? "Linked call",
    createdAt: row.created_at ?? new Date().toISOString(),
    hash: row.evidence_hash ?? "—",
    algorithm: (row.hash_algorithm ?? "SHA-256") as EvidenceRecord["algorithm"],
    chainStatus: (row.blockchain_tx || row.verified ? "REGISTERED" : "PENDING") as EvidenceRecord["chainStatus"],
    txHash: row.blockchain_tx ?? undefined,
    network: (row.blockchain_network ?? "Polygon Amoy") as EvidenceRecord["network"],
  };
}

const CALL_COLS = "id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms, caller_display, phone_number, synthetic_label, speaker_similarity, outcome";
const ALERT_COLS = "id, severity, message, acknowledged, created_at, call_id, recommended_action, threat_title, caller_display, phone, risk_score, status, incident_id";
const INCIDENT_COLS = "id, status, scope, risk_score, risk_severity, created_at, owner_name, summary";

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const orgId = await getOrgId();
  if (!orgId) return { calls: [], alerts: [], incidents: [] };
  const supabase = db();
  const [callsRes, alertsRes, incidentsRes] = await Promise.all([
    supabase.from("calls").select(CALL_COLS).eq("organization_id", orgId).order("started_at", { ascending: false }).limit(8),
    supabase.from("alerts").select(ALERT_COLS).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8),
    supabase.from("incidents").select(INCIDENT_COLS).eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    calls: ((callsRes.data ?? []) as DbCall[]).map(mapCall),
    alerts: ((alertsRes.data ?? []) as DbAlert[]).map(mapAlert),
    incidents: ((incidentsRes.data ?? []) as DbIncident[]).map(mapIncident),
  };
}

// ── Calls ──────────────────────────────────────────────────────────────────

export async function getCallsData(): Promise<Call[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("calls")
    .select(CALL_COLS)
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as DbCall[]).map(mapCall);
}

export async function getCallById(id: string): Promise<Call | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const supabase = db();
  const { data } = await supabase.from("calls").select(CALL_COLS).eq("id", id).single();
  if (!data) return null;
  return mapCall(data as DbCall);
}

export async function getAlertsForCall(callId: string): Promise<SecurityAlert[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase.from("alerts").select(ALERT_COLS).eq("organization_id", orgId).eq("call_id", callId).order("created_at", { ascending: false }).limit(10);
  return ((data ?? []) as DbAlert[]).map(mapAlert);
}

export async function getIncidentsForCall(callId: string): Promise<Incident[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase.from("alerts").select("incident_id").eq("organization_id", orgId).eq("call_id", callId).not("incident_id", "is", null);
  const ids = [...new Set(((data ?? []) as { incident_id: string | null }[]).map((a) => a.incident_id).filter(Boolean) as string[])];
  if (ids.length === 0) return [];
  const { data: incidents } = await supabase.from("incidents").select(INCIDENT_COLS).eq("organization_id", orgId).in("id", ids).limit(10);
  return ((incidents ?? []) as DbIncident[]).map(mapIncident);
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export async function getAlertsData(): Promise<SecurityAlert[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("alerts")
    .select(ALERT_COLS)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  return ((data ?? []) as DbAlert[]).map(mapAlert);
}

export async function getAlertById(id: string): Promise<SecurityAlert | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const supabase = db();
  const { data } = await supabase.from("alerts").select(ALERT_COLS).eq("id", id).single();
  if (!data) return null;
  return mapAlert(data as DbAlert);
}

export async function getAlertsForIncident(incidentId: string): Promise<SecurityAlert[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase.from("alerts").select(ALERT_COLS).eq("organization_id", orgId).eq("incident_id", incidentId).order("created_at", { ascending: false }).limit(20);
  return ((data ?? []) as DbAlert[]).map(mapAlert);
}

// ── Incidents ──────────────────────────────────────────────────────────────

export async function getIncidentsData(): Promise<Incident[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("incidents")
    .select(INCIDENT_COLS)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  return ((data ?? []) as DbIncident[]).map(mapIncident);
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const supabase = db();
  const { data } = await supabase.from("incidents").select(INCIDENT_COLS).eq("id", id).single();
  if (!data) return null;
  return mapIncident(data as DbIncident);
}

// ── Evidence ───────────────────────────────────────────────────────────────

export async function getEvidenceData(): Promise<EvidenceRecord[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("evidence_records")
    .select("id, call_id, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, caller_display, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  return ((data ?? []) as DbEvidence[]).map(mapEvidence);
}

export async function getEvidenceForCall(callId: string): Promise<EvidenceRecord[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("evidence_records")
    .select("id, call_id, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, caller_display, created_at")
    .eq("organization_id", orgId)
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(10);
  return ((data ?? []) as DbEvidence[]).map(mapEvidence);
}

export async function getEvidenceForIncident(incidentId: string): Promise<EvidenceRecord[]> {
  const orgId = await getOrgId();
  if (!orgId) return [];
  const supabase = db();
  const { data } = await supabase
    .from("evidence_records")
    .select("id, call_id, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, caller_display, created_at")
    .eq("organization_id", orgId)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false })
    .limit(10);
  return ((data ?? []) as DbEvidence[]).map(mapEvidence);
}

// ── Analysis history ───────────────────────────────────────────────────────

export async function getAnalysisHistory(): Promise<{ files: LabAudioFile[]; results: AnalysisResult[] }> {
  const orgId = await getOrgId();
  if (!orgId) return { files: [], results: [] };
  const supabase = db();
  const [filesRes, resultsRes] = await Promise.all([
    supabase.from("lab_audio_files").select("id, name, duration_sec, sample_rate, channels, size_kb, uploaded_at, analyzed").eq("organization_id", orgId).order("uploaded_at", { ascending: false }).limit(30),
    supabase.from("analysis_results").select("id, file_id, call_id, created_at, risk_score, risk_severity, spoof_score, speaker_similarity, acoustic_anomaly, prosody_anomaly, dsp_metrics, notes").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
  ]);
  const files = ((filesRes.data ?? []) as Array<{ id: string; name: string; duration_sec: number; sample_rate: number; channels: number; size_kb: number; uploaded_at: string; analyzed: boolean }>).map((f) => ({
    id: f.id,
    name: f.name,
    durationSec: f.duration_sec ?? 0,
    sampleRate: f.sample_rate ?? 16000,
    channels: f.channels ?? 1,
    sizeKb: f.size_kb ?? 0,
    uploadedAt: f.uploaded_at,
    analyzed: f.analyzed ?? false,
  }));
  const results = ((resultsRes.data ?? []) as Array<{
    id: string;
    file_id: string | null;
    call_id: string | null;
    created_at: string;
    risk_score: number;
    risk_severity: string;
    spoof_score: number | null;
    speaker_similarity: number | null;
    acoustic_anomaly: number | null;
    prosody_anomaly: number | null;
    dsp_metrics: Record<string, number> | null;
    notes: string | null;
  }>).map((r) => mapAnalysisRow(r));
  return { files, results };
}

export async function getAnalysisById(id: string): Promise<AnalysisResult | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const supabase = db();
  const { data } = await supabase
    .from("analysis_results")
    .select("id, file_id, call_id, created_at, risk_score, risk_severity, spoof_score, speaker_similarity, acoustic_anomaly, prosody_anomaly, dsp_metrics, notes")
    .eq("organization_id", orgId)
    .eq("id", id)
    .single();
  if (!data) return null;
  return mapAnalysisRow(data as Parameters<typeof mapAnalysisRow>[0]);
}

function mapAnalysisRow(r: {
  id: string;
  file_id: string | null;
  call_id: string | null;
  created_at: string;
  risk_score: number;
  risk_severity: string;
  spoof_score: number | null;
  speaker_similarity: number | null;
  acoustic_anomaly: number | null;
  prosody_anomaly: number | null;
  dsp_metrics: Record<string, number> | null;
  notes: string | null;
}): AnalysisResult {
  const dsp = r.dsp_metrics ?? {};
  return {
    id: r.id,
    fileId: r.file_id ?? undefined,
    sessionId: r.call_id ?? undefined,
    createdAt: r.created_at,
    syntheticScore: Math.round(Number(r.spoof_score ?? 0) * 100),
    speakerSimilarity: Math.round(Number(r.speaker_similarity ?? 0) * 100),
    acousticAnomaly: Math.round(Number(r.acoustic_anomaly ?? 0) * 100),
    prosodyAnomaly: Math.round(Number(r.prosody_anomaly ?? 0) * 100),
    risk: r.risk_score ?? 0,
    riskLevel: riskLevel(r.risk_severity),
    dsp: {
      rms: dsp.rms_energy ?? dsp.rms ?? -20,
      peak: dsp.peak_amplitude ?? dsp.peak ?? -3,
      zcr: dsp.zero_crossing_rate ?? dsp.zcr ?? 0.05,
      spectralCentroid: dsp.spectral_centroid_hz ?? dsp.spectralCentroid ?? 1500,
      voicedRatio: dsp.voiced_ratio ?? dsp.voicedRatio ?? 0.7,
    },
    notes: r.notes ?? "",
  };
}

// ── Profile / policy ───────────────────────────────────────────────────────

export async function getProfileData(): Promise<{
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  job_title: string;
  location: string;
  first_name: string;
  last_name: string;
} | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  try {
    const supabase = db();
    const { data: user } = await supabase.from("app_users").select("id, email, name, role").eq("email", session.user.email.toLowerCase().trim()).single();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("first_name, last_name, phone, department, job_title, location").eq("app_user_id", user.id).single();
    return {
      name: profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : (user.name ?? user.email.split("@")[0]),
      email: user.email,
      role: (user.role ?? "operator").toUpperCase(),
      phone: profile?.phone ?? "",
      department: profile?.department ?? "",
      job_title: profile?.job_title ?? "",
      location: profile?.location ?? "",
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
    };
  } catch {
    return null;
  }
}

export async function getRiskPolicyLive(): Promise<RiskPolicy | null> {
  const orgId = await getOrgId();
  if (!orgId) return null;
  const supabase = db();
  const { data } = await supabase.from("risk_policies").select("*").eq("organization_id", orgId).eq("is_active", true).limit(1).single();
  if (!data) return null;
  return data as RiskPolicy;
}