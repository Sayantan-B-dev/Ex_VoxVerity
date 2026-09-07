/**
 * Deterministic Risk Engine (TypeScript) — mirrors services/ai-service/app/risk/engine.py
 * so the Next.js server can recompute the 0-100 risk score in real time from the
 * per-signal analysis fields the AI service returns per 3s chunk.
 *
 * Same weights, same severity bands:
 *   LOW 0-25 | MEDIUM 26-50 | HIGH 51-75 | CRITICAL 76-100
 */

export interface RiskSignals {
  spoof_detection?: {
    normalized_score?: number;
    fallback?: boolean;
    model?: string;
    version?: string;
    severity_label?: string;
  };
  human_pattern?: {
    score?: number;
    label?: string;
    quality?: string;
  };
  speaker_verification?: {
    similarity?: number;
    match?: boolean;
    confidence?: string;
  };
  dsp_metrics?: Record<string, number>;
  quality_flags?: Record<string, boolean | number | string>;
}

export interface RiskResult {
  score: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
  contributing_factors: Array<Record<string, unknown>>;
  rule_triggers: string[];
  policy_version: string;
  model_versions: Record<string, unknown>;
  quality_flags: Record<string, unknown>;
  explanation: string;
}

const WEIGHTS = {
  spoof_detection: 0.4,
  human_pattern: 0.2,
  speaker_verification: 0.2,
  acoustic_anomaly: 0.1,
  context: 0.1,
};

const THRESHOLDS = { low_max: 25, medium_max: 50, high_max: 75, critical_min: 76 };

const MITIGATION = {
  verified_speaker_similarity_bonus: -15,
  high_quality_audio_bonus: -5,
};

const RECOMMENDATIONS: Record<string, string> = {
  LOW: "No action required. Continue monitoring.",
  MEDIUM: "Review recommended. Consider secondary verification.",
  HIGH: "Alert operator. Initiate verification workflow.",
  CRITICAL: "Immediate alert. Escalate to security team.",
};

function computeAcousticAnomaly(dsp: Record<string, number>, quality: Record<string, boolean | number | string>): number | null {
  if (!dsp || Object.keys(dsp).length === 0) return null;
  let score = 0;
  let factors = 0;

  if (quality.clipping_detected) {
    score += 80;
    factors += 1;
  }
  if (quality.low_energy) {
    score += 60;
    factors += 1;
  }
  const silence = dsp.silence_ratio ?? 0;
  if (silence > 0.8) {
    score += 70;
    factors += 1;
  } else if (silence > 0.6) {
    score += 40;
    factors += 1;
  }
  if (quality.very_short) {
    score += 50;
    factors += 1;
  }
  const dr = dsp.dynamic_range_db ?? 0;
  if (dr > 50 || dr < 5) {
    score += 40;
    factors += 1;
  }

  if (factors === 0) return 10;
  return Math.min(100, score / factors);
}

/** Deterministic risk evaluation. Same inputs always produce the same output. */
export function evaluateRisk(signals: RiskSignals): RiskResult {
  let base = 50;
  const adjustments: string[] = [];
  const ruleTriggers: string[] = [];
  const factors: Array<Record<string, unknown>> = [];
  const modelVersions: Record<string, unknown> = {};

  const spoof = signals.spoof_detection;
  if (spoof && !spoof.fallback) {
    const spoofScore = spoof.normalized_score ?? 50;
    const spoofRisk = 100 - spoofScore;
    base = base * (1 - WEIGHTS.spoof_detection) + spoofRisk * WEIGHTS.spoof_detection;
    adjustments.push(`spoof_detection: ${spoofScore}/100 -> risk ${spoofRisk.toFixed(1)}`);
    factors.push({
      signal: "spoof_detection",
      model: spoof.model ?? "AASIST-L",
      version: spoof.version ?? "N/A",
      score: spoofScore,
      severity_label: spoof.severity_label ?? "UNCERTAIN",
      weight: WEIGHTS.spoof_detection,
    });
    modelVersions.spoof_detection = { model: spoof.model ?? "AASIST-L", version: spoof.version ?? "N/A" };
    if (spoofScore < 30) ruleTriggers.push("SPOOF_SIGNAL_LOW");
    else if (spoofScore > 70) ruleTriggers.push("SPOOF_SIGNAL_HIGH");
  }

  const hp = signals.human_pattern;
  if (hp) {
    const hpScore = hp.score ?? 50;
    const hpRisk = 100 - hpScore;
    base = base * (1 - WEIGHTS.human_pattern) + hpRisk * WEIGHTS.human_pattern;
    adjustments.push(`human_pattern: ${hpScore}/100 -> risk ${hpRisk.toFixed(1)}`);
    factors.push({
      signal: "human_pattern",
      label: hp.label ?? "acoustic_dynamics",
      score: hpScore,
      quality: hp.quality ?? "unknown",
      weight: WEIGHTS.human_pattern,
    });
    if (hpScore < 30) ruleTriggers.push("ACOUSTIC_ANOMALY_HIGH");
    else if (hpScore > 70) ruleTriggers.push("ACOUSTIC_BEHAVIOR_NATURAL");
  }

  const spk = signals.speaker_verification;
  if (spk && (spk.similarity ?? 0) > 0) {
    const similarity = spk.similarity ?? 0;
    const spkRisk = (1 - similarity) * 100;
    base = base * (1 - WEIGHTS.speaker_verification) + spkRisk * WEIGHTS.speaker_verification;
    adjustments.push(`speaker_verification: ${(similarity * 100).toFixed(0)}% -> risk ${spkRisk.toFixed(1)}`);
    factors.push({
      signal: "speaker_verification",
      similarity,
      match: spk.match ?? false,
      confidence: spk.confidence ?? "none",
      weight: WEIGHTS.speaker_verification,
    });
    modelVersions.speaker_verification = { model: "ECAPA-TDNN", version: "v1.0" };
    if (similarity > 0.85) ruleTriggers.push("SPEAKER_MATCH_HIGH");
    else if (similarity < 0.3) ruleTriggers.push("SPEAKER_MISMATCH");
  }

  const dsp = signals.dsp_metrics ?? {};
  const quality = signals.quality_flags ?? {};
  const acoustic = computeAcousticAnomaly(dsp, quality);
  if (acoustic !== null) {
    base = base * (1 - WEIGHTS.acoustic_anomaly) + acoustic * WEIGHTS.acoustic_anomaly;
    adjustments.push(`acoustic_anomaly: ${acoustic.toFixed(1)}`);
    factors.push({ signal: "acoustic_anomaly", score: acoustic, weight: WEIGHTS.acoustic_anomaly });
    if (acoustic > 70) ruleTriggers.push("ACOUSTIC_ANOMALY_DETECTED");
  }

  if (spk?.match) {
    base += MITIGATION.verified_speaker_similarity_bonus;
    adjustments.push(`speaker_match_mitigation: ${MITIGATION.verified_speaker_similarity_bonus}`);
    ruleTriggers.push("SPEAKER_VERIFIED_MITIGATION");
  }
  if (quality.clipping_detected === false && quality.silence_detected === false) {
    base += MITIGATION.high_quality_audio_bonus;
    adjustments.push(`quality_mitigation: ${MITIGATION.high_quality_audio_bonus}`);
  }

  const score = Math.max(0, Math.min(100, Math.round(base)));

  let severity: RiskResult["severity"] = "LOW";
  if (score > THRESHOLDS.high_max) severity = "CRITICAL";
  else if (score > THRESHOLDS.medium_max) severity = "HIGH";
  else if (score > THRESHOLDS.low_max) severity = "MEDIUM";

  const recommendation = RECOMMENDATIONS[severity];

  const parts = [`Risk score: ${score}/100 (${severity}).`];
  if (factors.length === 0) parts.push("Insufficient signals for detailed analysis.");
  else {
    const high = factors.filter((f) => (f.score as number) > 60);
    const low = factors.filter((f) => (f.score as number) < 40);
    if (high.length) parts.push(`Elevated risk from: ${high.map((f) => String(f.signal).replace(/_/g, " ")).join(", ")}.`);
    if (low.length) parts.push(`Mitigating factors: ${low.map((f) => String(f.signal).replace(/_/g, " ")).join(", ")}.`);
  }
  if (ruleTriggers.length) parts.push(`Rules triggered: ${ruleTriggers.join(", ")}.`);

  return {
    score,
    severity,
    recommendation,
    contributing_factors: factors,
    rule_triggers: ruleTriggers,
    policy_version: "1.0.0",
    model_versions: modelVersions,
    quality_flags: quality as Record<string, unknown>,
    explanation: parts.join(" "),
    // adjustments is informational for debugging; kept out of the typed surface
  } as RiskResult & { adjustments?: string[] };
}