"""Unit tests for the VoiceprintManager (enroll / verify / persist).

Uses a deterministic fake embedder so tests run fast without the ECAPA model:
the fake maps each audio chunk to a normalized FFT-based vector, so identical
audio → identical embedding (cosine ~1) and different audio → lower similarity.
"""

import os
import sys
import tempfile

import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import voiceprint as vp_module  # noqa: E402
from app.models.voiceprint import VoiceprintManager  # noqa: E402


class FakeECAPA:
    """Deterministic stand-in for ECAPAWrapper."""

    def __init__(self):
        self._loaded = True

    def load(self):
        return True

    def compute_embedding(self, audio, sample_rate=16000):
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        if len(audio) < 100:
            return None
        # Deterministic content signature: per-window RMS envelope, L2-normalized.
        n = len(audio)
        idx = np.linspace(0, n, 193).astype(int)
        emb = np.zeros(192, dtype=np.float32)
        for i in range(192):
            seg = audio[idx[i]:idx[i + 1]]
            emb[i] = float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0
        norm = float(np.linalg.norm(emb))
        return emb / norm if norm > 0 else emb

    def compute_similarity(self, e1, e2):
        dot = float(np.dot(e1, e2))
        n1 = float(np.linalg.norm(e1))
        n2 = float(np.linalg.norm(e2))
        return dot / (n1 * n2) if n1 > 0 and n2 > 0 else 0.0

    @property
    def status(self):
        return {"loaded": True, "error": None}


def _install_fake_ecapa():
    vp_module.get_ecapa = lambda: FakeECAPA()


def _speech_like(seconds=3.0, seed=0, tone_hz=180.0, mod_hz=3.0):
    """Deterministic speech-ish waveform (amplitude-modulated tone + noise)."""
    rng = np.random.default_rng(seed)
    n = int(seconds * 16000)
    t = np.arange(n) / 16000
    carrier = 0.5 * np.sin(2 * np.pi * tone_hz * t) * (0.5 + 0.5 * np.sin(2 * np.pi * mod_hz * t))
    noise = 0.05 * (rng.random(n).astype(np.float32) - 0.5)
    return (carrier + noise).astype(np.float32)


def _manager(tmp_dir):
    return VoiceprintManager(
        npz_path=os.path.join(tmp_dir, "voiceprint.npz"),
        meta_path=os.path.join(tmp_dir, "voiceprint.json"),
    )


def test_enroll_verify_same_speaker():
    _install_fake_ecapa()
    with tempfile.TemporaryDirectory() as d:
        vp = _manager(d)
        audio = _speech_like(seconds=12.0, seed=7)
        result = vp.enroll_from_segments(audio, 16000, name="Alice")
        assert result["success"], result["message"]
        assert result["chunk_count"] >= 3, result["chunk_count"]
        assert vp.is_enrolled()

        same = vp.verify(_speech_like(seconds=3.0, seed=7))
        assert same is not None
        assert same["similarity"] > 0.90, same["similarity"]

        different = vp.verify(_speech_like(seconds=3.0, seed=99, tone_hz=820.0, mod_hz=7.0))
        assert different is not None
        assert different["similarity"] < 0.90, different["similarity"]
        print("  enroll/verify: same=%.3f different=%.3f" % (same["similarity"], different["similarity"]))


def test_persistence_roundtrip():
    _install_fake_ecapa()
    with tempfile.TemporaryDirectory() as d:
        vp = _manager(d)
        assert vp.load() is False  # nothing yet
        vp.enroll_from_segments(_speech_like(seconds=9.0, seed=3), 16000, name="Bob")

        vp2 = _manager(d)
        assert vp2.load() is True
        assert vp2.is_enrolled()
        assert vp2.status["name"] == "Bob"
        assert vp2.status["chunk_count"] >= 2
        assert vp2.status["enrolled"] is True

        vp2.reset()
        assert not vp2.is_enrolled()
        assert not os.path.exists(os.path.join(d, "voiceprint.npz"))
        print("  persistence roundtrip OK")


def test_verify_without_enrollment():
    _install_fake_ecapa()
    with tempfile.TemporaryDirectory() as d:
        vp = _manager(d)
        assert vp.verify(_speech_like(seconds=3.0)) is None
        print("  verify without enrollment returns None OK")


def test_too_short_recording():
    _install_fake_ecapa()
    with tempfile.TemporaryDirectory() as d:
        vp = _manager(d)
        result = vp.enroll_from_segments(_speech_like(seconds=1.0), 16000)
        assert result["success"] is False
        print("  short recording rejected OK")


if __name__ == "__main__":
    print("Running Voiceprint tests...")
    test_enroll_verify_same_speaker()
    test_persistence_roundtrip()
    test_verify_without_enrollment()
    test_too_short_recording()
    print("\nAll tests passed!")