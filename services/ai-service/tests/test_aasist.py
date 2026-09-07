"""Unit tests for the AASIST-L wrapper class semantics.

Empirically verified against the official ONNX export: class 0 is the bona
fide class — natural speech and loud non-speech sounds fire class 0, silence
is a near coin-flip (uncertain). The wrapper must therefore read class 0 as
the bona fide score (higher = more natural).

These tests document that mapping and guard against regressions to the old
inverted behavior that made real voices score as high risk.
"""

import os
import sys

import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.aasist_wrapper import get_aasist  # noqa: E402


def _predict(audio):
    aasist = get_aasist()
    assert aasist.load(), f"Model failed to load: {aasist.status['error']}"
    return aasist.predict(np.asarray(audio, dtype=np.float32))


def test_tone_scores_bona_fide():
    """Loud tone fires class 0 → high normalized bona fide score."""
    t = (np.sin(2 * np.pi * 440 * np.arange(64600) / 16000).astype(np.float32)) * 0.5
    result = _predict(t)
    assert result["fallback"] is False, "real model should run"
    assert result["normalized_score"] >= 75, result["normalized_score"]
    print(f"  tone → normalized_score={result['normalized_score']} (bona fide) ✓")


def test_silence_is_uncertain():
    """Silence is a coin-flip → neutral/uncertain, never confident either way."""
    result = _predict(np.zeros(64600, dtype=np.float32))
    assert 30 <= result["normalized_score"] <= 70, result["normalized_score"]
    print(f"  silence → normalized_score={result['normalized_score']} (uncertain) ✓")


def test_heuristic_forced():
    """use_model=False must route to the heuristic fallback path."""
    aasist = get_aasist()
    result = aasist.predict(np.zeros(64600, dtype=np.float32), use_model=False)
    assert result["fallback"] is True
    assert result["loaded"] is False
    print("  forced heuristic path OK")


def test_heuristic_real_speech_direction():
    """Heuristic: voiced/energy-modulated audio scores higher than flat tone."""
    rng = np.random.default_rng(0)
    n = 64600
    t = np.arange(n) / 16000
    voiced = (0.4 * np.sin(2 * np.pi * 180 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t)) + 0.03 * (rng.random(n).astype(np.float32) - 0.5)).astype(np.float32)
    flat = (np.full(n, 0.3, dtype=np.float32) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * t))).astype(np.float32)
    aasist = get_aasist()
    r1 = aasist.predict(voiced, use_model=False)
    r2 = aasist.predict(flat, use_model=False)
    assert r1["normalized_score"] >= r2["normalized_score"], (r1["normalized_score"], r2["normalized_score"])
    print(f"  heuristic: voiced={r1['normalized_score']} vs flat={r2['normalized_score']} ✓")


if __name__ == "__main__":
    print("Running AASIST wrapper tests...")
    test_tone_scores_bona_fide()
    test_silence_is_uncertain()
    test_heuristic_forced()
    test_heuristic_real_speech_direction()
    print("\nAll tests passed!")