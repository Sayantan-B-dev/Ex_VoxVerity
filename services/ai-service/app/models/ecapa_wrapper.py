"""ECAPA-TDNN Speaker Embedding Wrapper for VoxVerity.

Integrates SpeechBrain's ECAPA-TDNN model for speaker embeddings.
Model card: https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb
License: Apache-2.0

The model generates 192-dimensional speaker embeddings from audio.
Similarity is measured using cosine distance.
Speaker similarity is a SIGNAL, not identity proof.
"""

import os
import logging
import math
from typing import Optional, List

import numpy as np

logger = logging.getLogger(__name__)

# Model constants
MODEL_NAME = "ECAPA-TDNN"
MODEL_VERSION = "v1.0"
MODEL_LICENSE = "Apache-2.0"
MODEL_SOURCE = "https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb"
EMBEDDING_DIM = 192

# Similarity thresholds (configurable)
SIMILARITY_THRESHOLDS = {
    "high_match": 0.85,    # High confidence same speaker
    "match": 0.70,         # Likely same speaker
    "uncertain": 0.50,     # Uncertain
    "mismatch": 0.30,      # Likely different speaker
}


class ECAPAWrapper:
    """Wrapper for ECAPA-TDNN speaker embedding model.

    Provides speaker enrollment and verification capabilities.
    """

    def __init__(self):
        self.model = None
        self._loaded = False
        self._load_error: Optional[str] = None
        self._enrollments: dict[str, dict] = {}  # user_id -> enrollment data

    def load(self) -> bool:
        """Load the ECAPA-TDNN model from SpeechBrain.

        Returns:
            True if model loaded successfully, False otherwise.
        """
        if self._loaded:
            return True

        # Kill-switch for tiny hosts: ECAPA (torch + speechbrain + ~100 MB
        # weights) does not fit Render's 512 MB free tier alongside the rest
        # of the service. Set ECAPA_ENABLED=false where RAM is scarce - the
        # service stays up in AASIST-L-only mode and speaker endpoints return
        # a clear "disabled" message instead of OOMing the whole instance.
        if os.getenv("ECAPA_ENABLED", "true").lower() in ("0", "false", "no", "off"):
            self._load_error = "ECAPA disabled by ECAPA_ENABLED=false (low-RAM mode)"
            logger.warning(self._load_error)
            return False

        try:
            from speechbrain.inference import EncoderClassifier

            self.model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": "cpu"},
            )
            self._loaded = True
            logger.info("ECAPA-TDNN model loaded successfully")
            return True

        except ImportError as e:
            self._load_error = f"SpeechBrain not installed: {e}"
            logger.warning(self._load_error)
            return False
        except Exception as e:
            self._load_error = f"Failed to load ECAPA-TDNN model: {e}"
            logger.error(self._load_error)
            return False

    def compute_embedding(self, audio: np.ndarray, sample_rate: int = 16000) -> Optional[np.ndarray]:
        """Compute speaker embedding from audio.

        Args:
            audio: 1D numpy array of float32 samples.
            sample_rate: Sample rate of audio (default 16000).

        Returns:
            1D numpy array of 192-dim embedding, or None if failed.
        """
        if not self._loaded or self.model is None:
            # Lazy-load on first use so the heavyweight speaker model
            # (weights download + RAM) is skipped at server startup.
            # This keeps small/f free-tier instances bootable; the first
            # speaker request pays the one-time load cost instead.
            if not self.load():
                return None
        if not self._loaded or self.model is None:
            return None

        try:
            import torch

            # Ensure float32
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)

            # Ensure 2D for SpeechBrain (batch, samples)
            audio_tensor = torch.from_numpy(audio).unsqueeze(0)

            # Compute embedding
            with torch.no_grad():
                embedding = self.model.encode_batch(audio_tensor)

            # Convert to numpy
            embedding_np = embedding.squeeze().cpu().numpy()

            # Ensure 1D
            if embedding_np.ndim > 1:
                embedding_np = embedding_np.flatten()

            return embedding_np

        except Exception as e:
            logger.error(f"ECAPA-TDNN embedding computation failed: {e}")
            return None

    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding (192-dim).
            embedding2: Second embedding (192-dim).

        Returns:
            Cosine similarity score (0-1, higher = more similar).
        """
        # Cosine similarity
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (norm1 * norm2)
        return float(similarity)

    def enroll_speaker(self, user_id: str, audio: np.ndarray, name: str = "") -> dict:
        """Enroll a speaker with a reference audio sample.

        Args:
            user_id: Unique user identifier.
            audio: Reference audio for enrollment.
            name: Optional speaker name.

        Returns:
            {
                "success": bool,
                "user_id": str,
                "embedding_dim": int,
                "message": str,
            }
        """
        embedding = self.compute_embedding(audio)
        if embedding is None:
            return {
                "success": False,
                "user_id": user_id,
                "embedding_dim": 0,
                "message": "Failed to compute embedding. Is the model loaded?",
            }

        self._enrollments[user_id] = {
            "user_id": user_id,
            "name": name,
            "embedding": embedding,
            "embedding_dim": len(embedding),
        }

        return {
            "success": True,
            "user_id": user_id,
            "embedding_dim": len(embedding),
            "message": f"Speaker enrolled successfully with {len(embedding)}-dim embedding",
        }

    def verify_speaker(self, user_id: str, audio: np.ndarray) -> dict:
        """Verify a speaker against enrolled reference.

        Args:
            user_id: User ID to verify against.
            audio: Audio to verify.

        Returns:
            {
                "match": bool,
                "similarity": float,
                "confidence": str,
                "message": str,
            }
        """
        if user_id not in self._enrollments:
            return {
                "match": False,
                "similarity": 0.0,
                "confidence": "none",
                "message": "No enrollment found for this user",
            }

        embedding = self.compute_embedding(audio)
        if embedding is None:
            return {
                "match": False,
                "similarity": 0.0,
                "confidence": "error",
                "message": "Failed to compute embedding",
            }

        reference = self._enrollments[user_id]["embedding"]
        similarity = self.compute_similarity(embedding, reference)

        # Determine confidence level
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
            "match": match,
            "similarity": round(similarity, 4),
            "confidence": confidence,
            "message": f"Similarity: {similarity:.2%} ({confidence} confidence)",
        }

    def compare_embeddings(self, audio1: np.ndarray, audio2: np.ndarray) -> dict:
        """Compare two audio samples directly (no enrollment needed).

        Args:
            audio1: First audio sample.
            audio2: Second audio sample.

        Returns:
            {
                "similarity": float,
                "likely_same_speaker": bool,
                "message": str,
            }
        """
        emb1 = self.compute_embedding(audio1)
        emb2 = self.compute_embedding(audio2)

        if emb1 is None or emb2 is None:
            return {
                "similarity": 0.0,
                "likely_same_speaker": False,
                "message": "Failed to compute embeddings",
            }

        similarity = self.compute_similarity(emb1, emb2)
        likely_same = similarity >= SIMILARITY_THRESHOLDS["match"]

        return {
            "similarity": round(similarity, 4),
            "likely_same_speaker": likely_same,
            "message": f"Similarity: {similarity:.2%}",
        }

    @property
    def status(self) -> dict:
        """Get current model status."""
        return {
            "model": MODEL_NAME,
            "version": MODEL_VERSION,
            "loaded": self._loaded,
            "error": self._load_error,
            "license": MODEL_LICENSE,
            "source": MODEL_SOURCE,
            "embedding_dim": EMBEDDING_DIM,
            "enrollment_count": len(self._enrollments),
        }


# Singleton instance
_ecapa_instance: Optional[ECAPAWrapper] = None


def get_ecapa() -> ECAPAWrapper:
    """Get or create the ECAPA-TDNN wrapper singleton."""
    global _ecapa_instance
    if _ecapa_instance is None:
        _ecapa_instance = ECAPAWrapper()
    return _ecapa_instance
