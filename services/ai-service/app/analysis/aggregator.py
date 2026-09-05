"""Analysis Aggregation and Versioning for VoxVerity.

Combines DSP, AASIST-L, ECAPA-TDNN, and human-pattern outputs
into a structured, versioned analysis result.

Every result is attributable to specific model versions and
configuration versions for audit and reproducibility.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.aasist_wrapper import MODEL_NAME as AASIST_NAME, MODEL_VERSION as AASIST_VERSION
from app.models.ecapa_wrapper import MODEL_NAME as ECAPA_NAME, MODEL_VERSION as ECAPA_VERSION


# ── Schema ──

class AnalysisAggregator:
    """Aggregates analysis signals into a versioned result."""

    def __init__(self):
        self._version = "1.0.0"

    def aggregate(
        self,
        dsp_metrics: dict,
        quality_flags: dict,
        human_pattern: Optional[dict] = None,
        spoof_detection: Optional[dict] = None,
        speaker_verification: Optional[dict] = None,
        session_id: Optional[str] = None,
        chunk_sequence: int = 0,
    ) -> dict:
        """Combine all analysis signals into a structured result.

        Args:
            dsp_metrics: DSP analysis metrics.
            quality_flags: Audio quality flags.
            human_pattern: Human-pattern descriptor (optional).
            spoof_detection: AASIST-L spoof detection result (optional).
            speaker_verification: ECAPA-TDNN speaker verification (optional).
            session_id: Session identifier.
            chunk_sequence: Chunk sequence number.

        Returns:
            Structured AnalysisResult with versioning and attribution.
        """
        result_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()

        # Build model versions attribution
        model_versions = {}
        if spoof_detection:
            model_versions["spoof_detection"] = {
                "model": spoof_detection.get("model", AASIST_NAME),
                "version": spoof_detection.get("version", AASIST_VERSION),
                "loaded": spoof_detection.get("loaded", False),
                "fallback": spoof_detection.get("fallback", True),
            }
        if speaker_verification:
            model_versions["speaker_verification"] = {
                "model": ECAPA_NAME,
                "version": ECAPA_VERSION,
                "similarity": speaker_verification.get("similarity", 0),
            }

        # Aggregate signals
        signals = {
            "dsp": dsp_metrics,
            "quality_flags": quality_flags,
            "human_pattern": human_pattern,
            "spoof_detection": spoof_detection,
            "speaker_verification": speaker_verification,
        }

        # Compute aggregate risk indicators
        risk_indicators = self._compute_risk_indicators(
            dsp_metrics, quality_flags, human_pattern, spoof_detection, speaker_verification
        )

        return {
            "result_id": result_id,
            "session_id": session_id,
            "chunk_sequence": chunk_sequence,
            "timestamp": timestamp,
            "aggregation_version": self._version,
            "signals": signals,
            "model_versions": model_versions,
            "risk_indicators": risk_indicators,
            "metadata": {
                "dsp_version": "1.0.0",
                "human_pattern_version": "1.0.0",
                "spoof_detection_version": spoof_detection.get("version", "N/A") if spoof_detection else "N/A",
                "speaker_verification_version": ECAPA_VERSION if speaker_verification else "N/A",
            },
        }

    def _compute_risk_indicators(
        self,
        dsp_metrics: dict,
        quality_flags: dict,
        human_pattern: Optional[dict],
        spoof_detection: Optional[dict],
        speaker_verification: Optional[dict],
    ) -> dict:
        """Compute aggregate risk indicators from all signals."""
        indicators = {
            "overall_score": 50,  # Start neutral
            "severity": "UNCERTAIN",
            "contributing_factors": [],
            "quality_assessment": "unknown",
        }

        score = 50

        # Spoof detection contribution
        if spoof_detection and not spoof_detection.get("fallback", True):
            spoof_score = spoof_detection.get("normalized_score", 50)
            # Higher spoof score = more bona fide = lower risk
            spoof_contribution = (100 - spoof_score) * 0.4  # 40% weight
            score = score * 0.6 + spoof_contribution
            indicators["contributing_factors"].append({
                "signal": "spoof_detection",
                "score": spoof_score,
                "weight": 0.4,
                "label": spoof_detection.get("severity_label", "UNCERTAIN"),
            })

        # Human pattern contribution
        if human_pattern:
            hp_score = human_pattern.get("score", 50)
            hp_contribution = (100 - hp_score) * 0.2  # 20% weight
            score = score * 0.8 + hp_contribution
            indicators["contributing_factors"].append({
                "signal": "human_pattern",
                "score": hp_score,
                "weight": 0.2,
                "label": human_pattern.get("label", "acoustic_dynamics"),
            })

        # Speaker verification contribution
        if speaker_verification and speaker_verification.get("similarity", 0) > 0:
            similarity = speaker_verification.get("similarity", 0)
            # High similarity = lower risk (same speaker)
            speaker_contribution = (1 - similarity) * 100 * 0.2  # 20% weight
            score = score * 0.8 + speaker_contribution
            indicators["contributing_factors"].append({
                "signal": "speaker_verification",
                "similarity": similarity,
                "weight": 0.2,
                "match": speaker_verification.get("match", False),
            })

        # Quality flags impact
        if quality_flags.get("clipping_detected"):
            score += 5
            indicators["contributing_factors"].append({
                "signal": "quality",
                "flag": "clipping_detected",
                "impact": "+5",
            })

        if quality_flags.get("silence_detected"):
            indicators["quality_assessment"] = "silent"
        elif quality_flags.get("low_energy"):
            indicators["quality_assessment"] = "low_energy"
        else:
            indicators["quality_assessment"] = "normal"

        # Clamp score
        score = max(0, min(100, round(score)))

        # Determine severity
        if score <= 25:
            severity = "LOW"
        elif score <= 50:
            severity = "MEDIUM"
        elif score <= 75:
            severity = "HIGH"
        else:
            severity = "CRITICAL"

        indicators["overall_score"] = score
        indicators["severity"] = severity

        return indicators


# Singleton instance
_aggregator: Optional[AnalysisAggregator] = None


def get_aggregator() -> AnalysisAggregator:
    """Get or create the analysis aggregator singleton."""
    global _aggregator
    if _aggregator is None:
        _aggregator = AnalysisAggregator()
    return _aggregator
