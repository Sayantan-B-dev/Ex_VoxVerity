"""Human-Pattern Descriptive Layer for VoxVerity.

This is an explicitly heuristic descriptive layer based on DSP behavior.
It is NOT an AI detector or authenticity proof. It provides descriptive
"acoustic dynamics" or "speech-pattern evidence" based on transparent rules.

Label: "Acoustic Behavior Descriptor" — NOT "human verified" or "AI detection".
"""

from typing import Optional


# ── Thresholds (tuneable, not hard-coded product truth) ──

DYNAMIC_RANGE = {
    "natural_low_db": 10,      # Natural speech dynamic range lower bound
    "natural_high_db": 40,     # Natural speech dynamic range upper bound
    "synthetic_low": 5,        # Very flat = suspicious
    "noisy_high": 50,          # Very wide = noisy/artifact
}

SILENCE_RATIO = {
    "natural_min": 0.05,       # Natural speech has some pauses
    "natural_max": 0.60,       # Natural speech isn't mostly silence
    "synthetic_threshold": 0.85,  # Mostly silence = synthetic/concatenated
}

SPECTRAL_CENTROID = {
    "speech_min_hz": 200,      # Normal speech centroid lower bound
    "speech_max_hz": 4000,     # Normal speech centroid upper bound
    "robotic_max_hz": 1500,    # Very narrow band = robotic
}

CREST_FACTOR = {
    "natural_min": 3,          # Natural speech crest factor lower bound
    "natural_max": 15,         # Natural speech crest factor upper bound
    "synthetic_min": 1.5,      # Very flat = synthetic
    "noisy_max": 25,           # Very spikey = noisy
}

ZCR = {
    "speech_min": 0.02,        # Typical speech ZCR lower bound
    "speech_max": 0.15,        # Typical speech ZCR upper bound
}


def analyze_human_pattern(metrics: dict) -> dict:
    """Analyze DSP metrics to produce a descriptive human-pattern score.

    Returns:
        {
            "score": 0-100,
            "label": "descriptive" | "acoustic_dynamics",
            "description": "Natural speech dynamics detected" | ...,
            "contributing_factors": [...],
            "flags": {...},
            "quality": "good" | "degraded" | "poor",
            "method": "heuristic_dsp"
        }

    The score represents how closely the audio matches typical natural
    speech dynamics. It is NOT a probability of being human vs synthetic.
    It is descriptive only.
    """
    factors = []
    score = 50  # Start neutral
    flags = {}

    # ── Dynamic Range ──
    dr = metrics.get("dynamic_range_db", 0)
    dr_score, dr_note = _score_dynamic_range(dr)
    score += dr_score
    if dr_note:
        factors.append({"feature": "dynamic_range", "value": dr, "note": dr_note})

    # ── Silence Ratio ──
    sr = metrics.get("silence_ratio", 0)
    sr_score, sr_note = _score_silence_ratio(sr)
    score += sr_score
    if sr_note:
        factors.append({"feature": "silence_ratio", "value": sr, "note": sr_note})

    # ── Spectral Centroid ──
    sc = metrics.get("spectral_centroid_hz", 0)
    sc_score, sc_note = _score_spectral_centroid(sc)
    score += sc_score
    if sc_note:
        factors.append({"feature": "spectral_centroid", "value": sc, "note": sc_note})

    # ── Crest Factor ──
    cf = metrics.get("crest_factor", 0)
    cf_score, cf_note = _score_crest_factor(cf)
    score += cf_score
    if cf_note:
        factors.append({"feature": "crest_factor", "value": cf, "note": cf_note})

    # ── Zero Crossing Rate ──
    zcr = metrics.get("zero_crossing_rate", 0)
    zcr_score, zcr_note = _score_zcr(zcr)
    score += zcr_score
    if zcr_note:
        factors.append({"feature": "zero_crossing_rate", "value": zcr, "note": zcr_note})

    # ── Clipping ──
    clip = metrics.get("clipping_ratio", 0)
    if clip > 0.05:
        score -= 10
        flags["clipping_penalty"] = True
        factors.append({"feature": "clipping", "value": clip, "note": "Clipping detected — audio quality degraded"})

    # ── Energy Level ──
    dbfs = metrics.get("dbfs", -100)
    if dbfs < -50:
        score -= 5
        flags["very_low_energy"] = True
        factors.append({"feature": "energy_level", "value": dbfs, "note": "Very low energy — may be silence or noise"})

    # ── Duration ──
    dur = metrics.get("duration_s", 0)
    if dur < 0.5:
        flags["insufficient_context"] = True
        factors.append({"feature": "duration", "value": dur, "note": "Audio too short for reliable analysis"})

    # Clamp score to 0-100
    score = max(0, min(100, score))

    # ── Quality ──
    quality = "good"
    if flags.get("insufficient_context") or flags.get("very_low_energy"):
        quality = "poor"
    elif flags.get("clipping_penalty"):
        quality = "degraded"

    # ── Description ──
    description = _generate_description(score, factors, flags)

    return {
        "score": score,
        "label": "acoustic_dynamics",
        "description": description,
        "contributing_factors": factors,
        "flags": flags,
        "quality": quality,
        "method": "heuristic_dsp",
        "disclaimer": "Descriptive acoustic analysis only. Not an AI detection or authenticity proof.",
    }


def _score_dynamic_range(dr: float) -> tuple[int, Optional[str]]:
    """Score dynamic range. Natural speech typically 15-35 dB."""
    if DYNAMIC_RANGE["natural_low_db"] <= dr <= DYNAMIC_RANGE["natural_high_db"]:
        return 10, "Dynamic range within natural speech range"
    elif dr < DYNAMIC_RANGE["synthetic_low"]:
        return -15, "Very flat dynamics — may indicate synthetic or compressed audio"
    elif dr > DYNAMIC_RANGE["noisy_high"]:
        return -10, "Wide dynamic range — may indicate noisy or artifact-heavy audio"
    elif dr < DYNAMIC_RANGE["natural_low_db"]:
        return -5, "Dynamic range slightly below natural speech"
    else:
        return -5, "Dynamic range slightly above natural speech"


def _score_silence_ratio(sr: float) -> tuple[int, Optional[str]]:
    """Score silence ratio. Natural speech has moderate pauses."""
    if SILENCE_RATIO["natural_min"] <= sr <= SILENCE_RATIO["natural_max"]:
        return 10, "Silence ratio within natural speech range"
    elif sr > SILENCE_RATIO["synthetic_threshold"]:
        return -20, "Mostly silence — may indicate synthetic or concatenated audio"
    elif sr < SILENCE_RATIO["natural_min"]:
        return -5, "Very few pauses — may indicate continuous synthetic output"
    else:
        return 0, None


def _score_spectral_centroid(sc: float) -> tuple[int, Optional[str]]:
    """Score spectral centroid. Natural speech typically 200-4000 Hz."""
    if SPECTRAL_CENTROID["speech_min_hz"] <= sc <= SPECTRAL_CENTROID["speech_max_hz"]:
        return 8, "Spectral centroid within natural speech range"
    elif sc < SPECTRAL_CENTROID["robotic_max_hz"]:
        return -10, "Low centroid — may indicate robotic or narrow-band audio"
    elif sc > SPECTRAL_CENTROID["speech_max_hz"]:
        return -5, "High centroid — may indicate noise or high-frequency artifacts"
    else:
        return 0, None


def _score_crest_factor(cf: float) -> tuple[int, Optional[str]]:
    """Score crest factor. Natural speech typically 3-15."""
    if CREST_FACTOR["natural_min"] <= cf <= CREST_FACTOR["natural_max"]:
        return 8, "Crest factor within natural speech range"
    elif cf < CREST_FACTOR["synthetic_min"]:
        return -10, "Very low crest factor — flat, may indicate synthetic audio"
    elif cf > CREST_FACTOR["noisy_max"]:
        return -5, "High crest factor — may indicate noisy or clipped audio"
    else:
        return 0, None


def _score_zcr(zcr: float) -> tuple[int, Optional[str]]:
    """Score zero crossing rate. Natural speech typically 0.02-0.15."""
    if ZCR["speech_min"] <= zcr <= ZCR["speech_max"]:
        return 5, "ZCR within natural speech range"
    elif zcr > ZCR["speech_max"]:
        return -5, "High ZCR — may indicate noise or high-frequency content"
    elif zcr < ZCR["speech_min"]:
        return -5, "Low ZCR — may indicate silence or very low frequency content"
    else:
        return 0, None


def _generate_description(score: int, factors: list, flags: dict) -> str:
    """Generate a human-readable description of the acoustic analysis."""
    if flags.get("insufficient_context"):
        return "Audio too short for meaningful acoustic analysis."

    if score >= 70:
        return "Acoustic dynamics consistent with natural speech patterns."
    elif score >= 50:
        return "Mixed acoustic indicators — some natural patterns, some anomalies detected."
    elif score >= 30:
        return "Multiple acoustic anomalies detected — patterns diverge from typical natural speech."
    else:
        return "Significant acoustic anomalies detected — patterns strongly diverge from typical natural speech."
