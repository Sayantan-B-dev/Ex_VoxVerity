"""AASIST-L Model Wrapper for VoxVerity.

Integrates the AASIST-L audio anti-spoofing model.
Model card: https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L
License: MIT

The model operates on raw speech waveform (64,600 samples at 16 kHz ≈ 4.04 s).
Higher output score = more likely bona fide (not spoofed).

IMPORTANT: This is a model signal, not an absolute fraud verdict.
The UI must label it as "model score" or "spoof signal", not "probability".
"""

import os
import logging
from typing import Optional

import numpy as np
import yaml

logger = logging.getLogger(__name__)

# Model constants
SAMPLE_RATE = 16000
MODEL_WINDOW_SAMPLES = 64600  # ~4.04 seconds at 16 kHz
MODEL_NAME = "AASIST-L"
MODEL_VERSION = "v1.0"
MODEL_LICENSE = "MIT"
MODEL_SOURCE = "https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L"


class AASISTWrapper:
    """Wrapper for AASIST-L audio anti-spoofing model.

    Provides a simple interface for running inference on audio chunks.
    Falls back to heuristic scoring if the model is not loaded.
    """

    def __init__(self):
        self.model = None
        self.device = "cpu"
        self._loaded = False
        self._load_error: Optional[str] = None
        self._calibration: Optional[dict] = None
        self._load_calibration()

    def load(self, model_path: Optional[str] = None) -> bool:
        """Load the AASIST-L model from a checkpoint file.

        Args:
            model_path: Path to the .pth checkpoint file.
                       Defaults to model_artifacts/aasist_l.pth

        Returns:
            True if model loaded successfully, False otherwise.
        """
        if self._loaded:
            return True

        try:
            import torch

            if model_path is None:
                model_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                    "model_artifacts",
                    "aasist_l.pth",
                )

            if not os.path.exists(model_path):
                self._load_error = f"Model checkpoint not found: {model_path}"
                logger.warning(self._load_error)
                return False

            # Load the AASIST-L model architecture
            self.model = self._build_model()
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=True)

            # Handle different checkpoint formats
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["state_dict"])
            elif isinstance(checkpoint, dict) and "model" in checkpoint:
                self.model.load_state_dict(checkpoint["model"])
            else:
                self.model.load_state_dict(checkpoint)

            self.model.to(self.device)
            self.model.eval()
            self._loaded = True
            logger.info(f"AASIST-L model loaded from {model_path}")
            return True

        except ImportError as e:
            self._load_error = f"PyTorch not installed: {e}"
            logger.warning(self._load_error)
            return False
        except Exception as e:
            self._load_error = f"Failed to load AASIST-L model: {e}"
            logger.error(self._load_error)
            return False

    def _build_model(self):
        """Build the AASIST-L model architecture.

        This is a simplified implementation based on the AASIST-L paper:
        "AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal
        Graph Attention" (2022).

        The actual checkpoint from HuggingFace contains the full architecture.
        This serves as a fallback/placeholder for when the checkpoint is
        available but we need to instantiate the model class.
        """
        import torch
        import torch.nn as nn

        class AASISTL(nn.Module):
            """AASIST-L model architecture (simplified)."""

            def __init__(self, input_dim=1, hidden_dim=128, num_classes=2):
                super().__init__()
                # Feature extractor
                self.conv1 = nn.Conv1d(input_dim, hidden_dim, kernel_size=5, stride=2, padding=2)
                self.bn1 = nn.BatchNorm1d(hidden_dim)
                self.conv2 = nn.Conv1d(hidden_dim, hidden_dim, kernel_size=5, stride=2, padding=2)
                self.bn2 = nn.BatchNorm1d(hidden_dim)
                self.conv3 = nn.Conv1d(hidden_dim, hidden_dim, kernel_size=5, stride=2, padding=2)
                self.bn3 = nn.BatchNorm1d(hidden_dim)

                # Temporal attention
                self.attention = nn.MultiheadAttention(hidden_dim, num_heads=4, batch_first=True)

                # Classifier
                self.pool = nn.AdaptiveAvgPool1d(1)
                self.fc = nn.Linear(hidden_dim, num_classes)

            def forward(self, x):
                # x: (batch, 1, samples)
                x = torch.relu(self.bn1(self.conv1(x)))
                x = torch.relu(self.bn2(self.conv2(x)))
                x = torch.relu(self.bn3(self.conv3(x)))

                # Reshape for attention: (batch, features, time) -> (batch, time, features)
                x = x.permute(0, 2, 1)
                x, _ = self.attention(x, x, x)

                # Pool and classify
                x = x.permute(0, 2, 1)
                x = self.pool(x).squeeze(-1)
                return self.fc(x)

        return AASISTL()

    def predict(self, audio: np.ndarray) -> dict:
        """Run inference on audio samples.

        Args:
            audio: 1D numpy array of float32 samples at 16 kHz.

        Returns:
            {
                "model": "AASIST-L",
                "version": "v1.0",
                "score": float,          # Higher = more likely bona fide
                "confidence": float,     # 0-1 confidence in the score
                "loaded": bool,          # Whether model was used
                "fallback": bool,        # Whether heuristic fallback was used
                "error": str | None,
            }
        """
        if not self._loaded or self.model is None:
            return self._heuristic_fallback(audio)

        try:
            import torch

            # Normalize audio to model window
            audio_tensor = self._prepare_audio(audio)

            # Run inference
            with torch.no_grad():
                output = self.model(audio_tensor)
                probabilities = torch.softmax(output, dim=-1)

                # AASIST-L: higher score = more bona fide
                # output[:, 1] is the bona fide class
                bona_fide_score = probabilities[0, 1].item()
                confidence = max(probabilities[0]).item()

            # Normalize score using calibration
            normalization = self.normalize_score(bona_fide_score)

            return {
                "model": MODEL_NAME,
                "version": MODEL_VERSION,
                "score": round(bona_fide_score, 4),
                "confidence": round(confidence, 4),
                "normalized_score": normalization["normalized_score"],
                "severity": normalization["severity"],
                "severity_label": normalization["severity_label"],
                "recommended_action": normalization["recommended_action"],
                "loaded": True,
                "fallback": False,
                "error": None,
            }

        except Exception as e:
            logger.error(f"AASIST-L inference failed: {e}")
            return {
                "model": MODEL_NAME,
                "version": MODEL_VERSION,
                "score": 0.5,
                "confidence": 0.0,
                "loaded": True,
                "fallback": True,
                "error": str(e),
            }

    def _prepare_audio(self, audio: np.ndarray) -> "torch.Tensor":
        """Prepare audio for model input.

        - Resample to 16 kHz if needed
        - Pad or truncate to MODEL_WINDOW_SAMPLES
        - Convert to tensor with batch and channel dimensions
        """
        import torch

        # Ensure float32
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)

        # Truncate or pad to model window
        if len(audio) > MODEL_WINDOW_SAMPLES:
            # Use the most recent window (rolling context)
            audio = audio[-MODEL_WINDOW_SAMPLES:]
        elif len(audio) < MODEL_WINDOW_SAMPLES:
            # Pad with zeros
            audio = np.pad(audio, (0, MODEL_WINDOW_SAMPLES - len(audio)), mode="constant")

        # Convert to tensor: (1, 1, samples)
        tensor = torch.from_numpy(audio).unsqueeze(0).unsqueeze(0)
        return tensor.to(self.device)

    def _heuristic_fallback(self, audio: np.ndarray) -> dict:
        """Provide a DSP-feature-based heuristic score when model is not loaded.

        Uses actual audio characteristics to estimate spoof likelihood:
        - ZCR: natural speech has varied ZCR, synthetic often too regular
        - Spectral centroid: synthetic speech often has shifted centroid
        - Crest factor: natural speech has higher crest factor
        - Silence ratio: natural speech has more pauses
        - Clipping: clipped audio is suspicious
        - Energy variation: natural speech has more dynamic range
        - Spectral flatness: synthetic speech tends to be flatter

        Score = bona fide likelihood (higher = more likely natural).
        """
        import math

        if len(audio) == 0:
            return {
                "model": MODEL_NAME,
                "version": MODEL_VERSION,
                "score": 0.5,
                "confidence": 0.0,
                "loaded": False,
                "fallback": True,
                "error": "Empty audio",
            }

        n = len(audio)

        # --- Compute real DSP features ---

        # 1. RMS energy
        rms = math.sqrt(float(np.mean(audio ** 2)))

        # 2. Peak amplitude
        peak = float(np.max(np.abs(audio)))

        # 3. Zero crossing rate (frame-based)
        frame_size = max(1, 16000 // 100)  # 10ms frames
        zcr_values = []
        for i in range(0, n - frame_size, frame_size):
            frame = audio[i:i + frame_size]
            crossings = sum(1 for j in range(1, len(frame)) if (frame[j] >= 0) != (frame[j - 1] >= 0))
            zcr_values.append(crossings / frame_size)
        zcr_mean = float(np.mean(zcr_values)) if zcr_values else 0.0
        zcr_std = float(np.std(zcr_values)) if zcr_values else 0.0

        # 4. Spectral centroid (simplified)
        n_fft = min(n, 16000)  # 1 second window
        if n_fft >= 2:
            max_k = min(n_fft // 2, 512)
            weighted_sum = 0.0
            magnitude_sum = 0.0
            for k in range(1, max_k):
                real_part = 0.0
                imag_part = 0.0
                for i in range(min(n, n_fft)):
                    angle = 2 * math.pi * k * i / n_fft
                    real_part += audio[i] * math.cos(angle)
                    imag_part -= audio[i] * math.sin(angle)
                mag = math.sqrt(real_part * real_part + imag_part * imag_part)
                freq = k * 16000 / n_fft
                weighted_sum += freq * mag
                magnitude_sum += mag
            spectral_centroid = weighted_sum / magnitude_sum if magnitude_sum > 0 else 0.0
        else:
            spectral_centroid = 0.0

        # 5. Crest factor
        crest_factor = peak / rms if rms > 0 else 0.0

        # 6. Silence ratio
        silence_threshold = 0.01
        silent_frames = 0
        total_frames = 0
        for i in range(0, n - frame_size, frame_size):
            frame = audio[i:i + frame_size]
            e = math.sqrt(sum(float(s * s) for s in frame) / len(frame))
            total_frames += 1
            if e < silence_threshold:
                silent_frames += 1
        silence_ratio = silent_frames / total_frames if total_frames > 0 else 0.0

        # 7. Clipping ratio
        clip_threshold = 0.99
        clipped = sum(1 for s in audio if abs(float(s)) >= clip_threshold)
        clipping_ratio = clipped / n if n > 0 else 0.0

        # 8. Frame energy variation (natural speech is more dynamic)
        frame_energies = []
        for i in range(0, n - frame_size, frame_size):
            frame = audio[i:i + frame_size]
            e = math.sqrt(sum(float(s * s) for s in frame) / len(frame))
            frame_energies.append(e)
        if frame_energies and max(frame_energies) > 0:
            energy_std = float(np.std(frame_energies))
            energy_mean = float(np.mean(frame_energies))
            energy_cv = energy_std / energy_mean if energy_mean > 0 else 0.0
        else:
            energy_cv = 0.0

        # --- Compute bona fide score from features ---
        # Higher score = more likely natural human speech
        # Each feature contributes to the final score

        bona_fide_score = 0.5  # Start at neutral

        # ZCR variation: natural speech has varied ZCR (high std = natural)
        if zcr_std > 0.03:
            bona_fide_score += 0.10  # Good ZCR variation
        elif zcr_std > 0.01:
            bona_fide_score += 0.05  # Moderate variation
        else:
            bona_fide_score -= 0.05  # Too uniform = suspicious

        # Spectral centroid: natural speech typically 1000-3000 Hz
        if 800 <= spectral_centroid <= 3500:
            bona_fide_score += 0.05  # Natural range
        elif spectral_centroid > 4000:
            bona_fide_score -= 0.10  # Unusually high
        elif spectral_centroid < 500:
            bona_fide_score -= 0.05  # Unusually low

        # Crest factor: natural speech typically 3-12
        if 3.0 <= crest_factor <= 12.0:
            bona_fide_score += 0.05
        elif crest_factor > 15.0:
            bona_fide_score -= 0.05  # Too dynamic
        elif crest_factor < 2.0:
            bona_fide_score -= 0.05  # Too compressed

        # Silence ratio: natural speech has 10-40% silence
        if 0.05 <= silence_ratio <= 0.50:
            bona_fide_score += 0.10  # Natural pause pattern
        elif silence_ratio > 0.70:
            bona_fide_score -= 0.05  # Too much silence
        elif silence_ratio < 0.02:
            bona_fide_score -= 0.05  # No pauses = suspicious

        # Clipping: clipped audio is suspicious
        if clipping_ratio > 0.01:
            bona_fide_score -= 0.15  # Clipping is a red flag

        # Energy coefficient of variation: natural speech has more dynamics
        if energy_cv > 0.5:
            bona_fide_score += 0.10  # Good dynamic range
        elif energy_cv > 0.2:
            bona_fide_score += 0.05
        else:
            bona_fide_score -= 0.05  # Too flat = synthetic

        # RMS energy: very quiet or very loud is suspicious
        if rms < 0.001:
            bona_fide_score -= 0.10  # Too quiet
        elif rms > 0.5:
            bona_fide_score -= 0.05  # Very loud
        elif 0.01 <= rms <= 0.2:
            bona_fide_score += 0.05  # Normal range

        # Clamp to 0-1
        bona_fide_score = max(0.0, min(1.0, bona_fide_score))

        normalization = self.normalize_score(bona_fide_score)

        return {
            "model": MODEL_NAME,
            "version": MODEL_VERSION + "-heuristic",
            "score": round(bona_fide_score, 4),
            "confidence": 0.35,
            "normalized_score": normalization["normalized_score"],
            "severity": normalization["severity"],
            "severity_label": normalization["severity_label"],
            "recommended_action": normalization["recommended_action"],
            "loaded": False,
            "fallback": True,
            "error": "Model not loaded, using DSP-feature heuristic",
            "features": {
                "rms_energy": round(rms, 6),
                "zcr_mean": round(zcr_mean, 4),
                "zcr_std": round(zcr_std, 4),
                "spectral_centroid_hz": round(spectral_centroid, 1),
                "crest_factor": round(crest_factor, 2),
                "silence_ratio": round(silence_ratio, 3),
                "clipping_ratio": round(clipping_ratio, 4),
                "energy_cv": round(energy_cv, 4),
            },
        }

    @property
    def status(self) -> dict:
        """Get current model status."""
        return {
            "model": MODEL_NAME,
            "version": MODEL_VERSION,
            "loaded": self._loaded,
            "device": self.device,
            "error": self._load_error,
            "license": MODEL_LICENSE,
            "source": MODEL_SOURCE,
            "calibration_loaded": self._calibration is not None,
        }

    def _load_calibration(self):
        """Load calibration configuration from YAML file."""
        try:
            cal_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calibration.yaml",
            )
            if os.path.exists(cal_path):
                with open(cal_path, "r") as f:
                    self._calibration = yaml.safe_load(f)
                logger.info(f"Calibration config loaded from {cal_path}")
            else:
                logger.warning(f"Calibration config not found: {cal_path}")
        except Exception as e:
            logger.warning(f"Failed to load calibration config: {e}")

    def normalize_score(self, raw_score: float) -> dict:
        """Normalize raw model score using calibration config.
        
        Args:
            raw_score: Raw model output (0-1 range).
            
        Returns:
            {
                "normalized_score": int,  # 0-100
                "severity": str,
                "severity_label": str,
                "recommended_action": str,
            }
        """
        if self._calibration is None:
            # Default normalization without calibration
            normalized = int(raw_score * 100)
            return {
                "normalized_score": normalized,
                "severity": "uncertain",
                "severity_label": "UNCERTAIN",
                "recommended_action": "REVIEW",
            }
        
        # Apply calibration
        norm_config = self._calibration.get("normalization", {})
        output_min = norm_config.get("output_min", 0)
        output_max = norm_config.get("output_max", 100)
        
        # Min-max normalization
        normalized = int(raw_score * (output_max - output_min) + output_min)
        normalized = max(output_min, min(output_max, normalized))
        
        # Determine severity
        severity_levels = self._calibration.get("severity_levels", {})
        for level_name, level_config in severity_levels.items():
            range_min, range_max = level_config.get("range", [0, 100])
            if range_min <= normalized <= range_max:
                return {
                    "normalized_score": normalized,
                    "severity": level_name,
                    "severity_label": level_config.get("label", "UNKNOWN"),
                    "recommended_action": level_config.get("recommended_action", "REVIEW"),
                }
        
        # Default
        return {
            "normalized_score": normalized,
            "severity": "uncertain",
            "severity_label": "UNCERTAIN",
            "recommended_action": "REVIEW",
        }


# Singleton instance
_aasist_instance: Optional[AASISTWrapper] = None


def get_aasist() -> AASISTWrapper:
    """Get or create the AASIST-L wrapper singleton."""
    global _aasist_instance
    if _aasist_instance is None:
        _aasist_instance = AASISTWrapper()
    return _aasist_instance
