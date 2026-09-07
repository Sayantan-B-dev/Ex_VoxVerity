"""AASIST-L Model Wrapper for VoxVerity.

Runs the official AASIST-L anti-spoofing model (ONNX export from
https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L) through
onnxruntime. Input: `wav` (batch, 64600) float32 at 16 kHz → output:
`logits` (batch, 2) where class 1 = bona fide (higher = more natural).

When the ONNX model file or onnxruntime is unavailable, predict() falls back
to a DSP-feature heuristic so the pipeline keeps working (labeled
fallback=True).

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
    """Wrapper for the AASIST-L anti-spoofing model (ONNX runtime)."""

    def __init__(self):
        self.session = None
        self._loaded = False
        self._load_error: Optional[str] = None
        self._calibration: Optional[dict] = None
        self._load_calibration()

    def load(self, model_path: Optional[str] = None) -> bool:
        """Load the AASIST-L ONNX model via onnxruntime.

        Args:
            model_path: Path to the .onnx export. Defaults to
                        model_artifacts/aasist-l.onnx
        """
        if self._loaded:
            return True

        try:
            import onnxruntime as ort

            if model_path is None:
                model_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                    "model_artifacts",
                    "aasist-l.onnx",
                )

            if not os.path.exists(model_path):
                self._load_error = f"AASIST-L ONNX model not found: {model_path}"
                logger.warning(self._load_error)
                return False

            self.session = ort.InferenceSession(
                model_path,
                providers=["CPUExecutionProvider"],
            )
            self._loaded = True
            logger.info(f"AASIST-L model loaded from {model_path} (onnxruntime)")
            return True

        except ImportError as e:
            self._load_error = f"onnxruntime not installed: {e}"
            logger.warning(self._load_error)
            return False
        except Exception as e:
            self._load_error = f"Failed to load AASIST-L ONNX model: {e}"
            logger.error(self._load_error)
            return False

    def predict(self, audio: np.ndarray) -> dict:
        """Run AASIST-L inference on audio samples (16 kHz float32).

        Returns:
            {
                "model": "AASIST-L",
                "version": "v1.0",
                "score": float,          # 0-1 bona fide (higher = more natural)
                "confidence": float,     # max softmax probability
                "loaded": bool,          # whether the real model was used
                "fallback": bool,        # whether heuristic fallback was used
                "error": str | None,
            }
        """
        if not self._loaded or self.session is None:
            return self._heuristic_fallback(audio)

        try:
            x = self._prepare_audio(audio)
            logits = self.session.run(None, {"wav": x})[0]  # (1, 2)

            # Softmax → class 1 is the bona fide class.
            exp = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp / exp.sum(axis=1, keepdims=True)
            bona_fide_score = float(probs[0, 1])
            confidence = float(np.max(probs[0]))

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

    def _prepare_audio(self, audio: np.ndarray) -> "np.ndarray":
        """Pad/truncate to MODEL_WINDOW_SAMPLES and shape (1, 64600)."""
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)

        if len(audio) > MODEL_WINDOW_SAMPLES:
            audio = audio[-MODEL_WINDOW_SAMPLES:]  # most recent context
        elif len(audio) < MODEL_WINDOW_SAMPLES:
            audio = np.pad(audio, (0, MODEL_WINDOW_SAMPLES - len(audio)), mode="constant")

        return audio.reshape(1, -1)

    def _heuristic_fallback(self, audio: np.ndarray) -> dict:
        """DSP-feature heuristic when the model is not available.

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

        # 4. Spectral centroid (vectorized numpy FFT)
        n_fft = min(n, 16000)
        if n_fft >= 2:
            frame = audio[:n_fft]
            magnitude = np.abs(np.fft.rfft(frame))
            freqs = np.fft.rfftfreq(n_fft, d=1.0 / 16000)
            magnitude_sum = float(magnitude[1:].sum())
            weighted_sum = float((freqs[1:] * magnitude[1:]).sum())
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

        # 8. Frame energy variation
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
        bona_fide_score = 0.5

        if zcr_std > 0.03:
            bona_fide_score += 0.10
        elif zcr_std > 0.01:
            bona_fide_score += 0.05
        else:
            bona_fide_score -= 0.05

        if 800 <= spectral_centroid <= 3500:
            bona_fide_score += 0.05
        elif spectral_centroid > 4000:
            bona_fide_score -= 0.10
        elif spectral_centroid < 500:
            bona_fide_score -= 0.05

        if 3.0 <= crest_factor <= 12.0:
            bona_fide_score += 0.05
        elif crest_factor > 15.0:
            bona_fide_score -= 0.05
        elif crest_factor < 2.0:
            bona_fide_score -= 0.05

        if 0.05 <= silence_ratio <= 0.50:
            bona_fide_score += 0.10
        elif silence_ratio > 0.70:
            bona_fide_score -= 0.05
        elif silence_ratio < 0.02:
            bona_fide_score -= 0.05

        if clipping_ratio > 0.01:
            bona_fide_score -= 0.15

        if energy_cv > 0.5:
            bona_fide_score += 0.10
        elif energy_cv > 0.2:
            bona_fide_score += 0.05
        else:
            bona_fide_score -= 0.05

        if rms < 0.001:
            bona_fide_score -= 0.10
        elif rms > 0.5:
            bona_fide_score -= 0.05
        elif 0.01 <= rms <= 0.2:
            bona_fide_score += 0.05

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
            "runtime": "onnxruntime",
            "error": self._load_error,
            "license": MODEL_LICENSE,
            "source": MODEL_SOURCE,
            "calibration_loaded": self._calibration is not None,
        }

    def _load_calibration(self):
        """Load calibration configuration from YAML file (optional)."""
        try:
            cal_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calibration.yaml",
            )
            if os.path.exists(cal_path):
                with open(cal_path, "r") as f:
                    self._calibration = yaml.safe_load(f)
                logger.info(f"Calibration config loaded from {cal_path}")
        except Exception as e:
            logger.warning(f"Failed to load calibration config: {e}")

    def normalize_score(self, raw_score: float) -> dict:
        """Normalize raw model score (0-1) into a 0-100 display score."""
        if self._calibration is None:
            normalized = int(raw_score * 100)
            return {
                "normalized_score": normalized,
                "severity": "uncertain",
                "severity_label": "UNCERTAIN",
                "recommended_action": "REVIEW",
            }

        norm_config = self._calibration.get("normalization", {})
        output_min = norm_config.get("output_min", 0)
        output_max = norm_config.get("output_max", 100)

        normalized = int(raw_score * (output_max - output_min) + output_min)
        normalized = max(output_min, min(output_max, normalized))

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