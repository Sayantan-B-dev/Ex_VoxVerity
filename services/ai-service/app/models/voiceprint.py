"""Voiceprint Manager for VoxVerity.

Enrolls a speaker from recorded voice segments and verifies live audio chunks
against the enrolled voiceprint using ECAPA-TDNN speaker embeddings
(192-dim, cosine similarity).

Persistence:
  - Embedding:   model_artifacts/voiceprints/voiceprint.npz  (float32 192,)
  - Metadata:    model_artifacts/voiceprints/voiceprint.json

The voiceprint is a local derived artifact (biometric embedding). It is never
stored on-chain, never sent to the browser, and never logged. Raw audio is
never persisted by the pipeline.

Speaker similarity is a SIGNAL, not identity proof. The UI must not present
it as an absolute verdict.
"""

import json
import logging
import os
import time
from typing import Optional

import numpy as np

from app.models.ecapa_wrapper import get_ecapa, SIMILARITY_THRESHOLDS

logger = logging.getLogger(__name__)

# Voiceprint location
VOICEPRINT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "model_artifacts",
    "voiceprints",
)
VOICEPRINT_NPZ = os.path.join(VOICEPRINT_DIR, "voiceprint.npz")
VOICEPRINT_META = os.path.join(VOICEPRINT_DIR, "voiceprint.json")

SEGMENT_SECONDS = 3.0   # analysis-aligned segment length (16 kHz)
MIN_SEGMENT_SAMPLES = 16000 * 2  # ignore sub-2s segments
ENERGY_FLOOR = 0.004    # RMS floor — silent segments are dropped during enrollment


class VoiceprintManager:
    """Enroll, persist, and verify a single default speaker voiceprint."""

    def __init__(self, npz_path: str = VOICEPRINT_NPZ, meta_path: str = VOICEPRINT_META):
        self.npz_path = npz_path
        self.meta_path = meta_path
        self._embedding: Optional[np.ndarray] = None
        self._meta: Optional[dict] = None
        self._npz_mtime: Optional[float] = None

    # ── Persistence ────────────────────────────────────────────────────────

    def load(self) -> bool:
        """Load the enrolled voiceprint (if any) from disk."""
        try:
            if not os.path.exists(self.npz_path):
                self._embedding = None
                self._meta = None
                return False
            with np.load(self.npz_path, allow_pickle=False) as data:
                self._embedding = np.asarray(data["embedding"], dtype=np.float32)
            if os.path.exists(self.meta_path):
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self._meta = json.load(f)
            self._npz_mtime = os.path.getmtime(self.npz_path)
            logger.info(
                "Voiceprint loaded: %s (dim=%d, chunks=%d)",
                self._meta.get("name", "unknown") if self._meta else "unknown",
                len(self._embedding) if self._embedding is not None else 0,
                self._meta.get("chunk_count", 0) if self._meta else 0,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to load voiceprint: {e}")
            self._embedding = None
            self._meta = None
            return False

    def save(self, embedding: np.ndarray, meta: dict) -> bool:
        """Persist the voiceprint embedding + metadata to disk."""
        try:
            os.makedirs(os.path.dirname(self.npz_path), exist_ok=True)
            np.savez(self.npz_path, embedding=np.asarray(embedding, dtype=np.float32))
            with open(self.meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            self._embedding = np.asarray(embedding, dtype=np.float32)
            self._meta = meta
            self._npz_mtime = os.path.getmtime(self.npz_path)
            logger.info(f"Voiceprint saved: {self.npz_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save voiceprint: {e}")
            return False

    def reset(self) -> None:
        """Delete the enrolled voiceprint."""
        self._embedding = None
        self._meta = None
        self._npz_mtime = None
        for p in (self.npz_path, self.meta_path):
            try:
                if os.path.exists(p):
                    os.remove(p)
            except OSError:
                pass
        logger.info("Voiceprint deleted")

    # ── Enrollment ─────────────────────────────────────────────────────────

    def enroll_from_segments(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        name: str = "default",
        segment_seconds: float = SEGMENT_SECONDS,
    ) -> dict:
        """Enroll a voiceprint from a recording by segmenting + averaging embeddings.

        The recording is split into `segment_seconds` windows (matching the live
        chunk cadence), silent segments are dropped, each segment is embedded
        with ECAPA-TDNN, embeddings are L2-normalized and averaged.

        Returns:
            {"success": bool, "message": str, "chunk_count": int,
             "duration_s": float, "similarity_self": float | None}
        """
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        if sample_rate != 16000:
            audio = _resample(audio, sample_rate, 16000)
        if len(audio) < SEGMENT_SECONDS * 16000:
            return {"success": False, "message": "Recording too short — record at least a few seconds.", "chunk_count": 0, "duration_s": 0.0, "similarity_self": None}

        ecapa = get_ecapa()
        if not ecapa.load():
            return {"success": False, "message": f"ECAPA-TDNN unavailable: {ecapa.status['error']}", "chunk_count": 0, "duration_s": 0.0, "similarity_self": None}

        hop = int(segment_seconds * 16000)
        embeddings = []
        for start in range(0, len(audio) - hop + 1, hop):
            seg = audio[start:start + hop]
            rms = float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0
            if rms < ENERGY_FLOOR or len(seg) < MIN_SEGMENT_SAMPLES:
                continue
            emb = ecapa.compute_embedding(seg, 16000)
            if emb is not None:
                norm = float(np.linalg.norm(emb))
                embeddings.append(emb / norm if norm > 0 else emb)

        if not embeddings:
            return {"success": False, "message": "No voiced segments found — speak clearly, away from noise.", "chunk_count": 0, "duration_s": 0.0, "similarity_self": None}

        centroid = np.mean(np.stack(embeddings), axis=0)
        norm = float(np.linalg.norm(centroid))
        if norm > 0:
            centroid = centroid / norm

        meta = {
            "name": name,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "chunk_count": len(embeddings),
            "duration_s": round(len(audio) / 16000.0, 1),
            "embedding_dim": int(centroid.shape[0]),
            "model": "ECAPA-TDNN",
            "method": "mean_l2_normalized_segments",
            "segment_seconds": segment_seconds,
        }

        if not self.save(centroid, meta):
            return {"success": False, "message": "Could not persist voiceprint file.", "chunk_count": 0, "duration_s": 0.0, "similarity_self": None}

        # Self-test: similarity of enrolled segments against the centroid.
        sims = [float(np.dot(e, centroid)) for e in embeddings]
        self_sim = float(np.mean(sims)) if sims else None

        return {
            "success": True,
            "message": f"Voiceprint trained from {len(embeddings)} segments (self-sim {self_sim:.2f}).",
            "chunk_count": len(embeddings),
            "duration_s": meta["duration_s"],
            "similarity_self": round(self_sim, 4) if self_sim is not None else None,
        }

    # ── Verification ───────────────────────────────────────────────────────

    def _maybe_reload(self) -> None:
        """Reload the voiceprint file if it changed on disk (trainer runs live)."""
        try:
            if os.path.exists(self.npz_path) and os.path.getmtime(self.npz_path) != self._npz_mtime:
                self.load()
        except OSError:
            pass

    def is_enrolled(self) -> bool:
        """True when a voiceprint embedding is available in memory."""
        return self._embedding is not None and self._embedding.size > 0

    def verify(self, audio: np.ndarray, sample_rate: int = 16000) -> Optional[dict]:
        """Verify a live audio chunk against the enrolled voiceprint.

        Returns None when no voiceprint is enrolled or the embedding fails.
        Otherwise matches the ecapa_wrapper verify_speaker() shape.
        """
        self._maybe_reload()
        if not self.is_enrolled():
            return None

        ecapa = get_ecapa()
        if not ecapa.load():
            return None

        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        if sample_rate != 16000:
            audio = _resample(audio, sample_rate, 16000)
        if len(audio) < MIN_SEGMENT_SAMPLES:
            return None

        emb = ecapa.compute_embedding(audio, 16000)
        if emb is None:
            return None

        similarity = ecapa.compute_similarity(emb, self._embedding)
        if similarity >= SIMILARITY_THRESHOLDS["high_match"]:
            confidence = "high"
            match = True
        elif similarity >= SIMILARITY_THRESHOLDS["match"]:
            confidence = "medium"
            match = True
        elif similarity >= SIMILARITY_THRESHOLDS["uncertain"]:
            confidence = "low"
            match = False
        else:
            confidence = "none"
            match = False

        return {
            "similarity": round(float(similarity), 4),
            "match": match,
            "confidence": confidence,
            "enrolled_name": (self._meta or {}).get("name", "default"),
            "message": f"Similarity {similarity:.0%} ({confidence} confidence)",
        }

    @property
    def status(self) -> dict:
        """Public status for the settings UI."""
        self._maybe_reload()
        meta = self._meta or {}
        return {
            "enrolled": self.is_enrolled(),
            "name": meta.get("name", "default"),
            "created_at": meta.get("created_at"),
            "chunk_count": meta.get("chunk_count", 0),
            "duration_s": meta.get("duration_s", 0.0),
            "embedding_dim": meta.get("embedding_dim", 0),
            "model": meta.get("model", "ECAPA-TDNN"),
            "path": self.npz_path,
        }


def _resample(audio: np.ndarray, from_rate: int, to_rate: int) -> np.ndarray:
    """Linear-interpolation resample (training/app inputs are usually 16 kHz)."""
    n_out = int(len(audio) * to_rate / from_rate)
    if n_out <= 0:
        return np.zeros(0, dtype=np.float32)
    idx = np.round(np.linspace(0, len(audio) - 1, n_out)).astype(int)
    return audio[idx]


# Singleton
_voiceprint_instance: Optional[VoiceprintManager] = None


def get_voiceprint() -> VoiceprintManager:
    """Get or create the voiceprint manager singleton."""
    global _voiceprint_instance
    if _voiceprint_instance is None:
        _voiceprint_instance = VoiceprintManager()
        _voiceprint_instance.load()
    return _voiceprint_instance