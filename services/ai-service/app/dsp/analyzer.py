"""DSP Analysis Module for VoxVerity.

Computes acoustic metrics from raw audio data.
Phase 20: Basic metrics using Python stdlib + struct.
Phase 21+: Add Librosa/SciPy for advanced analysis.
"""

import struct
import math
from typing import Optional


def decode_wav_pcm(data: bytes) -> Optional[list[float]]:
    """Decode WAV file to mono float32 samples.

    Supports PCM (16/24/32-bit integer) and IEEE float (32-bit).
    Returns None if not a valid WAV or decode fails.
    """
    if len(data) < 44:
        return None

    # Check RIFF header
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        return None

    # Find fmt chunk first (may appear before or after other chunks)
    fmt_offset = -1
    data_offset = -1
    data_size = 0
    offset = 12

    while offset < len(data) - 8:
        chunk_id = data[offset:offset + 4]
        chunk_size = struct.unpack_from("<I", data, offset + 4)[0]

        if chunk_id == b"fmt ":
            fmt_offset = offset + 8
        elif chunk_id == b"data":
            data_offset = offset + 8
            data_size = chunk_size

        # Advance to next chunk (WAV chunks are word-aligned)
        offset += 8 + chunk_size
        if chunk_size % 2 != 0:
            offset += 1  # Padding byte

    if fmt_offset < 0 or data_offset < 0:
        return None

    # Parse fmt chunk
    try:
        audio_format = struct.unpack_from("<H", data, fmt_offset)[0]
        num_channels = struct.unpack_from("<H", data, fmt_offset + 2)[0]
        sample_rate = struct.unpack_from("<I", data, fmt_offset + 4)[0]
        bits_per_sample = struct.unpack_from("<H", data, fmt_offset + 14)[0]
    except struct.error:
        return None

    # Get actual data bytes
    data_bytes = data[data_offset:data_offset + data_size]

    if not data_bytes:
        return None

    float_samples: list[float] = []

    # audio_format: 1=PCM, 3=IEEE float
    if audio_format == 3 and bits_per_sample == 32:
        # IEEE float 32-bit
        count = len(data_bytes) // 4
        if count == 0:
            return None
        fmt_str = f"<{count}f"
        raw = struct.unpack(fmt_str, data_bytes[:count * 4])
        float_samples = list(raw)

    elif audio_format == 1:
        if bits_per_sample == 16:
            count = len(data_bytes) // 2
            if count == 0:
                return None
            raw = struct.unpack(f"<{count}h", data_bytes[:count * 2])
            float_samples = [s / 32768.0 for s in raw]

        elif bits_per_sample == 24:
            samples = []
            for i in range(0, len(data_bytes) - 2, 3):
                val = int.from_bytes(data_bytes[i:i + 3], byteorder="little", signed=True)
                samples.append(val)
            if not samples:
                return None
            float_samples = [s / 8388608.0 for s in samples]

        elif bits_per_sample == 32:
            count = len(data_bytes) // 4
            if count == 0:
                return None
            raw = struct.unpack(f"<{count}i", data_bytes[:count * 4])
            float_samples = [s / 2147483648.0 for s in raw]
        else:
            return None
    else:
        # Unknown format — try raw PCM 16-bit as last resort
        count = len(data_bytes) // 2
        if count == 0:
            return None
        raw = struct.unpack(f"<{count}h", data_bytes[:count * 2])
        float_samples = [s / 32768.0 for s in raw]

    if not float_samples:
        return None

    # Mix to mono if stereo
    if num_channels == 2:
        float_samples = [(float_samples[i] + float_samples[i + 1]) / 2 for i in range(0, len(float_samples), 2)]
    elif num_channels > 2:
        mono = []
        for i in range(0, len(float_samples), num_channels):
            mono.append(sum(float_samples[i:i + num_channels]) / num_channels)
        float_samples = mono

    return float_samples


def compute_metrics(samples: list[float], sample_rate: int = 16000) -> dict:
    """Compute DSP metrics from mono float32 samples."""
    if not samples:
        return _empty_metrics()

    n = len(samples)

    # RMS Energy
    rms = math.sqrt(sum(s * s for s in samples) / n) if n > 0 else 0
    dbfs = 20 * math.log10(rms) if rms > 0 else -100

    # Peak amplitude
    peak = max(abs(s) for s in samples)

    # Clipping ratio
    clip_threshold = 0.99
    clipped = sum(1 for s in samples if abs(s) >= clip_threshold)
    clipping_ratio = clipped / n if n > 0 else 0

    # Zero crossing rate (frame-based)
    frame_size = max(1, sample_rate // 100)  # 10ms frames
    zcr_counts = []
    for i in range(0, n - frame_size, frame_size):
        frame = samples[i:i + frame_size]
        crossings = sum(1 for j in range(1, len(frame)) if (frame[j] >= 0) != (frame[j - 1] >= 0))
        zcr_counts.append(crossings / frame_size)
    zcr = sum(zcr_counts) / len(zcr_counts) if zcr_counts else 0

    # Silence ratio (energy below threshold)
    silence_threshold = 0.01
    frame_energy = []
    for i in range(0, n - frame_size, frame_size):
        frame = samples[i:i + frame_size]
        e = math.sqrt(sum(s * s for s in frame) / len(frame))
        frame_energy.append(e)
    silent_frames = sum(1 for e in frame_energy if e < silence_threshold)
    silence_ratio = silent_frames / len(frame_energy) if frame_energy else 0

    # Spectral centroid (simplified FFT-based)
    spectral_centroid = _spectral_centroid(samples, sample_rate)

    # Crest factor
    crest_factor = peak / rms if rms > 0 else 0

    # Dynamic range
    if frame_energy:
        loud_frames = sorted(frame_energy)
        p95 = loud_frames[int(len(loud_frames) * 0.95)] if len(loud_frames) > 5 else max(loud_frames)
        p05 = loud_frames[max(0, int(len(loud_frames) * 0.05))] if len(loud_frames) > 5 else min(loud_frames)
        dynamic_range = 20 * math.log10(p95 / p05) if p05 > 0 else 0
    else:
        dynamic_range = 0

    # Duration
    duration_s = n / sample_rate

    return {
        "duration_s": round(duration_s, 2),
        "sample_count": n,
        "sample_rate": sample_rate,
        "rms_energy": round(rms, 6),
        "dbfs": round(dbfs, 1),
        "peak_amplitude": round(peak, 4),
        "clipping_ratio": round(clipping_ratio, 4),
        "zero_crossing_rate": round(zcr, 4),
        "silence_ratio": round(silence_ratio, 3),
        "spectral_centroid_hz": round(spectral_centroid, 1),
        "crest_factor": round(crest_factor, 2),
        "dynamic_range_db": round(dynamic_range, 1),
    }


def _spectral_centroid(samples: list[float], sample_rate: int) -> float:
    """Simplified spectral centroid using DFT magnitude."""
    n = min(len(samples), sample_rate)  # Analyze up to 1 second
    if n < 2:
        return 0.0

    # Simple DFT for first N harmonics
    max_k = min(n // 2, 512)
    weighted_sum = 0.0
    magnitude_sum = 0.0

    for k in range(1, max_k):
        real = 0.0
        imag = 0.0
        for i in range(n):
            angle = 2 * math.pi * k * i / n
            real += samples[i] * math.cos(angle)
            imag -= samples[i] * math.sin(angle)
        mag = math.sqrt(real * real + imag * imag)
        freq = k * sample_rate / n
        weighted_sum += freq * mag
        magnitude_sum += mag

    return weighted_sum / magnitude_sum if magnitude_sum > 0 else 0.0


def _empty_metrics() -> dict:
    return {
        "duration_s": 0, "sample_count": 0, "sample_rate": 16000,
        "rms_energy": 0, "dbfs": -100, "peak_amplitude": 0,
        "clipping_ratio": 0, "zero_crossing_rate": 0, "silence_ratio": 1,
        "spectral_centroid_hz": 0, "crest_factor": 0, "dynamic_range_db": 0,
    }


def quality_flags(metrics: dict) -> dict:
    """Generate quality/confidence flags from metrics."""
    flags = {}
    flags["clipping_detected"] = metrics["clipping_ratio"] > 0.01
    flags["silence_detected"] = metrics["silence_ratio"] > 0.8
    flags["low_energy"] = metrics["dbfs"] < -40
    flags["very_short"] = metrics["duration_s"] < 0.5
    flags["decode_ok"] = metrics["sample_count"] > 0
    return flags
