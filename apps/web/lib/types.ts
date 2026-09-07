/* VoxVerity UI domain types (SQL-backed shapes). */

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
  summary: string;
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

export interface LiveSession {
  caller: string;
  number: string;
  context: string;
  source: SourceType;
  startedAt: string;
  durationSec: number;
  risk: number;
  riskLevel: RiskLevel;
  captureState: CaptureState;
  sessionState: SessionState;
  syntheticLabel: SyntheticLabel;
  syntheticProbability: number;
  speakerSimilarity: number;
  acousticAnomaly: number;
  prosodyAnomaly: number;
  signalQuality: number;
  contributingSignals: { name: string; value: number; color: string }[];
  chunkLatencyMs: number;
  queueDepth: number;
  chunkSequence: number;
  modelVersion: string;
}

/** Active org risk policy (risk_policies row). */
export interface RiskPolicy {
  id: string;
  organization_id: string;
  name: string;
  thresholds: { low: number; medium: number; high: number };
  weights: { spoof: number; speaker: number; acoustic: number; context: number };
  is_active: boolean;
  verification_threshold: number;
  auto_escalation: boolean;
  sensitivity: string;
  model_version: string;
  band_actions: Record<string, string>;
}