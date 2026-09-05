"""Model Registry for VoxVerity.

Tracks model versions, licenses, evaluation status, and deployment info.
Every model must have documented source, version, license, and known limitations.
"""

import time
import logging
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class ModelRegistry:
    """Registry for AI model metadata and governance."""

    def __init__(self):
        self._models: Dict[str, dict] = {}
        self._initialize_defaults()

    def _initialize_defaults(self):
        """Initialize with known models."""
        self.register_model(
            model_id="AASIST-L",
            name="Audio Anti-Spoofing",
            source="https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L",
            version="v1.0",
            license="MIT",
            input_format="16kHz mono float32 waveform",
            output_semantics="Binary classification: higher score = more bona fide",
            parameters=85306,
            known_limitations=[
                "Strong in-domain performance on ASVspoof2019 LA",
                "Materially weaker on out-of-domain data",
                "Requires minimum 4 seconds of audio",
                "Not a universal deepfake detector",
            ],
            status="available",
        )

        self.register_model(
            model_id="ECAPA-TDNN",
            name="Speaker Embeddings",
            source="https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb",
            version="v1.0",
            license="Apache-2.0",
            input_format="16kHz mono float32 waveform",
            output_semantics="192-dimensional speaker embedding vector",
            parameters=None,
            known_limitations=[
                "Similarity is a signal, not identity proof",
                "Affected by channel, noise, language, duration",
                "Requires enrollment for comparison",
            ],
            status="available",
        )

    def register_model(
        self,
        model_id: str,
        name: str,
        source: str,
        version: str,
        license: str,
        input_format: str = "",
        output_semantics: str = "",
        parameters: Optional[int] = None,
        known_limitations: Optional[List[str]] = None,
        status: str = "registered",
    ) -> dict:
        """Register a model in the registry."""
        model = {
            "model_id": model_id,
            "name": name,
            "source": source,
            "version": version,
            "license": license,
            "input_format": input_format,
            "output_semantics": output_semantics,
            "parameters": parameters,
            "known_limitations": known_limitations or [],
            "status": status,
            "registered_at": time.time(),
            "last_evaluated": None,
            "evaluation_notes": None,
        }

        self._models[model_id] = model
        logger.info(f"Model registered: {model_id} v{version}")
        return model

    def get_model(self, model_id: str) -> Optional[dict]:
        """Get model by ID."""
        return self._models.get(model_id)

    def list_models(self) -> List[dict]:
        """List all registered models."""
        return list(self._models.values())

    def update_model(
        self,
        model_id: str,
        status: Optional[str] = None,
        version: Optional[str] = None,
        last_evaluated: Optional[float] = None,
        evaluation_notes: Optional[str] = None,
    ) -> Optional[dict]:
        """Update model metadata."""
        model = self._models.get(model_id)
        if not model:
            return None

        if status:
            model["status"] = status
        if version:
            model["version"] = version
        if last_evaluated:
            model["last_evaluated"] = last_evaluated
        if evaluation_notes:
            model["evaluation_notes"] = evaluation_notes

        return model


# Singleton instance
_model_registry: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    """Get or create the model registry singleton."""
    global _model_registry
    if _model_registry is None:
        _model_registry = ModelRegistry()
    return _model_registry
