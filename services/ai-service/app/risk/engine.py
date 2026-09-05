"""Deterministic Risk Engine for VoxVerity.

Combines analysis signals into a 0-100 risk score with severity bands.
Weights are configurable and must not be buried in UI.

Default severity bands:
  LOW: 0-25
  MEDIUM: 26-50
  HIGH: 51-75
  CRITICAL: 76-100

The risk engine is deterministic: same inputs always produce same output.
"""

import json
import os
from typing import Optional

# Default policy configuration
DEFAULT_POLICY = {
    "version": "1.0.0",
    "weights": {
        "spoof_detection": 0.40,
        "human_pattern": 0.20,
        "speaker_verification": 0.20,
        "acoustic_anomaly": 0.10,
        "context": 0.10,
    },
    "thresholds": {
        "low_max": 25,
        "medium_max": 50,
        "high_max": 75,
        "critical_min": 76,
    },
    "severity_bands": {
        "LOW": {"min": 0, "max": 25},
        "MEDIUM": {"min": 26, "max": 50},
        "HIGH": {"min": 51, "max": 75},
        "CRITICAL": {"min": 76, "max": 100},
    },
    "mitigation": {
        "verified_speaker_similarity_bonus": -15,  # Reduce risk if speaker matches
        "high_quality_audio_bonus": -5,  # Reduce risk if audio quality is good
    },
}


class RiskEngine:
    """Deterministic risk engine that combines signals into a 0-100 score."""

    def __init__(self, policy: Optional[dict] = None):
        self._policy = policy or self._load_policy()

    def _load_policy(self) -> dict:
        """Load risk policy from config file or use defaults."""
        try:
            policy_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "policy.yaml",
            )
            if os.path.exists(policy_path):
                import yaml
                with open(policy_path, "r") as f:
                    return yaml.safe_load(f)
        except Exception:
            pass
        return DEFAULT_POLICY

    def evaluate(self, signals: dict) -> dict:
        """Evaluate risk from analysis signals.

        Args:
            signals: Dictionary containing analysis signals:
                - spoof_detection: AASIST-L result (normalized_score 0-100)
                - human_pattern: Acoustic behavior descriptor (score 0-100)
                - speaker_verification: Speaker similarity (0-1)
                - quality_flags: Audio quality flags
                - dsp_metrics: DSP metrics

        Returns:
            {
                "score": int,           # 0-100
                "severity": str,        # LOW, MEDIUM, HIGH, CRITICAL
                "recommendation": str,  # Recommended action
                "contributing_factors": list,
                "rule_triggers": list,
                "policy_version": str,
                "model_versions": dict,
                "quality_flags": dict,
                "explanation": str,
            }
        """
        weights = self._policy["weights"]
        thresholds = self._policy["thresholds"]

        # Start at base risk
        base_risk = 50
        risk_adjustments = []
        rule_triggers = []
        contributing_factors = []

        # ── Spoof Detection Signal ──
        spoof = signals.get("spoof_detection")
        if spoof and not spoof.get("fallback", True):
            spoof_score = spoof.get("normalized_score", 50)
            # Higher spoof score = more bona fide = lower risk
            spoof_risk = 100 - spoof_score
            weighted = spoof_risk * weights["spoof_detection"]
            base_risk = base_risk * (1 - weights["spoof_detection"]) + weighted
            risk_adjustments.append(f"spoof_detection: {spoof_score}/100 -> risk {spoof_risk:.1f}")
            contributing_factors.append({
                "signal": "spoof_detection",
                "model": spoof.get("model", "AASIST-L"),
                "version": spoof.get("version", "N/A"),
                "score": spoof_score,
                "severity_label": spoof.get("severity_label", "UNCERTAIN"),
                "weight": weights["spoof_detection"],
            })
            if spoof_score < 30:
                rule_triggers.append("SPOOF_SIGNAL_LOW")
            elif spoof_score > 70:
                rule_triggers.append("SPOOF_SIGNAL_HIGH")

        # ── Human Pattern Signal ──
        hp = signals.get("human_pattern")
        if hp:
            hp_score = hp.get("score", 50)
            # Higher human pattern = more natural = lower risk
            hp_risk = 100 - hp_score
            weighted = hp_risk * weights["human_pattern"]
            base_risk = base_risk * (1 - weights["human_pattern"]) + weighted
            risk_adjustments.append(f"human_pattern: {hp_score}/100 -> risk {hp_risk:.1f}")
            contributing_factors.append({
                "signal": "human_pattern",
                "label": hp.get("label", "acoustic_dynamics"),
                "score": hp_score,
                "quality": hp.get("quality", "unknown"),
                "weight": weights["human_pattern"],
            })
            if hp_score < 30:
                rule_triggers.append("ACOUSTIC_ANOMALY_HIGH")
            elif hp_score > 70:
                rule_triggers.append("ACOUSTIC_BEHAVIOR_NATURAL")

        # ── Speaker Verification Signal ──
        spk = signals.get("speaker_verification")
        if spk and spk.get("similarity", 0) > 0:
            similarity = spk.get("similarity", 0)
            # High similarity = lower risk
            spk_risk = (1 - similarity) * 100
            weighted = spk_risk * weights["speaker_verification"]
            base_risk = base_risk * (1 - weights["speaker_verification"]) + weighted
            risk_adjustments.append(f"speaker_verification: {similarity:.2%} -> risk {spk_risk:.1f}")
            contributing_factors.append({
                "signal": "speaker_verification",
                "similarity": similarity,
                "match": spk.get("match", False),
                "confidence": spk.get("confidence", "none"),
                "weight": weights["speaker_verification"],
            })
            if similarity > 0.85:
                rule_triggers.append("SPEAKER_MATCH_HIGH")
            elif similarity < 0.3:
                rule_triggers.append("SPEAKER_MISMATCH")

        # ── Acoustic Anomaly (from DSP) ──
        dsp = signals.get("dsp_metrics", {})
        quality = signals.get("quality_flags", {})
        acoustic_score = self._compute_acoustic_anomaly(dsp, quality)
        if acoustic_score is not None:
            weighted = acoustic_score * weights["acoustic_anomaly"]
            base_risk = base_risk * (1 - weights["acoustic_anomaly"]) + weighted
            risk_adjustments.append(f"acoustic_anomaly: {acoustic_score:.1f}")
            contributing_factors.append({
                "signal": "acoustic_anomaly",
                "score": acoustic_score,
                "weight": weights["acoustic_anomaly"],
            })
            if acoustic_score > 70:
                rule_triggers.append("ACOUSTIC_ANOMALY_DETECTED")

        # ── Mitigation bonuses ──
        mitigation = self._policy.get("mitigation", {})
        if spk and spk.get("match", False):
            bonus = mitigation.get("verified_speaker_similarity_bonus", 0)
            base_risk += bonus
            risk_adjustments.append(f"speaker_match_mitigation: {bonus}")
            rule_triggers.append("SPEAKER_VERIFIED_MITIGATION")

        if quality.get("clipping_detected") is False and quality.get("silence_detected") is False:
            bonus = mitigation.get("high_quality_audio_bonus", 0)
            base_risk += bonus
            risk_adjustments.append(f"quality_mitigation: {bonus}")

        # Clamp to 0-100
        score = max(0, min(100, round(base_risk)))

        # Determine severity
        severity = "LOW"
        if score > thresholds["high_max"]:
            severity = "CRITICAL"
        elif score > thresholds["medium_max"]:
            severity = "HIGH"
        elif score > thresholds["low_max"]:
            severity = "MEDIUM"

        # Recommendation
        recommendation = self._get_recommendation(severity, rule_triggers)

        # Explanation
        explanation = self._generate_explanation(score, severity, contributing_factors, rule_triggers)

        return {
            "score": score,
            "severity": severity,
            "recommendation": recommendation,
            "contributing_factors": contributing_factors,
            "rule_triggers": rule_triggers,
            "policy_version": self._policy["version"],
            "model_versions": self._extract_model_versions(signals),
            "quality_flags": quality,
            "explanation": explanation,
            "adjustments": risk_adjustments,
        }

    def _compute_acoustic_anomaly(self, dsp: dict, quality: dict) -> Optional[float]:
        """Compute acoustic anomaly score from DSP metrics.

        Returns 0-100 where higher = more anomalous.
        """
        if not dsp:
            return None

        score = 0
        factors = 0

        # Clipping
        if quality.get("clipping_detected"):
            score += 80
            factors += 1

        # Very low energy
        if quality.get("low_energy"):
            score += 60
            factors += 1

        # High silence ratio
        silence = dsp.get("silence_ratio", 0)
        if silence > 0.8:
            score += 70
            factors += 1
        elif silence > 0.6:
            score += 40
            factors += 1

        # Very short audio
        if quality.get("very_short"):
            score += 50
            factors += 1

        # Dynamic range anomaly
        dr = dsp.get("dynamic_range_db", 0)
        if dr > 50 or dr < 5:
            score += 40
            factors += 1

        if factors == 0:
            return 10  # Low anomaly

        return min(100, score / factors)

    def _get_recommendation(self, severity: str, rule_triggers: list) -> str:
        """Get recommended action based on severity and triggers."""
        recommendations = {
            "LOW": "No action required. Continue monitoring.",
            "MEDIUM": "Review recommended. Consider secondary verification.",
            "HIGH": "Alert operator. Initiate verification workflow.",
            "CRITICAL": "Immediate alert. Escalate to security team.",
        }
        return recommendations.get(severity, "Review recommended.")

    def _extract_model_versions(self, signals: dict) -> dict:
        """Extract model version information from signals."""
        versions = {}
        spoof = signals.get("spoof_detection")
        if spoof:
            versions["spoof_detection"] = {
                "model": spoof.get("model", "AASIST-L"),
                "version": spoof.get("version", "N/A"),
            }
        spk = signals.get("speaker_verification")
        if spk:
            versions["speaker_verification"] = {
                "model": "ECAPA-TDNN",
                "version": "v1.0",
            }
        return versions

    def _generate_explanation(
        self,
        score: int,
        severity: str,
        factors: list,
        triggers: list,
    ) -> str:
        """Generate human-readable explanation of risk assessment."""
        parts = [f"Risk score: {score}/100 ({severity})."]

        if not factors:
            parts.append("Insufficient signals for detailed analysis.")
        else:
            high_risk_signals = [f for f in factors if f.get("score", 50) > 60]
            low_risk_signals = [f for f in factors if f.get("score", 50) < 40]

            if high_risk_signals:
                names = [f["signal"].replace("_", " ") for f in high_risk_signals]
                parts.append(f"Elevated risk from: {', '.join(names)}.")
            if low_risk_signals:
                names = [f["signal"].replace("_", " ") for f in low_risk_signals]
                parts.append(f"Mitigating factors: {', '.join(names)}.")

        if triggers:
            parts.append(f"Rules triggered: {', '.join(triggers)}.")

        return " ".join(parts)


# Singleton instance
_risk_engine: Optional[RiskEngine] = None


def get_risk_engine() -> RiskEngine:
    """Get or create the risk engine singleton."""
    global _risk_engine
    if _risk_engine is None:
        _risk_engine = RiskEngine()
    return _risk_engine
