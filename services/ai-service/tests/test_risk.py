"""Unit tests for VoxVerity Risk Engine.

Tests boundary conditions:
- Score 0 (minimum risk)
- Score 25 (LOW/MEDIUM boundary)
- Score 26 (MEDIUM start)
- Score 50 (MEDIUM/HIGH boundary)
- Score 51 (HIGH start)
- Score 75 (HIGH/CRITICAL boundary)
- Score 76 (CRITICAL start)
- Score 100 (maximum risk)

Also tests missing signal scenarios.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.risk.engine import RiskEngine, DEFAULT_POLICY


def test_boundary_low():
    """Test LOW severity boundary (0-25)."""
    engine = RiskEngine()

    # All signals indicate very safe audio
    signals = {
        "spoof_detection": {"normalized_score": 95, "loaded": True, "fallback": False},
        "human_pattern": {"score": 90},
        "speaker_verification": {"similarity": 0.95, "match": True},
        "quality_flags": {"clipping_detected": False, "silence_detected": False},
        "dsp_metrics": {"dynamic_range_db": 25, "silence_ratio": 0.2},
    }

    result = engine.evaluate(signals)
    assert result["score"] <= 25, f"Expected LOW risk, got {result['score']}"
    assert result["severity"] == "LOW"
    print(f"  LOW boundary: score={result['score']}, severity={result['severity']} ✓")


def test_boundary_medium():
    """Test MEDIUM severity boundary (26-50)."""
    engine = RiskEngine()

    # Neutral signals
    signals = {
        "spoof_detection": {"normalized_score": 50, "loaded": True, "fallback": False},
        "human_pattern": {"score": 50},
        "quality_flags": {},
        "dsp_metrics": {},
    }

    result = engine.evaluate(signals)
    assert 26 <= result["score"] <= 50, f"Expected MEDIUM risk, got {result['score']}"
    assert result["severity"] == "MEDIUM"
    print(f"  MEDIUM boundary: score={result['score']}, severity={result['severity']} ✓")


def test_boundary_high():
    """Test HIGH severity boundary (51-75)."""
    engine = RiskEngine()

    # Signals indicating suspicious audio
    signals = {
        "spoof_detection": {"normalized_score": 25, "loaded": True, "fallback": False},
        "human_pattern": {"score": 30},
        "quality_flags": {"clipping_detected": True},
        "dsp_metrics": {"dynamic_range_db": 5, "silence_ratio": 0.7},
    }

    result = engine.evaluate(signals)
    assert 51 <= result["score"] <= 75, f"Expected HIGH risk, got {result['score']}"
    assert result["severity"] == "HIGH"
    print(f"  HIGH boundary: score={result['score']}, severity={result['severity']} ✓")


def test_boundary_critical():
    """Test CRITICAL severity boundary (76-100)."""
    engine = RiskEngine()

    # All signals indicating very suspicious audio (matching DEFAULT_POLICY
    # weights — a single-factory acoustic anomaly keeps the anomaly high).
    signals = {
        "spoof_detection": {"normalized_score": 0, "loaded": True, "fallback": False},
        "human_pattern": {"score": 0},
        "quality_flags": {"clipping_detected": True},
        "dsp_metrics": {"dynamic_range_db": 25, "silence_ratio": 0.3},
    }

    result = engine.evaluate(signals)
    assert result["score"] >= 76, f"Expected CRITICAL risk, got {result['score']}"
    assert result["severity"] == "CRITICAL"
    print(f"  CRITICAL boundary: score={result['score']}, severity={result['severity']} ✓")


def test_missing_signals():
    """Test risk calculation with missing signals."""
    engine = RiskEngine()

    # No signals at all
    result = engine.evaluate({})
    assert 0 <= result["score"] <= 100, f"Score out of range: {result['score']}"
    assert result["severity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    print(f"  Missing signals: score={result['score']}, severity={result['severity']} ✓")


def test_fallback_model():
    """Test risk with fallback/heuristic model."""
    engine = RiskEngine()

    signals = {
        "spoof_detection": {"normalized_score": 50, "loaded": False, "fallback": True},
        "human_pattern": {"score": 50},
        "quality_flags": {},
        "dsp_metrics": {},
    }

    result = engine.evaluate(signals)
    assert 0 <= result["score"] <= 100
    print(f"  Fallback model: score={result['score']}, severity={result['severity']} ✓")


def test_determinism():
    """Test that same inputs always produce same output."""
    engine = RiskEngine()

    signals = {
        "spoof_detection": {"normalized_score": 65, "loaded": True, "fallback": False},
        "human_pattern": {"score": 70},
        "speaker_verification": {"similarity": 0.8, "match": True},
        "quality_flags": {"clipping_detected": False},
        "dsp_metrics": {"dynamic_range_db": 30, "silence_ratio": 0.3},
    }

    result1 = engine.evaluate(signals)
    result2 = engine.evaluate(signals)
    assert result1["score"] == result2["score"], "Risk engine is not deterministic!"
    assert result1["severity"] == result2["severity"]
    print(f"  Determinism: same input -> same output ✓")


def test_score_bounds():
    """Test that score is always 0-100."""
    engine = RiskEngine()

    # Extreme values
    extreme_cases = [
        {"spoof_detection": {"normalized_score": 100, "loaded": True, "fallback": False}},
        {"spoof_detection": {"normalized_score": 0, "loaded": True, "fallback": False}},
        {},
    ]

    for signals in extreme_cases:
        result = engine.evaluate(signals)
        assert 0 <= result["score"] <= 100, f"Score out of range: {result['score']}"
    print(f"  Score bounds: all scores in 0-100 ✓")


def test_no_speech_stays_low():
    """Silent chunks must stay LOW even when signals look neutral/suspicious."""
    engine = RiskEngine()

    # Even with suspicious-looking neutral signals, no_speech must clamp to LOW.
    signals = {
        "spoof_detection": {"normalized_score": 40, "loaded": True, "fallback": False},
        "human_pattern": {"score": 35},
        "quality_flags": {"low_energy": True},
        "dsp_metrics": {"dynamic_range_db": 2, "silence_ratio": 0.95},
        "no_speech": True,
    }
    result = engine.evaluate(signals)
    assert result["score"] <= 8, f"Expected LOW on silence, got {result['score']}"
    assert result["severity"] == "LOW"
    assert "No speech detected" in result["explanation"]
    print(f"  no_speech: score={result['score']}, severity={result['severity']} ✓")


def test_contribution_factors():
    """Test that contributing factors are properly recorded."""
    engine = RiskEngine()

    signals = {
        "spoof_detection": {"normalized_score": 60, "loaded": True, "fallback": False},
        "human_pattern": {"score": 70},
        "quality_flags": {},
        "dsp_metrics": {},
    }

    result = engine.evaluate(signals)
    assert len(result["contributing_factors"]) > 0, "No contributing factors recorded"
    assert result["policy_version"] == DEFAULT_POLICY["version"]
    print(f"  Contributing factors: {len(result['contributing_factors'])} recorded ✓")


if __name__ == "__main__":
    print("Running Risk Engine tests...")
    test_boundary_low()
    test_boundary_medium()
    test_boundary_high()
    test_boundary_critical()
    test_missing_signals()
    test_fallback_model()
    test_determinism()
    test_score_bounds()
    test_contribution_factors()
    print("\nAll tests passed!")
