/* ============================================================================
 * DEMO DATA LAYER — VoxVerity frontend (temp_proj)
 * ----------------------------------------------------------------------------
 * ⚠️ PLACEHOLDER DATA ONLY.
 *
 * This module exists so temp_proj can run fully standalone for style
 * verification. Every export below is shaped like the real backend response
 * contract (project_info.md §19 domain types + §20 database model) so that
 * during migration (FRONTEND_MERGE_PLAN.md Phase 10) each export maps 1:1 to a
 * Supabase query (apps/web/lib/supabase/*) or an AI-service call
 * (apps/web/lib/ai-service.ts) with ZERO component changes.
 *
 * Nothing here is production data, and no component hard-codes values — pages
 * consume this module via props.
 * ========================================================================== */

// ── Domain types (project_info.md §19) ─────────────────────────────────────
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SessionState = "IDLE" | "STARTING" | "ACTIVE" | "DEGRADED" | "STOPPED" | "FAILED";
export type CaptureState =
  | "OFF"
  | "REQUESTING"
  | "ACTIVE"
  | "PAUSED"
  | "DENIED"
  | "UNSUPPORTED"
  | "ERROR";
export type SourceType =
  | "WEBRTC"
  | "MICROPHONE"
  | "DISPLAY_AUDIO"
  | "FILE"
  | "TELEPHONY_ADAPTER"
  | "FUTURE_PROVIDER";
export type SyntheticLabel =
  | "NATURAL_SIGNAL"
  | "SYNTHETIC_SIGNAL"
  | "REPLAY_SIGNAL"
  | "VOICE_CONVERSION_SIGNAL"
  | "UNCERTAIN";
export type VerificationDecision = "PENDING" | "CONFIRMED" | "REJECTED" | "ESCALATED" | "EXPIRED";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "FALSE_POSITIVE";

export interface Call {
  id: string;
  caller: string;
  number: string;
  source: SourceType;
  startedAt: string;
  durationSec: number;
  risk: number;
  riskLevel: RiskLevel;
  syntheticLabel: SyntheticLabel;
  speakerSimilarity: number;
  outcome: "Verified" | "Flagged" | "Under Review";
  alertId?: string;
  incidentId?: string;
}

export interface SecurityAlert {
  id: string;
  severity: RiskLevel;
  threat: string;
  caller: string;
  phone: string;
  time: string;
  risk: number;
  status: "Investigating" | "Escalated" | "Acknowledged";
  description: string;
  callId?: string;
  incidentId?: string;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  risk: number;
  riskLevel: RiskLevel;
  scope: string;
  owner: string;
  opened: string;
  alertIds: string[];
  evidenceIds: string[];
  summary: string;
}

export interface VerificationRequest {
  id: string;
  callId: string;
  caller: string;
  method: "Trusted Callback" | "Org Confirmation" | "Human Review";
  state: VerificationDecision;
  requestedAt: string;
  completedAt?: string;
  note: string;
}

export interface EvidenceRecord {
  id: string;
  callId: string;
  caller: string;
  createdAt: string;
  hash: string;
  algorithm: "SHA-256";
  chainStatus: "PENDING" | "REGISTERED" | "FAILED";
  txHash?: string;
  network: "Polygon Amoy";
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  outcome: "Success" | "Denied" | "Failed";
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  source: string;
  license: string;
  status: "Active" | "Evaluating" | "Retired";
  evalNotes: string;
}

export interface ThreatCampaign {
  id: string;
  name: string;
  attack: string;
  activeSessions: number;
  risk: number;
  lastSeen: string;
  indicators: string[];
}

export interface Integration {
  id: string;
  name: string;
  connected: boolean;
  sync: string;
  description: string;
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
}

export interface Org {
  id: string;
  name: string;
  plan: string;
  members: number;
  status: "Active" | "Trial";
}

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface LabAudioFile {
  id: string;
  name: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  sizeKb: number;
  uploadedAt: string;
  analyzed: boolean;
}

export interface AnalysisResult {
  id: string;
  fileId?: string;
  sessionId?: string;
  createdAt: string;
  syntheticScore: number;
  speakerSimilarity: number;
  acousticAnomaly: number;
  prosodyAnomaly: number;
  risk: number;
  riskLevel: RiskLevel;
  dsp: { rms: number; peak: number; zcr: number; spectralCentroid: number; voicedRatio: number };
  notes: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

// ── Calls ───────────────────────────────────────────────────────────────────
export const calls: Call[] = [
  {
    id: "CL-90412",
    caller: "“Marcus Chen” (CFO)",
    number: "+1 415 555 0142",
    source: "WEBRTC",
    startedAt: ago(12),
    durationSec: 2732,
    risk: 87,
    riskLevel: "CRITICAL",
    syntheticLabel: "SYNTHETIC_SIGNAL",
    speakerSimilarity: 45,
    outcome: "Flagged",
    alertId: "AL-4821",
    incidentId: "INC-4821",
  },
  {
    id: "CL-90408",
    caller: "Unknown caller",
    number: "+44 20 7946 0318",
    source: "TELEPHONY_ADAPTER",
    startedAt: ago(21),
    durationSec: 941,
    risk: 78,
    riskLevel: "HIGH",
    syntheticLabel: "VOICE_CONVERSION_SIGNAL",
    speakerSimilarity: 38,
    outcome: "Flagged",
    alertId: "AL-4820",
    incidentId: "INC-4820",
  },
  {
    id: "CL-90401",
    caller: "“Dana Okafor”",
    number: "+1 646 555 0199",
    source: "MICROPHONE",
    startedAt: ago(37),
    durationSec: 612,
    risk: 71,
    riskLevel: "HIGH",
    syntheticLabel: "UNCERTAIN",
    speakerSimilarity: 62,
    outcome: "Under Review",
    alertId: "AL-4819",
    incidentId: "INC-4819",
  },
  {
    id: "CL-90396",
    caller: "Vendor line 7",
    number: "+1 312 555 0177",
    source: "TELEPHONY_ADAPTER",
    startedAt: ago(70),
    durationSec: 1540,
    risk: 54,
    riskLevel: "MEDIUM",
    syntheticLabel: "REPLAY_SIGNAL",
    speakerSimilarity: 71,
    outcome: "Under Review",
    alertId: "AL-4818",
    incidentId: "INC-4818",
  },
  {
    id: "CL-90390",
    caller: "“Priya Nair”",
    number: "+91 22 5550 8821",
    source: "WEBRTC",
    startedAt: ago(132),
    durationSec: 480,
    risk: 22,
    riskLevel: "LOW",
    syntheticLabel: "NATURAL_SIGNAL",
    speakerSimilarity: 96,
    outcome: "Verified",
    alertId: "AL-4817",
  },
  {
    id: "CL-90385",
    caller: "Support queue",
    number: "+1 800 555 0110",
    source: "TELEPHONY_ADAPTER",
    startedAt: ago(180),
    durationSec: 2200,
    risk: 48,
    riskLevel: "MEDIUM",
    syntheticLabel: "UNCERTAIN",
    speakerSimilarity: 83,
    outcome: "Under Review",
    alertId: "AL-4816",
  },
  {
    id: "CL-90378",
    caller: "“Rohan Mehta”",
    number: "+91 98765 43210",
    source: "WEBRTC",
    startedAt: ago(300),
    durationSec: 1265,
    risk: 18,
    riskLevel: "LOW",
    syntheticLabel: "NATURAL_SIGNAL",
    speakerSimilarity: 98,
    outcome: "Verified",
  },
  {
    id: "CL-90371",
    caller: "“Ananya Sharma”",
    number: "+91 91234 56789",
    source: "MICROPHONE",
    startedAt: ago(540),
    durationSec: 890,
    risk: 32,
    riskLevel: "MEDIUM",
    syntheticLabel: "NATURAL_SIGNAL",
    speakerSimilarity: 91,
    outcome: "Verified",
  },
];

// ── Alerts ──────────────────────────────────────────────────────────────────
export const alerts: SecurityAlert[] = [
  {
    id: "AL-4821",
    severity: "CRITICAL",
    threat: "Synthetic voice clone",
    caller: "“Marcus Chen” (CFO)",
    phone: "+1 415 555 0142",
    time: ago(12),
    risk: 87,
    status: "Escalated",
    description:
      "High probability of AI voice cloning detected on an active WebRTC call. Speaker similarity fell below the 80% trust threshold.",
    callId: "CL-90412",
    incidentId: "INC-4821",
  },
  {
    id: "AL-4820",
    severity: "HIGH",
    threat: "Speaker mismatch",
    caller: "Unknown caller",
    phone: "+44 20 7946 0318",
    time: ago(21),
    risk: 78,
    status: "Investigating",
    description:
      "Enrolled speaker profile does not match the live voice embedding. Possible voice conversion or impersonation.",
    callId: "CL-90408",
    incidentId: "INC-4820",
  },
  {
    id: "AL-4819",
    severity: "HIGH",
    threat: "Prosody anomaly",
    caller: "“Dana Okafor”",
    phone: "+1 646 555 0199",
    time: ago(37),
    risk: 71,
    status: "Investigating",
    description:
      "Unnatural pitch, rhythm and stress pattern detected. Cadence outside the speaker's typical range.",
    callId: "CL-90401",
    incidentId: "INC-4819",
  },
  {
    id: "AL-4818",
    severity: "MEDIUM",
    threat: "Acoustic artifact",
    caller: "Vendor line 7",
    phone: "+1 312 555 0177",
    time: ago(70),
    risk: 54,
    status: "Acknowledged",
    description:
      "Repeated spectral artifacts consistent with a replayed segment embedded in the call.",
    callId: "CL-90396",
    incidentId: "INC-4818",
  },
  {
    id: "AL-4817",
    severity: "LOW",
    threat: "Background noise flag",
    caller: "“Priya Nair”",
    phone: "+91 22 5550 8821",
    time: ago(132),
    risk: 22,
    status: "Acknowledged",
    description: "Elevated ambient noise lowered signal quality. No spoof indicators found.",
    callId: "CL-90390",
  },
  {
    id: "AL-4816",
    severity: "MEDIUM",
    threat: "Replay suspicion",
    caller: "Support queue",
    phone: "+1 800 555 0110",
    time: ago(180),
    risk: 48,
    status: "Acknowledged",
    description: "Repeated identical utterances detected across the session. Low confidence.",
    callId: "CL-90385",
  },
];

// ── Incidents ───────────────────────────────────────────────────────────────
export const incidents: Incident[] = [
  {
    id: "INC-4821",
    status: "INVESTIGATING",
    risk: 87,
    riskLevel: "CRITICAL",
    scope: "CFO impersonation attempt — wire transfer request",
    owner: "Elena Vasquez",
    opened: ago(11),
    alertIds: ["AL-4821"],
    evidenceIds: ["EV-7712"],
    summary:
      "Caller identified as “Marcus Chen” showed strong synthetic voice signals. No wire transfer was executed; caller asked for a transfer to a new payee.",
  },
  {
    id: "INC-4820",
    status: "OPEN",
    risk: 78,
    riskLevel: "HIGH",
    scope: "Unverified caller claiming vendor status",
    owner: "Unassigned",
    opened: ago(20),
    alertIds: ["AL-4820"],
    evidenceIds: ["EV-7711"],
    summary:
      "Unknown caller presented as an approved vendor. Voice embedding did not match any enrolled vendor profile.",
  },
  {
    id: "INC-4819",
    status: "INVESTIGATING",
    risk: 71,
    riskLevel: "HIGH",
    scope: "Executive impersonation — prosody anomaly",
    owner: "Elena Vasquez",
    opened: ago(36),
    alertIds: ["AL-4819"],
    evidenceIds: [],
    summary: "Executive team member voice with anomalous prosody. Awaiting secondary verification.",
  },
  {
    id: "INC-4818",
    status: "CONTAINED",
    risk: 54,
    riskLevel: "MEDIUM",
    scope: "Vendor line acoustic replay artifacts",
    owner: "Arjun Rao",
    opened: ago(69),
    alertIds: ["AL-4818"],
    evidenceIds: ["EV-7709"],
    summary: "Replay indicators contained to a single segment; line quarantined pending review.",
  },
  {
    id: "INC-4817",
    status: "FALSE_POSITIVE",
    risk: 22,
    riskLevel: "LOW",
    scope: "Noise flag on personal line",
    owner: "Arjun Rao",
    opened: ago(131),
    alertIds: ["AL-4817"],
    evidenceIds: [],
    summary: "Flag was caused by background noise. Call verified as natural speech.",
  },
  {
    id: "INC-4816",
    status: "RESOLVED",
    risk: 48,
    riskLevel: "MEDIUM",
    scope: "Support queue replay suspicion",
    owner: "Elena Vasquez",
    opened: ago(179),
    alertIds: ["AL-4816"],
    evidenceIds: ["EV-7706"],
    summary: "Repeated utterances traced to a known IVR prompt; no attack found.",
  },
];

// ── Verification requests ───────────────────────────────────────────────────
export const verificationRequests: VerificationRequest[] = [
  {
    id: "VR-9031",
    callId: "CL-90412",
    caller: "“Marcus Chen” (CFO)",
    method: "Trusted Callback",
    state: "PENDING",
    requestedAt: ago(8),
    note: "Callback to the approved number on file for the CFO role.",
  },
  {
    id: "VR-9030",
    callId: "CL-90408",
    caller: "Unknown caller",
    method: "Human Review",
    state: "PENDING",
    requestedAt: ago(19),
    note: "Analyst to review evidence package before any vendor action.",
  },
  {
    id: "VR-9029",
    callId: "CL-90401",
    caller: "“Dana Okafor”",
    method: "Org Confirmation",
    state: "CONFIRMED",
    requestedAt: ago(35),
    completedAt: ago(28),
    note: "Confirmed by department admin. Prosody anomaly explained by poor line.",
  },
  {
    id: "VR-9028",
    callId: "CL-90396",
    caller: "Vendor line 7",
    method: "Human Review",
    state: "ESCALATED",
    requestedAt: ago(66),
    completedAt: ago(55),
    note: "Escalated to vendor-security team for line audit.",
  },
  {
    id: "VR-9027",
    callId: "CL-90385",
    caller: "Support queue",
    method: "Trusted Callback",
    state: "EXPIRED",
    requestedAt: ago(178),
    completedAt: ago(150),
    note: "Callback unanswered; replay suspicion resolved as IVR prompt.",
  },
];

// ── Evidence / blockchain ───────────────────────────────────────────────────
export const evidenceRecords: EvidenceRecord[] = [
  {
    id: "EV-7712",
    callId: "CL-90412",
    caller: "“Marcus Chen” (CFO)",
    createdAt: ago(10),
    hash: "9f2c5a1d8e4b7c3a6f0d2e5b8a1c4f7e9d3b6c8a0f2e5d7b9c1a4e8f3b6d9c2a",
    algorithm: "SHA-256",
    chainStatus: "PENDING",
    network: "Polygon Amoy",
  },
  {
    id: "EV-7711",
    callId: "CL-90408",
    caller: "Unknown caller",
    createdAt: ago(19),
    hash: "b7e3d9f1c5a8e2b4d6f0a3c7e9b1d5f8a2c4e6b0d8f3a5c7e9b1d4f6a8c0e2b5",
    algorithm: "SHA-256",
    chainStatus: "REGISTERED",
    txHash: "0x8a4f2c9e1b7d3a6f5c0e2b8d4a9f7c1e3b5d6f0a8c2e4b9d1f3a7c5e6b0d8f2",
    network: "Polygon Amoy",
  },
  {
    id: "EV-7709",
    callId: "CL-90396",
    caller: "Vendor line 7",
    createdAt: ago(68),
    hash: "c1a9f3d5b7e2c8a4d6f0b3e9c5a8f2d7b1e4c6a0f3d9b5c7e1a4f8c2b6d0e3a9",
    algorithm: "SHA-256",
    chainStatus: "REGISTERED",
    txHash: "0x2d7b1e4c9a6f3d8b5e0a7c2f4d9b1e6a3c5f8d0b2e7a4c9f1d6b3e8a0c5f7d2",
    network: "Polygon Amoy",
  },
  {
    id: "EV-7706",
    callId: "CL-90385",
    caller: "Support queue",
    createdAt: ago(177),
    hash: "e8b2d6f0a4c7e9b1d3f5a8c2e4b7d9f1a3c6e8b0d2f4a7c9e1b3d5f8a0c2e6b4",
    algorithm: "SHA-256",
    chainStatus: "REGISTERED",
    txHash: "0x3e8a1d5f7b2c9e4a6d0f3b8c5e1a4f7d2b9c6e0a3f5d8b1e4c7a9f2d6b0e3c8",
    network: "Polygon Amoy",
  },
];

// ── Audit events ────────────────────────────────────────────────────────────
export const auditEvents: AuditEvent[] = [
  { id: "AU-9910", actor: "Elena Vasquez", action: "incident.update", target: "INC-4821", at: ago(9), outcome: "Success" },
  { id: "AU-9909", actor: "System", action: "evidence.register", target: "EV-7712", at: ago(10), outcome: "Failed" },
  { id: "AU-9908", actor: "Arjun Rao", action: "verification.approve", target: "VR-9029", at: ago(28), outcome: "Success" },
  { id: "AU-9907", actor: "System", action: "alert.create", target: "AL-4820", at: ago(21), outcome: "Success" },
  { id: "AU-9906", actor: "Elena Vasquez", action: "evidence.verify", target: "EV-7711", at: ago(25), outcome: "Success" },
  { id: "AU-9905", actor: "System", action: "auth.login", target: "sayantan@voxverity.io", at: ago(33), outcome: "Success" },
  { id: "AU-9904", actor: "Unknown", action: "auth.login", target: "admin@evil.example", at: ago(44), outcome: "Denied" },
  { id: "AU-9903", actor: "System", action: "model.inference", target: "aasist-l@1.4.0", at: ago(55), outcome: "Success" },
];

// ── Models ──────────────────────────────────────────────────────────────────
export const models: ModelInfo[] = [
  {
    id: "aasist-l",
    name: "AASIST-L",
    version: "1.4.0",
    source: "huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L",
    license: "MIT",
    status: "Active",
    evalNotes:
      "Anti-spoofing on raw waveform. 64,600-sample window @16kHz. In-domain strong, out-of-domain weaker — output is a signal, not probability.",
  },
  {
    id: "ecapa-tdnn",
    name: "ECAPA-TDNN (SpeechBrain)",
    version: "spkrec-ecapa-voxceleb",
    source: "huggingface.co/speechbrain/spkrec-ecapa-voxceleb",
    license: "Apache-2.0",
    status: "Active",
    evalNotes:
      "Speaker embeddings for similarity/consistency. Sensitive to channel, noise, language and duration. Not identity proof.",
  },
  {
    id: "risk-engine",
    name: "Deterministic Risk Engine",
    version: "3.2.0",
    source: "internal (policy v3)",
    license: "Proprietary",
    status: "Active",
    evalNotes:
      "Combines model signals + context into 0-100 score with contributing factors. Boundary-tested at 0/25/26/50/51/75/76/100.",
  },
  {
    id: "dsp-metrics",
    name: "DSP Metrics Layer",
    version: "2.1.1",
    source: "internal (librosa/scipy)",
    license: "Proprietary",
    status: "Active",
    evalNotes: "Loudness, spectral, voicing, silence and quality metrics. Descriptive only.",
  },
];

// ── Threat intelligence ─────────────────────────────────────────────────────
export const threatCampaigns: ThreatCampaign[] = [
  {
    id: "TC-301",
    name: "CEO Voice-Clone Wave",
    attack: "Voice cloning / vishing",
    activeSessions: 4,
    risk: 88,
    lastSeen: ago(15),
    indicators: ["CFO impersonation", "New payee requests", "Eastern Europe origin"],
  },
  {
    id: "TC-302",
    name: "Replay Against Vendor Lines",
    attack: "Replay",
    activeSessions: 2,
    risk: 61,
    lastSeen: ago(70),
    indicators: ["Repeated utterances", "Known IVR segments"],
  },
  {
    id: "TC-303",
    name: "Conversion on Unknown Numbers",
    attack: "Voice conversion",
    activeSessions: 1,
    risk: 74,
    lastSeen: ago(21),
    indicators: ["Unenrolled speakers", "UK numbers"],
  },
];

// ── Integrations ────────────────────────────────────────────────────────────
export const integrations: Integration[] = [
  { id: "INT-01", name: "Slack", connected: true, sync: "Connected: vox-secops · synced 5 min ago", description: "Alert routing and analyst notifications" },
  { id: "INT-02", name: "Splunk", connected: true, sync: "Connected: instance.splunk.com · Active", description: "Audit and evidence log forwarding" },
  { id: "INT-03", name: "PagerDuty", connected: false, sync: "Not connected", description: "On-call escalation for critical alerts" },
  { id: "INT-04", name: "Microsoft Teams", connected: false, sync: "Not connected", description: "Protected call join via Teams meeting SDK" },
  { id: "INT-05", name: "Twilio Media Streams", connected: false, sync: "Planned adapter", description: "Telephony adapter for PSTN streams" },
];

// ── Admin: users / orgs / roles ─────────────────────────────────────────────
export const orgUsers: OrgUser[] = [
  { id: "U-01", name: "Elena Vasquez", email: "elena@voxverity.io", role: "ANALYST", status: "Active", lastActive: ago(9) },
  { id: "U-02", name: "Arjun Rao", email: "arjun@voxverity.io", role: "ANALYST", status: "Active", lastActive: ago(55) },
  { id: "U-03", name: "Sayantan Bharati", email: "sayantan@voxverity.io", role: "OWNER", status: "Active", lastActive: ago(33) },
  { id: "U-04", name: "Maya Chen", email: "maya@voxverity.io", role: "ADMIN", status: "Active", lastActive: ago(300) },
  { id: "U-05", name: "Dev Patel", email: "dev@voxverity.io", role: "OPERATOR", status: "Invited", lastActive: ago(5000) },
  { id: "U-06", name: "Noah Kim", email: "noah@voxverity.io", role: "VIEWER", status: "Suspended", lastActive: ago(8000) },
];

export const organizations: Org[] = [
  { id: "ORG-1", name: "Acme Corp", plan: "Enterprise", members: 128, status: "Active" },
  { id: "ORG-2", name: "Northwind Financial", plan: "Business", members: 44, status: "Active" },
  { id: "ORG-3", name: "Lakeside Health", plan: "Trial", members: 12, status: "Trial" },
];

export const roles: RoleDef[] = [
  { id: "ROLE-OWNER", name: "OWNER", description: "Full organization administration", permissions: ["users.manage", "org.manage", "policy.manage", "audit.read", "evidence.manage"] },
  { id: "ROLE-ADMIN", name: "ADMIN", description: "Users, roles, configuration, integrations", permissions: ["users.manage", "policy.manage", "integrations.manage", "audit.read"] },
  { id: "ROLE-ANALYST", name: "ANALYST", description: "Monitoring, analysis, alerts, incidents, evidence", permissions: ["alerts.read", "alerts.act", "incidents.manage", "evidence.manage"] },
  { id: "ROLE-OPERATOR", name: "OPERATOR", description: "Protected user functions, live protection, verification", permissions: ["live.start", "verification.act"] },
  { id: "ROLE-VIEWER", name: "VIEWER", description: "Read-only selected views", permissions: ["dashboard.read", "calls.read"] },
];

// ── Analysis lab ────────────────────────────────────────────────────────────
export const labAudioFiles: LabAudioFile[] = [
  { id: "F-101", name: "sample-cfo-clone.wav", durationSec: 12, sampleRate: 16000, channels: 1, sizeKb: 384, uploadedAt: ago(90), analyzed: true },
  { id: "F-102", name: "sample-natural-speech.wav", durationSec: 9, sampleRate: 16000, channels: 1, sizeKb: 288, uploadedAt: ago(200), analyzed: true },
  { id: "F-103", name: "sample-replay-segment.wav", durationSec: 6, sampleRate: 16000, channels: 1, sizeKb: 192, uploadedAt: ago(400), analyzed: false },
];

export const analysisResults: AnalysisResult[] = [
  {
    id: "AN-5521",
    fileId: "F-101",
    createdAt: ago(85),
    syntheticScore: 82,
    speakerSimilarity: 41,
    acousticAnomaly: 74,
    prosodyAnomaly: 69,
    risk: 86,
    riskLevel: "CRITICAL",
    dsp: { rms: -18.2, peak: -2.1, zcr: 0.031, spectralCentroid: 1520, voicedRatio: 0.78 },
    notes: "Strong synthetic-signal indicators across all windows. Matches live call CL-90412 profile.",
  },
  {
    id: "AN-5520",
    fileId: "F-102",
    createdAt: ago(195),
    syntheticScore: 12,
    speakerSimilarity: 95,
    acousticAnomaly: 18,
    prosodyAnomaly: 14,
    risk: 9,
    riskLevel: "LOW",
    dsp: { rms: -21.4, peak: -4.8, zcr: 0.052, spectralCentroid: 1310, voicedRatio: 0.72 },
    notes: "Natural prosody and spectral pattern. No spoof indicators.",
  },
];

// ── Analytics ───────────────────────────────────────────────────────────────
export const weeklyRiskTrend = [
  { day: "Mon", score: 34 },
  { day: "Tue", score: 41 },
  { day: "Wed", score: 38 },
  { day: "Thu", score: 57 },
  { day: "Fri", score: 49 },
  { day: "Sat", score: 68 },
  { day: "Sun", score: 72 },
];

export const riskDistribution = [
  { band: "LOW", count: 1210, pct: 62 },
  { band: "MEDIUM", count: 480, pct: 25 },
  { band: "HIGH", count: 190, pct: 10 },
  { band: "CRITICAL", count: 62, pct: 3 },
];

export const detectionVolumes = [
  { week: "W1", synthetic: 8, replay: 3, conversion: 1, natural: 412 },
  { week: "W2", synthetic: 12, replay: 5, conversion: 2, natural: 398 },
  { week: "W3", synthetic: 7, replay: 4, conversion: 3, natural: 421 },
  { week: "W4", synthetic: 21, replay: 6, conversion: 4, natural: 388 },
];

export const latencyStats = {
  avgChunkLatencyMs: 640,
  p95ChunkLatencyMs: 980,
  wsUptimePct: 99.7,
  queueDepth: 0,
  modelInferenceMs: 310,
};

// ── Dashboard stats ─────────────────────────────────────────────────────────
export const dashboardStats = {
  activeSessions: 3,
  callsToday: 1284,
  openAlerts: 43,
  openIncidents: 6,
  verifiedRate: 94.2,
  avgRisk: 42,
  threatsDetected: 86,
  lossesPreventedUsd: 214000,
  falsePositiveRate: 0.4,
  currentProtection: 72,
};

export const insights = [
  {
    title: "Synthetic voice signal spike",
    body: "Synthetic indicators rose 347% vs baseline in the last 2 hours, concentrated on CFO-line impersonation.",
    level: "Critical" as const,
  },
  {
    title: "New campaign — replay on vendor lines",
    body: "Repeated known-IVR segments detected across 2 vendor lines. Recommend quarantining both lines.",
    level: "Medium" as const,
  },
  {
    title: "Speaker enrollment gap",
    body: "12 protected users have no enrolled voice reference. Enrollments improve verification accuracy.",
    level: "Low" as const,
  },
];

export const protectedLines = [
  {
    name: "CFO Line",
    sub: "Executive protection · WebRTC",
    tag: "High",
    health: 46,
    color: "#ff6b35",
    sessions: 12,
  },
  {
    name: "Payments Desk",
    sub: "UPI & wire approvals · Telephony adapter",
    tag: "Medium",
    health: 72,
    color: "#d9a877",
    sessions: 6,
  },
  {
    name: "Support Queue",
    sub: "Customer voice line · Adapter",
    tag: "Low",
    health: 89,
    color: "#35d6c1",
    sessions: 4,
  },
];

// ── Live session (current call) ─────────────────────────────────────────────
export type LiveSession = typeof liveSessionPlaceholder;

const liveSessionPlaceholder = {
  caller: "",
  number: "",
  context: "",
  source: "WEBRTC" as SourceType,
  startedAt: "",
  durationSec: 0,
  risk: 0,
  riskLevel: "LOW" as RiskLevel,
  captureState: "OFF" as CaptureState,
  sessionState: "IDLE" as SessionState,
  syntheticLabel: "UNCERTAIN" as SyntheticLabel,
  syntheticProbability: 0,
  speakerSimilarity: 0,
  acousticAnomaly: 0,
  prosodyAnomaly: 0,
  signalQuality: 0,
  contributingSignals: [] as { name: string; value: number; color: string }[],
  chunkLatencyMs: 0,
  queueDepth: 0,
  chunkSequence: 0,
  modelVersion: "",
};

export const liveSession = {
  caller: "“Marcus Chen”",
  number: "+1 415 555 0142",
  context: "Enterprise CFO line",
  source: "WEBRTC" as SourceType,
  startedAt: ago(12),
  durationSec: 2732,
  risk: 72,
  riskLevel: "HIGH" as RiskLevel,
  captureState: "ACTIVE" as CaptureState,
  sessionState: "ACTIVE" as SessionState,
  syntheticLabel: "SYNTHETIC_SIGNAL" as SyntheticLabel,
  syntheticProbability: 68,
  speakerSimilarity: 45,
  acousticAnomaly: 63,
  prosodyAnomaly: 61,
  signalQuality: 89,
  contributingSignals: [
    { name: "Synthetic Voice Signal", value: 68, color: "#ff3b3b" },
    { name: "Speaker Similarity", value: 45, color: "#ff6b35" },
    { name: "Signal Quality", value: 89, color: "#35d6c1" },
    { name: "Acoustic Anomaly", value: 63, color: "#ffb800" },
  ],
  chunkLatencyMs: 640,
  queueDepth: 0,
  chunkSequence: 38,
  modelVersion: "aasist-l@1.4.0 · risk-engine@3.2.0",
};

// ── Risk policy (settings/risk) ─────────────────────────────────────────────
export const riskPolicies = {
  bands: [
    { band: "LOW", range: "0 – 25", action: "Monitor" },
    { band: "MEDIUM", range: "26 – 50", action: "Review" },
    { band: "HIGH", range: "51 – 75", action: "Alert + verify" },
    { band: "CRITICAL", range: "76 – 100", action: "Escalate + incident" },
  ] as { band: RiskLevel; range: string; action: string }[],
  verificationThreshold: 75,
  autoEscalation: true,
  retentionDays: 90,
  storeVoiceSamples: true,
  sensitivity: "High (Strict)",
  modelVersion: "v3.2 (Latest)",
};